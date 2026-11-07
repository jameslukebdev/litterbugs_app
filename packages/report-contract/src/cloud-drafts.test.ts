import { describe, expect, it, vi, afterEach } from 'vitest';
import { createCloudDraftSync, DraftConflictError, type CloudDraft, type DraftWrite } from './cloud-drafts';

type Draft = { text: string; photos: string[] };
function fixture() {
  const remote = new Map<string, CloudDraft>(); const published = new Set<string>(); let sequence=0; let offline=false; let loseResponse=false;
  const write = vi.fn(async (op: DraftWrite) => {
    if(offline) throw Error('offline');
    const key=`${op.target_user_id}:${op.target_key}`;
    const old=remote.get(key);
    if(old?.mutation_id===op.operation_id) return structuredClone(old);
    if((old?.revision??0)!==op.expected_revision) throw Error('draft_conflict');
    if(old?.state==='submitting'&&op.action==='save') throw Error('draft_submission_pending');
    const row:CloudDraft={user_id:op.target_user_id,draft_key:op.target_key,revision:(old?.revision??0)+1,mutation_id:op.operation_id,request_hash:null,payload:op.action==='save'?op.draft_payload:op.action==='delete'?null:old!.payload,photo_paths:op.action==='save'?op.draft_photos:op.action==='delete'?[]:old!.photo_paths,submission_id:old&&old.state!=='deleted'?old.submission_id:`submission-${++sequence}`,state:op.action==='save'?'editing':op.action==='delete'?'deleted':'submitting',updated_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()};
    remote.set(key,row);
    if(loseResponse){loseResponse=false;throw Error('response lost');}
    return structuredClone(row);
  });
  function device() {
    const local=new Map<string,Draft>(); const meta=new Map<string,string>(); const journals=new Map<string,string>();
    const sync=createCloudDraftSync<Draft>({
      readLocal:async(o,k)=>local.get(`${o}:${k}`),writeLocal:async(o,k,d)=>{local.set(`${o}:${k}`,d);},clearLocal:async(o,k)=>{local.delete(`${o}:${k}`);journals.delete(`${o}:${k}`);},
      readMeta:async(o,k)=>meta.get(`${o}:${k}`)??null,writeMeta:async(o,k,m)=>{meta.set(`${o}:${k}`,m);},
      localSubmissionId:async(o,k)=>journals.get(`${o}:${k}`),
      isSubmitted:async(o,k,id)=>{if(offline)throw Error('offline');return published.has(`${o}:${k}:${id}`);},
      fingerprint:async d=>JSON.stringify(d),id:()=>`operation-${++sequence}`,
      upload:async(o,_k,d)=>{if(offline)throw Error('offline');return {payload:d,paths:d.photos.map(p=>`${o}/${p}`)};},
      download:async(_o,_k,r)=>r.payload as Draft,
      loadRemote:async(o,k)=>{if(offline)throw Error('offline');return structuredClone(remote.get(`${o}:${k}`)??null);},writeRemote:write,
    });
    return {sync,local,meta,journals,edit:(text:string,owner='alice',key='report')=>local.set(`${owner}:${key}`,{text,photos:['photo.jpg']})};
  }
  return {device,remote,write,publish:(owner:string,key:string,id:string)=>published.add(`${owner}:${key}:${id}`),setOffline:(v:boolean)=>{offline=v;},loseNextResponse:()=>{loseResponse=true;}};
}
afterEach(()=>vi.useRealTimers());
describe('account draft continuity',()=>{
  it('checks an unchanged draft with the server and rejects expired account copies',async()=>{
    const f=fixture(),a=f.device();a.edit('Keep this');await a.sync.save('alice','report');
    expect(a.sync.confirmation('alice','report')?.expiresAt).toBe(f.remote.get('alice:report')?.expires_at);
    f.remote.get('alice:report')!.expires_at=new Date(Date.now()-1).toISOString();
    await expect(a.sync.save('alice','report')).rejects.toBeInstanceOf(DraftConflictError);
    expect(a.sync.status('alice','report')).toBe('conflict');
    expect(a.local.get('alice:report')?.text).toBe('Keep this');
    expect(f.write).toHaveBeenCalledTimes(1);
    await a.sync.resolve('alice','report','device');
    expect(a.sync.status('alice','report')).toBe('synced');
  });
  it('does not confirm unchanged work offline or after another device changes or discards it',async()=>{
    const f=fixture(),a=f.device(),b=f.device();a.edit('Original');await a.sync.save('alice','report');
    f.setOffline(true);await expect(a.sync.save('alice','report')).rejects.toThrow('offline');
    expect(a.sync.confirmation('alice','report')).toBeUndefined();
    f.setOffline(false);await b.sync.load('alice','report');b.edit('Changed elsewhere');await b.sync.save('alice','report');
    await expect(a.sync.save('alice','report')).rejects.toBeInstanceOf(DraftConflictError);
    await a.sync.resolve('alice','report','account');await b.sync.discard('alice','report');
    await expect(a.sync.save('alice','report')).rejects.toBeInstanceOf(DraftConflictError);
    expect(f.remote.get('alice:report')?.payload).toBeNull();
  });
  it('restores the same fields and private photo references on another device',async()=>{
    const f=fixture(),a=f.device(),b=f.device();a.edit('Bottles');await a.sync.save('alice','report');
    expect(await b.sync.load('alice','report')).toEqual({text:'Bottles',photos:['photo.jpg']});
    expect(f.remote.get('alice:report')?.photo_paths).toEqual(['alice/photo.jpg']);
    expect(b.sync.status('alice','report')).toBe('synced');
  });
  it('keeps offline edits and retries a committed save with the same operation',async()=>{
    const f=fixture(),a=f.device();a.edit('Offline draft');f.setOffline(true);
    await expect(a.sync.save('alice','report')).rejects.toThrow('offline');
    expect(await a.sync.load('alice','report')).toMatchObject({text:'Offline draft'});
    f.setOffline(false);f.loseNextResponse();await expect(a.sync.save('alice','report')).rejects.toThrow('response lost');
    await a.sync.save('alice','report');
    expect(f.remote.get('alice:report')?.revision).toBe(1);
    expect(f.write.mock.calls.at(-1)?.[0].operation_id).toBe(f.write.mock.calls.at(-2)?.[0].operation_id);
  });
  it('requires an explicit choice when two devices have changed the same draft',async()=>{
    const f=fixture(),a=f.device(),b=f.device();a.edit('Original');await a.sync.save('alice','report');await b.sync.load('alice','report');
    a.edit('Phone');await a.sync.save('alice','report');b.edit('Computer');
    await expect(b.sync.save('alice','report')).rejects.toBeInstanceOf(DraftConflictError);
    expect(f.remote.get('alice:report')?.payload).toMatchObject({text:'Phone'});
    expect(await b.sync.resolve('alice','report','account')).toMatchObject({text:'Phone'});
  });
  it('allows explicitly keeping local work against the current revision',async()=>{
    const f=fixture(),a=f.device(),b=f.device();a.edit('Phone');await a.sync.save('alice','report');b.edit('Computer');
    await b.sync.load('alice','report');expect(b.sync.status('alice','report')).toBe('conflict');
    await b.sync.resolve('alice','report','device');expect(f.remote.get('alice:report')?.payload).toMatchObject({text:'Computer'});
  });
  it('does not resurrect discarded work from a stale device, even if locally edited',async()=>{
    const f=fixture(),a=f.device(),b=f.device();a.edit('Original');await a.sync.save('alice','report');await b.sync.load('alice','report');
    await a.sync.discard('alice','report');b.edit('Offline changes');await b.sync.load('alice','report');
    expect(b.sync.status('alice','report')).toBe('conflict');
    await expect(b.sync.save('alice','report')).rejects.toBeInstanceOf(DraftConflictError);
    expect(f.remote.get('alice:report')?.payload).toBeNull();
  });
  it('uses one submission ID after a lost response and a second device handoff',async()=>{
    const f=fixture(),a=f.device(),b=f.device();a.edit('Ready');await a.sync.save('alice','report');
    f.loseNextResponse();await expect(a.sync.begin('alice','report')).rejects.toThrow('response lost');
    const id=await a.sync.begin('alice','report');await b.sync.load('alice','report');
    expect(await b.sync.begin('alice','report')).toBe(id);
    expect(f.remote.get('alice:report')?.revision).toBe(2);
    b.edit('Changed');await expect(b.sync.begin('alice','report')).rejects.toBeInstanceOf(DraftConflictError);
  });
  it('serializes discard after an outstanding save and cancels scheduled autosaves',async()=>{
    vi.useFakeTimers();const f=fixture(),a=f.device();a.edit('Ready');a.sync.schedule('alice','report');
    await a.sync.save('alice','report');await a.sync.discard('alice','report');await vi.advanceTimersByTimeAsync(2000);
    expect(a.local.size).toBe(0);expect(f.remote.get('alice:report')?.payload).toBeNull();
  });
  it('retains correction evidence while resetting the submission identity',async()=>{
    const f=fixture(),a=f.device(),key='cleanup:attempt';a.edit('Keep evidence','alice',key);
    const original=await a.sync.save('alice',key);
    await a.sync.discard('alice',key,{preserveLocal:true});
    expect(a.local.get(`alice:${key}`)).toEqual({text:'Keep evidence',photos:['photo.jpg']});
    expect(a.sync.confirmation('alice',key)).toBeUndefined();
    const corrected=await a.sync.save('alice',key);
    expect(corrected?.submission_id).not.toBe(original?.submission_id);
    expect(corrected?.photo_paths).toEqual(['alice/photo.jpg']);
  });
  it('keeps correction evidence when a reset response is lost and retried',async()=>{
    const f=fixture(),a=f.device(),key='cleanup:attempt';a.edit('Keep evidence','alice',key);
    await a.sync.save('alice',key);f.loseNextResponse();
    await expect(a.sync.discard('alice',key,{preserveLocal:true})).rejects.toThrow('response lost');
    expect(a.local.get(`alice:${key}`)?.photos).toEqual(['photo.jpg']);
    await a.sync.discard('alice',key,{preserveLocal:true});
    expect(a.sync.status('alice',key)).toBe('local');
    expect(a.sync.confirmation('alice',key)).toBeUndefined();
    expect((await a.sync.save('alice',key))?.payload).toMatchObject({text:'Keep evidence'});
  });
  it('does not overwrite another device when preserving local correction evidence',async()=>{
    const f=fixture(),a=f.device(),b=f.device(),key='cleanup:attempt';
    a.edit('Original','alice',key);await a.sync.save('alice',key);await b.sync.load('alice',key);
    b.edit('Newer account correction','alice',key);await b.sync.save('alice',key);
    await expect(a.sync.discard('alice',key,{preserveLocal:true})).rejects.toBeInstanceOf(DraftConflictError);
    expect(a.local.get(`alice:${key}`)?.photos).toEqual(['photo.jpg']);
    expect(f.remote.get(`alice:${key}`)?.payload).toMatchObject({text:'Newer account correction'});
  });
  it('isolates accounts and retires queued sync after account deletion',async()=>{
    vi.useFakeTimers();const f=fixture(),a=f.device();a.edit('Alice');a.edit('Bob','bob');a.sync.schedule('alice','report');
    await a.sync.retire('alice');await vi.advanceTimersByTimeAsync(2000);
    await expect(a.sync.save('alice','report')).rejects.toThrow('deleted');await a.sync.save('bob','report');
    expect(f.remote.has('alice:report')).toBe(false);expect(f.remote.get('bob:report')?.payload).toMatchObject({text:'Bob'});
  });
  it('does not replace a local submission checkpoint when the cloud revision is unchanged',async()=>{
    const f=fixture(),a=f.device();a.edit('Ready');await a.sync.save('alice','report');const local=a.local.get('alice:report');
    expect(await a.sync.load('alice','report')).toBe(local);
  });
});


