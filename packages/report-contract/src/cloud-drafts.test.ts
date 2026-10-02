import { describe, expect, it, vi, afterEach } from 'vitest';
import { createCloudDraftSync, DraftConflictError, type CloudDraft, type DraftWrite } from './cloud-drafts';

type Draft = { text: string; photos: string[] };
function fixture() {
  const remote = new Map<string, CloudDraft>(); let sequence=0; let offline=false; let loseResponse=false;
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
    const local=new Map<string,Draft>(); const meta=new Map<string,string>();
    const sync=createCloudDraftSync<Draft>({
      readLocal:async(o,k)=>local.get(`${o}:${k}`),writeLocal:async(o,k,d)=>{local.set(`${o}:${k}`,d);},clearLocal:async(o,k)=>{local.delete(`${o}:${k}`);},
      readMeta:async(o,k)=>meta.get(`${o}:${k}`)??null,writeMeta:async(o,k,m)=>{meta.set(`${o}:${k}`,m);},
      fingerprint:async d=>JSON.stringify(d),id:()=>`operation-${++sequence}`,
      upload:async(o,_k,d)=>{if(offline)throw Error('offline');return {payload:d,paths:d.photos.map(p=>`${o}/${p}`)};},
      download:async(_o,_k,r)=>r.payload as Draft,
      loadRemote:async(o,k)=>{if(offline)throw Error('offline');return structuredClone(remote.get(`${o}:${k}`)??null);},writeRemote:write,
    });
    return {sync,local,meta,edit:(text:string,owner='alice',key='report')=>local.set(`${owner}:${key}`,{text,photos:['photo.jpg']})};
  }
  return {device,remote,write,setOffline:(v:boolean)=>{offline=v;},loseNextResponse:()=>{loseResponse=true;}};
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
