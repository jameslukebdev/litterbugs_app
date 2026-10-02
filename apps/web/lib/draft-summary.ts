import { accountDraftPayload, type CloudDraft } from '@litterbugs/report-contract';
import { prepareBrowserPhoto } from './prepare-browser-photo';
import { createClient } from './supabase/client';
import { loadLocalReportDraft, type SavedReportDraft } from './saved-report-draft';
import { loadLocalCleanupDraft, type CleanupDraft } from './saved-cleanup-draft';

export type DraftSummary = { title: string; photos: number; detail: string; fields?: string[]; savedAt?: string; savedOn?: 'account' | 'device'; expiresAt?: string; photoPreviews?: { src?: string; name: string }[] };
type ReportDetails = SavedReportDraft['draft'];
const reportFields = (draft: Omit<ReportDetails, 'photos'>, step: number, fundingChoice: string, customAmount: string) => [
  `Step ${step + 1} of 5`,
  `Starting contribution: ${fundingChoice === 'none' ? 'None' : fundingChoice === 'other' ? customAmount ? `$${customAmount}` : 'Amount not entered' : `$${fundingChoice}`}`,
  `Litter: ${[...draft.selectedTypes, draft.types].filter(Boolean).join(', ') || 'Not entered'}`,
  `Severity: ${draft.severity || 'Not entered'}`,
  `Notes: ${[...draft.selectedNotes, draft.notes].filter(Boolean).join('; ') || 'Not entered'}`,
];
const cleanupFields = (draft: Pick<CleanupDraft, 'bagsOrItems' | 'weightPounds'>) => [
  `Bags or items: ${draft.bagsOrItems || 'Not entered'}`, `Weight (lb): ${draft.weightPounds || 'Not entered'}`,
];
export function deviceDraftSummary(local: SavedReportDraft | CleanupDraft): DraftSummary {
  return {
    ...('draft' in local ? {
      title: local.draft.title || 'Untitled litter report', photos: local.draft.photos.length,
      detail: `${local.coordinates.latitude.toFixed(4)}, ${local.coordinates.longitude.toFixed(4)}`, fields: reportFields(local.draft, local.step, local.fundingChoice, local.customAmount),
    } : { title: 'Cleanup evidence', photos: local.photos.length, detail: local.description, fields: cleanupFields(local) }),
    savedAt: local.savedAt && Number.isFinite(new Date(local.savedAt).getTime()) ? new Date(local.savedAt).toISOString() : undefined, savedOn: 'device',
  };
}
export function accountDraftSummary(record: CloudDraft): DraftSummary | null {
  if (!record.payload || record.state === 'deleted' || Date.parse(record.expires_at) <= Date.now()) return null;
  const p = accountDraftPayload(record.payload, record.draft_key);
  return {
    title: p.kind === 'report' ? p.draft.title || 'Untitled litter report' : 'Cleanup evidence', photos: record.photo_paths.length,
    detail: p.kind === 'report' ? `${p.coordinates.latitude.toFixed(4)}, ${p.coordinates.longitude.toFixed(4)}` : p.description,
    fields: p.kind === 'report' ? reportFields(p.draft, p.step, p.fundingChoice, p.customAmount) : cleanupFields(p), savedAt: record.updated_at, savedOn: 'account', expiresAt: record.expires_at,
  };
}
async function previewFile(file: File, name: string) {
  try {
    const image = /\.(heic|heif)$/i.test(file.name) || /^image\/(heic|heif)$/.test(file.type) ? await prepareBrowserPhoto(file) : file;
    return { name, src: URL.createObjectURL(image) };
  } catch { return { name }; }
}
async function boundedPhoto<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([request, new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Photo preview timed out')),10000);})]); }
  finally { clearTimeout(timer); }
}
export async function readDraftComparison(userId: string, key: string) {
  const [local, remote] = await Promise.all([
    key === 'report' ? loadLocalReportDraft(userId) : loadLocalCleanupDraft(userId, key.slice(8)),
    createClient().from('customer_drafts').select('*').eq('user_id', userId).eq('draft_key', key).maybeSingle(),
  ]);
  if (remote.error) throw remote.error;
  const device = local ? deviceDraftSummary(local) : null;
  const account = remote.data ? accountDraftSummary(remote.data as CloudDraft) : null;
  // Downloads remain scoped to the signed-in owner's private draft bucket.
  // A missing image is explicit; it must not look like identical photo content.
  if (account && remote.data) {
    account.photoPreviews = [];
    for (const [index,path] of (remote.data as CloudDraft).photo_paths.entries()) {
      const name = `Account photo ${index + 1}`;
      if (!path.startsWith(`${userId}/`)) { account.photoPreviews.push({name}); continue; }
      try {
        const { data, error } = await boundedPhoto(createClient().storage.from('customer_draft_photos').download(path));
        account.photoPreviews.push(!error && data ? await previewFile(new File([data],path.split('/').pop()!,{type:data.type}),name) : {name});
      } catch { account.photoPreviews.push({name}); }
    }
  }
  if (device && local) {
    device.photoPreviews = [];
    for (const [index,photo] of ('draft' in local ? local.draft.photos : local.photos).entries()) device.photoPreviews.push(await previewFile(photo,`Device photo ${index + 1}`));
  }
  return { device, account };
}