describe('completed report recovery on another browser',()=>{
  it('retires a published submission after the publish response or cleanup was lost',async()=>{
    const f=fixture(),phone=f.device();phone.edit('Beacon Heights');
    const id=await phone.sync.begin('alice','report');
    phone.journals.set('alice:report',id);f.publish('alice','report',id);
    expect(await phone.sync.load('alice','report')).toBeUndefined();
    expect(phone.local.size).toBe(0);expect(phone.journals.size).toBe(0);
    expect(f.remote.get('alice:report')?.state).toBe('deleted');
    expect(phone.sync.status('alice','report')).toBe('unsaved');
    phone.edit('A new litter spot');
    expect(await phone.sync.begin('alice','report')).not.toBe(id);
  });
  it('clears an unchanged phone copy after another device published and deleted the draft',async()=>{
    const f=fixture(),phone=f.device(),computer=f.device();phone.edit('Beacon Heights');
    const id=await phone.sync.begin('alice','report');await computer.sync.load('alice','report');
    f.publish('alice','report',id);await computer.sync.discard('alice','report');
    expect(await phone.sync.load('alice','report')).toBeUndefined();
    expect(phone.sync.status('alice','report')).toBe('unsaved');
  });
  it('inspects a completed saved location without replacing or deleting an editor copy',async()=>{
    const f=fixture(),phone=f.device();phone.edit('Beacon Heights');
    const id=await phone.sync.begin('alice','report');f.publish('alice','report',id);
    const writes=f.write.mock.calls.length;
    expect(await phone.sync.isLocalSubmitted('alice','report')).toBe(true);
    expect(phone.local.get('alice:report')?.text).toBe('Beacon Heights');
    expect(f.write.mock.calls.length).toBe(writes);
    phone.edit('Unsent changes');
    expect(await phone.sync.isLocalSubmitted('alice','report')).toBe(false);
  });
  it('keeps the device recovery copy if a newer account revision wins the cleanup race',async()=>{
    const f=fixture(),phone=f.device();phone.edit('Beacon Heights');
    const id=await phone.sync.begin('alice','report');f.publish('alice','report',id);
    const write=f.write.getMockImplementation()!;
    f.write.mockImplementationOnce(async op=>{
      const current=f.remote.get('alice:report')!;
      current.revision++;current.submission_id='new-id';current.state='editing';
      current.payload={text:'New account work',photos:['new.jpg']};
      return write(op);
    });
    expect(await phone.sync.load('alice','report')).toMatchObject({text:'Beacon Heights'});
    expect(phone.sync.status('alice','report')).toBe('conflict');
    expect(f.remote.get('alice:report')?.payload).toMatchObject({text:'New account work'});
    expect(await phone.sync.load('alice','report')).toMatchObject({text:'New account work'});
  });
  it('restores a newer account draft while retiring the completed phone copy',async()=>{
    const f=fixture(),phone=f.device(),computer=f.device();phone.edit('Beacon Heights');
    const id=await phone.sync.begin('alice','report');await computer.sync.load('alice','report');
    f.publish('alice','report',id);await computer.sync.discard('alice','report');
    computer.edit('New report');const next=await computer.sync.save('alice','report');
    expect(await phone.sync.load('alice','report')).toMatchObject({text:'New report'});
    expect(f.remote.get('alice:report')?.submission_id).toBe(next?.submission_id);
    expect(f.remote.get('alice:report')?.state).toBe('editing');
  });
  it('checks a legacy local publication journal without cloud metadata',async()=>{
    const f=fixture(),phone=f.device();phone.edit('Beacon Heights');
    phone.journals.set('alice:report','legacy-id');f.publish('alice','report','legacy-id');
    expect(await phone.sync.load('alice','report')).toBeUndefined();
    expect(phone.journals.size).toBe(0);expect(f.write).not.toHaveBeenCalled();
  });
  it('clears a completed journal even if its draft bytes are already gone',async()=>{
    const f=fixture(),phone=f.device();phone.journals.set('alice:report','legacy-id');
    f.publish('alice','report','legacy-id');
    expect(await phone.sync.load('alice','report')).toBeUndefined();
    expect(phone.journals.size).toBe(0);
  });
  it('removes an orphaned published account draft on a fresh browser without restoring photos',async()=>{
    const f=fixture(),phone=f.device(),fresh=f.device();phone.edit('Beacon Heights');
    const id=await phone.sync.begin('alice','report');f.publish('alice','report',id);
    expect(await fresh.sync.load('alice','report')).toBeUndefined();
    expect(fresh.local.size).toBe(0);expect(f.remote.get('alice:report')?.payload).toBeNull();
  });
  it('preserves unsent offline edits even when the previous account version was published',async()=>{
    const f=fixture(),phone=f.device(),computer=f.device();phone.edit('Original');
    await phone.sync.save('alice','report');await computer.sync.load('alice','report');
    const id=await computer.sync.begin('alice','report');f.publish('alice','report',id);
    phone.edit('Unsent new details');
    expect(await phone.sync.load('alice','report')).toMatchObject({text:'Unsent new details'});
    expect(phone.sync.status('alice','report')).toBe('conflict');
  });
  it('keeps recovery while publication is unconfirmed or the phone is offline',async()=>{
    const f=fixture(),phone=f.device();phone.edit('Beacon Heights');
    const id=await phone.sync.begin('alice','report');phone.journals.set('alice:report',id);
    expect(await phone.sync.load('alice','report')).toMatchObject({text:'Beacon Heights'});
    expect(phone.sync.status('alice','report')).toBe('submitting');
    f.publish('alice','report',id);f.setOffline(true);
    expect(await phone.sync.load('alice','report')).toMatchObject({text:'Beacon Heights'});
    expect(phone.journals.get('alice:report')).toBe(id);
    f.setOffline(false);expect(await phone.sync.load('alice','report')).toBeUndefined();
  });
  it('does not replay a stale pending mutation after confirmed publication',async()=>{
    const f=fixture(),phone=f.device();phone.edit('Beacon Heights');
    f.loseNextResponse();await expect(phone.sync.begin('alice','report')).rejects.toThrow('response lost');
    const record=f.remote.get('alice:report')!;
    phone.journals.set('alice:report',record.submission_id);f.publish('alice','report',record.submission_id);
    const writes=f.write.mock.calls.length;
    expect(await phone.sync.load('alice','report')).toBeUndefined();
    expect(f.write.mock.calls.slice(writes).map(([op])=>op.action)).toEqual(['delete']);
  });
});
