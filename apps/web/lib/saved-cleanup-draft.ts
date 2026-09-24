export type CleanupDraft = { photos: File[]; description: string; bagsOrItems: string; weightPounds: string };
let queue: Promise<unknown> = Promise.resolve();
function transact<T>(operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const work = queue.catch(() => undefined).then(() => new Promise<T>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Draft storage unavailable'));
    let blocked = false;
    const request = indexedDB.open('litterbugs-cleanup-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('Close other Litterbugs tabs and retry')); };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      try {
      db.onversionchange = () => db.close();
      const tx = db.transaction('drafts', 'readwrite');
      const result = operation(tx.objectStore('drafts'));
      tx.oncomplete = () => { db.close(); resolve(result.result); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
      } catch (error) { db.close(); reject(error); }
    };
  }));
  queue = work; return work;
}
const key = (userId: string, attemptId: string) => `${userId}:${attemptId}`;
export const saveCleanupDraft = (userId: string, attemptId: string, draft: CleanupDraft) => transact(store => store.put(draft, key(userId, attemptId)));
export async function loadCleanupDraft(userId: string, attemptId: string) {
  const value = await transact<CleanupDraft | undefined>(store => store.get(key(userId, attemptId)));
  if (value && (!Array.isArray(value.photos) || value.photos.length > 3 || !value.photos.every(file => file instanceof File) || ![value.description, value.bagsOrItems, value.weightPounds].every(item => typeof item === 'string'))) throw new Error('Saved cleanup could not be read');
  return value;
}
export const clearCleanupDraft = (userId: string, attemptId: string) => transact(store => store.delete(key(userId, attemptId)));
export const clearAccountCleanupDrafts = (userId: string) => transact(store => store.delete(IDBKeyRange.bound(`${userId}:`, `${userId}:\uffff`)));
