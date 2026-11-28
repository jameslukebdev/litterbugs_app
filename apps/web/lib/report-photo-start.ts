'use client';

// Separate from account drafts: selecting a homepage photo never replaces saved work.
const KEY = 'litterbugs.photo-start';
async function access<T>(run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('litterbugs-photo-start', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('photos');
    let blocked = false;
    open.onblocked = () => { blocked = true; reject(new Error('Close other Litterbugs tabs and try again.')); };
    open.onerror = () => reject(new Error('Your photo could not be saved on this browser.'));
    open.onsuccess = () => {
      const db = open.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => db.close();
      const tx = db.transaction('photos', 'readwrite');
      const request = run(tx.objectStore('photos'));
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onerror = tx.onabort = () => { db.close(); reject(new Error('Your photo could not be saved on this browser.')); };
    };
  });
}
export async function saveReportStartPhoto(photo: File) {
  const id = sessionStorage.getItem(KEY) || crypto.randomUUID();
  await access(store => store.put({ photo, expires: Date.now() + 86400000 }, id));
  sessionStorage.setItem(KEY, id);
}
export async function loadReportStartPhoto(): Promise<File | null> {
  const id = sessionStorage.getItem(KEY);
  if (!id) return null;
  const value = await access<{ photo: File; expires: number } | undefined>(store => store.get(id));
  if (!value || value.expires < Date.now()) { await clearReportStartPhoto(); return null; }
  return value.photo instanceof File ? value.photo : null;
}
export async function clearReportStartPhoto() {
  const id = sessionStorage.getItem(KEY);
  if (id) await access(store => store.delete(id));
  sessionStorage.removeItem(KEY);
}
