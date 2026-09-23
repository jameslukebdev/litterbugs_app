import type { Coordinates, ReportDraft } from '@litterbugs/report-contract';

export type ReportWizardSnapshot = {
  draft: ReportDraft;
  step: number;
  fundingChoice: string;
  customAmount: string;
};
export type SavedReportDraft = ReportWizardSnapshot & { coordinates: Coordinates };
export type ReportPublicationJournal = { userId: string; reportId: string; paths: string[] };

// IndexedDB preserves File bytes; localStorage and blob URLs do not survive reloads.
// Serialize complete transactions so a queued autosave cannot resurrect a discard.
let queue: Promise<unknown> = Promise.resolve();
function transaction<T>(store: 'drafts' | 'publications', userId: string, operation: (store: IDBObjectStore, tx: IDBTransaction) => IDBRequest<T>, includePublication = false): Promise<T> {
  const work = queue.catch(() => undefined).then(() => new Promise<T>((resolve, reject) => {
    if (!userId || typeof indexedDB === 'undefined') { reject(new Error('Local draft storage is unavailable.')); return; }
    let blocked = false;
    const open = indexedDB.open('litterbugs-report-drafts', 1);
    open.onupgradeneeded = () => {
      open.result.createObjectStore('drafts');
      open.result.createObjectStore('publications');
    };
    open.onerror = () => reject(open.error ?? new Error('Local draft storage could not be opened.'));
    open.onblocked = () => { blocked = true; reject(new Error('Close other Litterbugs tabs and try again.')); };
    open.onsuccess = () => {
      const db = open.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => db.close();
      try {
        const tx = db.transaction(includePublication ? ['drafts', 'publications'] : store, 'readwrite');
        const request = operation(tx.objectStore(store), tx);
        tx.oncomplete = () => { db.close(); resolve(request.result); };
        tx.onabort = tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Your draft could not be saved on this browser.')); };
      } catch (error) { db.close(); reject(error); }
    };
  }));
  queue = work;
  return work;
}
export const saveReportDraft = (userId: string, draft: SavedReportDraft) => transaction('drafts', userId, store => store.put(draft, userId));
export async function loadReportDraft(userId: string): Promise<SavedReportDraft | undefined> {
  const value = await transaction<SavedReportDraft | undefined>('drafts', userId, store => store.get(userId));
  if (!value) return undefined;
  const draft = value.draft;
  if (!draft || !Number.isInteger(value.step) || value.step < 0 || value.step > 4
    || !Number.isFinite(value.coordinates?.latitude) || Math.abs(value.coordinates.latitude) > 90
    || !Number.isFinite(value.coordinates?.longitude) || Math.abs(value.coordinates.longitude) > 180
    || !['title', 'types', 'severity', 'notes'].every(key => typeof draft[key as keyof ReportDraft] === 'string')
    || ![draft.selectedTypes, draft.selectedNotes].every(list => Array.isArray(list) && list.every(item => typeof item === 'string'))
    || !Array.isArray(draft.photos) || draft.photos.length > 3 || !draft.photos.every(photo => photo instanceof File)
    || typeof value.fundingChoice !== 'string' || typeof value.customAmount !== 'string') {
    throw new Error('The saved report could not be read.');
  }
  return value;
}
export const clearReportDraft = (userId: string) => transaction('drafts', userId, store => store.delete(userId));
export const saveReportPublication = (journal: ReportPublicationJournal) => transaction('publications', journal.userId, store => store.put(journal, journal.userId));
export async function loadReportPublication(userId: string): Promise<ReportPublicationJournal | undefined> {
  const value = await transaction<ReportPublicationJournal | undefined>('publications', userId, store => store.get(userId));
  if (value && (value.userId !== userId || typeof value.reportId !== 'string' || !value.reportId
    || !Array.isArray(value.paths) || value.paths.length < 1 || value.paths.length > 3
    || !value.paths.every(path => typeof path === 'string' && path.startsWith(`${userId}/`)))) {
    throw new Error('The previous submission record could not be read.');
  }
  return value;
}
export const clearReportPublication = (userId: string) => transaction('publications', userId, store => store.delete(userId));

export const clearPublishedReport = (userId: string) => transaction('drafts', userId, (store, tx) => {
  tx.objectStore('publications').delete(userId);
  return store.delete(userId);
}, true);
