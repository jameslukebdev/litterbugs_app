import type { Json } from './database.types';
export type CloudDraft = {
  user_id: string; draft_key: string; revision: number; mutation_id: string | null; request_hash: string | null;
  payload: Json | null; photo_paths: string[]; submission_id: string; state: 'editing' | 'submitting' | 'deleted'; updated_at: string; expires_at: string;
};
export type DraftWrite = { target_user_id: string; target_key: string; expected_revision: number; operation_id: string; action: 'save' | 'delete' | 'submit'; draft_payload: Json | null; draft_photos: string[] };
type Meta = { revision?: number; fingerprint?: string; pending?: DraftWrite; pendingFingerprint?: string; record?: CloudDraft };
export type DraftSyncStatus = 'unsaved' | 'local' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'submitting';
export class DraftConflictError extends Error { constructor() { super('This draft changed on another device. Choose which draft to keep before continuing.'); } }

/** Local saves remain immediate. Cloud writes are serialized per account/slot,
 * checkpointed before dispatch, and always guarded by a server revision. */
export function createCloudDraftSync<D>(adapter: {
  readLocal: (owner: string, key: string) => Promise<D | null | undefined>;
  clearLocal: (owner: string, key: string) => Promise<unknown>;
  writeLocal: (owner: string, key: string, value: D) => Promise<unknown>;
  readMeta: (owner: string, key: string) => Promise<string | null>;
  writeMeta: (owner: string, key: string, value: string) => Promise<void>;
  fingerprint: (value: D) => Promise<string>;
  upload: (owner: string, key: string, value: D) => Promise<{ payload: Json; paths: string[] }>;
  download: (owner: string, key: string, record: CloudDraft) => Promise<D>;
  loadRemote: (owner: string, key: string) => Promise<CloudDraft | null>;
  writeRemote: (operation: DraftWrite) => Promise<CloudDraft>;
  id: () => string;
}) {
  const queues = new Map<string, Promise<unknown>>();
  const retired = new Set<string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const listeners = new Set<(owner: string, key: string, status: DraftSyncStatus) => void>();
  const statuses = new Map<string, DraftSyncStatus>();
  const identity = (owner: string, key: string) => `${owner}:${key}`;
  const status = (owner: string, key: string, value: DraftSyncStatus) => { statuses.set(identity(owner,key),value); for (const listener of listeners) listener(owner,key,value); };
  const meta = async (owner: string, key: string): Promise<Meta> => JSON.parse(await adapter.readMeta(owner,key) ?? '{}');
  const persist = (owner: string, key: string, value: Meta) => adapter.writeMeta(owner,key,JSON.stringify(value));
  function serialize<T>(owner: string, key: string, work: () => Promise<T>) {
    if (retired.has(owner)) return Promise.reject(new Error('This account was deleted.'));
    const id=identity(owner,key); const next=(queues.get(id)??Promise.resolve()).catch(()=>{}).then(work);
    queues.set(id,next); return next;
  }
  function failed(owner: string,key: string,error: unknown): never {
    const message=error instanceof Error ? error.message : String((error as {message?:string})?.message ?? error);
    if (/draft_conflict|draft_submission_pending|another device/.test(message)) { status(owner,key,'conflict'); throw new DraftConflictError(); }
    status(owner,key,'offline'); throw error;
  }
  async function dispatch(owner: string,key: string,m: Meta) {
    if (!m.pending) return m.record;
    const record=await adapter.writeRemote(m.pending);
    m.revision=record.revision; m.record=record; m.fingerprint=m.pendingFingerprint;
    delete m.pending; delete m.pendingFingerprint; await persist(owner,key,m);
    return record;
  }
  async function bounded<T>(operation: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Draft photo transfer timed out. Retry when connected.')),35000);})]); }
    finally { clearTimeout(timer); }
  }
  async function save(owner: string,key: string) {
    status(owner,key,'syncing');
    try {
      const m=await meta(owner,key); await dispatch(owner,key,m);
      const local=await adapter.readLocal(owner,key); if (!local) { status(owner,key,'unsaved'); return m.record; }
      const fingerprint=await adapter.fingerprint(local);
      if (m.revision===undefined) {
        const remote=await adapter.loadRemote(owner,key);
        if (remote?.payload) throw new DraftConflictError();
        m.revision=remote?.revision??0;
      }
      if (fingerprint===m.fingerprint && m.record?.payload) { status(owner,key,m.record.state==='submitting'?'submitting':'synced'); return m.record; }
      const uploaded=await bounded(adapter.upload(owner,key,local));
      m.pending={target_user_id:owner,target_key:key,expected_revision:m.revision,operation_id:adapter.id(),action:'save',draft_payload:uploaded.payload,draft_photos:uploaded.paths};
      m.pendingFingerprint=fingerprint; await persist(owner,key,m);
      const record=await dispatch(owner,key,m); status(owner,key,'synced'); return record;
    } catch(error) { return failed(owner,key,error); }
  }
  const api = {
    isRetired: (owner: string) => retired.has(owner),
    retire: async (owner: string) => {
      retired.add(owner);
      for(const [id,timer] of timers) if(id.startsWith(`${owner}:`)) {clearTimeout(timer);timers.delete(id);}
      await Promise.allSettled([...queues].filter(([id])=>id.startsWith(`${owner}:`)).map(([,work])=>work));
    },
    subscribe: (listener: (owner: string,key: string,status: DraftSyncStatus)=>void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    status: (owner: string,key: string): DraftSyncStatus => statuses.get(identity(owner,key))??'unsaved',
    schedule(owner: string,key: string) {
      if(retired.has(owner)) return;
      const id=identity(owner,key); clearTimeout(timers.get(id));
      if(statuses.get(id)==='conflict' || statuses.get(id)==='submitting') return;
      status(owner,key,'local');
      timers.set(id,setTimeout(()=>{ timers.delete(id); void api.save(owner,key).catch(()=>{}); },1500));
    },
    save: (owner: string,key: string) => serialize(owner,key,()=>save(owner,key)),
    load: (owner: string,key: string) => serialize(owner,key,async()=>{
      const local=await adapter.readLocal(owner,key);
      try {
        const m=await meta(owner,key); await dispatch(owner,key,m);
        const remote=await adapter.loadRemote(owner,key);
        const fingerprint=local ? await adapter.fingerprint(local) : undefined;
        if (local && fingerprint!==m.fingerprint) {
          if (remote && remote.revision!==m.revision && (m.revision!==undefined || remote.payload)) { status(owner,key,'conflict'); return local; }
          m.revision=remote?.revision??0; m.record=remote??undefined; await persist(owner,key,m); status(owner,key,'local'); return local;
        }
        if (local && remote?.payload && remote.revision===m.revision && fingerprint===m.fingerprint && Date.parse(remote.expires_at)>Date.now()) {
          status(owner,key,remote.state==='submitting'?'submitting':'synced'); return local;
        }
        if (remote?.payload && Date.parse(remote.expires_at)>Date.now()) {
          const restored=await bounded(adapter.download(owner,key,remote));
          await adapter.writeLocal(owner,key,restored);
          await persist(owner,key,{revision:remote.revision,record:remote,fingerprint:await adapter.fingerprint(restored)});
          status(owner,key,remote.state==='submitting'?'submitting':'synced'); return restored;
        }
        // Preserve a local recovery copy after remote discard/expiry, but never
        // upload it silently. The user can explicitly keep it as a new draft.
        if (local && m.revision!==undefined && remote?.revision!==m.revision) { status(owner,key,'conflict'); return local; }
        await persist(owner,key,{revision:remote?.revision??0,record:remote??undefined}); status(owner,key,local?'local':'unsaved'); return local;
      } catch(error) {
        status(owner,key,error instanceof DraftConflictError || /draft_conflict/.test(String((error as {message?:string})?.message)) ? 'conflict' : local ? 'offline' : 'unsaved'); return local;
      }
    }),
    resolve: (owner: string,key: string,choice:'device'|'account')=>serialize(owner,key,async()=>{
      const remote=await adapter.loadRemote(owner,key);
      if(choice==='account') {
        if(!remote?.payload || Date.parse(remote.expires_at)<=Date.now()) throw new Error('There is no current account draft to restore.');
        const restored=await bounded(adapter.download(owner,key,remote)); await adapter.writeLocal(owner,key,restored);
        await persist(owner,key,{revision:remote.revision,record:remote,fingerprint:await adapter.fingerprint(restored)});
        status(owner,key,remote.state==='submitting'?'submitting':'synced'); return restored;
      }
      if(remote?.state==='submitting') throw new Error('The account draft is being submitted. Restore it to check the original submission.');
      await persist(owner,key,{revision:remote?.revision??0}); await save(owner,key); return adapter.readLocal(owner,key);
    }),
    begin: (owner: string,key: string)=>serialize(owner,key,async()=>{
      const record=await save(owner,key);
      if(!record?.payload) throw new Error('Save the draft before submitting.');
      if(record.state==='submitting') return record.submission_id;
      const m=await meta(owner,key);
      m.pending={target_user_id:owner,target_key:key,expected_revision:record.revision,operation_id:adapter.id(),action:'submit',draft_payload:null,draft_photos:[]};
      m.pendingFingerprint=m.fingerprint; await persist(owner,key,m);
      try { const locked=await dispatch(owner,key,m); status(owner,key,'submitting'); return locked!.submission_id; }
      catch(error) { return failed(owner,key,error); }
    }),
    discard: (owner: string,key: string)=>serialize(owner,key,async()=>{
      clearTimeout(timers.get(identity(owner,key))); timers.delete(identity(owner,key));
      try {
        const m=await meta(owner,key); await dispatch(owner,key,m);
        const remote=await adapter.loadRemote(owner,key);
        if(!remote?.payload) { await persist(owner,key,{revision:remote?.revision??0}); await adapter.clearLocal(owner,key); return; }
        if(m.revision!==remote.revision) throw new DraftConflictError();
        m.pending={target_user_id:owner,target_key:key,expected_revision:remote.revision,operation_id:adapter.id(),action:'delete',draft_payload:null,draft_photos:[]};
        await persist(owner,key,m); await dispatch(owner,key,m); await adapter.clearLocal(owner,key); status(owner,key,'local');
      } catch(error) { return failed(owner,key,error); }
    }),
  };
  return api;
}
