import { accountDraftPayload, type CloudDraft } from '@litterbugs/report-contract';
import { createClient } from './supabase/client';
import { loadLocalReportDraft, type SavedReportDraft } from './saved-report-draft';
import { loadLocalCleanupDraft, type CleanupDraft } from './saved-cleanup-draft';

export type DraftSummary = { title: string; photos: number; detail: string; fields?: string[]; savedAt?: string; savedOn?: 'account' | 'device' };
type ReportDetails = SavedReportDraft['draft'];
const reportFields = (draft: Omit<ReportDetails, 'photos'>, step: number) => [
  `Step ${step + 1} of 5`,
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
      detail: `${local.coordinates.latitude.toFixed(4)}, ${local.coordinates.longitude.toFixed(4)}`, fields: reportFields(local.draft, local.step),
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
    fields: p.kind === 'report' ? reportFields(p.draft, p.step) : cleanupFields(p), savedAt: record.updated_at, savedOn: 'account',
  };
}
export async function readDraftComparison(userId: string, key: string) {
  const [local, remote] = await Promise.all([
    key === 'report' ? loadLocalReportDraft(userId) : loadLocalCleanupDraft(userId, key.slice(8)),
    createClient().from('customer_drafts').select('*').eq('user_id', userId).eq('draft_key', key).maybeSingle(),
  ]);
  if (remote.error) throw remote.error;
  return { device: local ? deviceDraftSummary(local) : null, account: remote.data ? accountDraftSummary(remote.data as CloudDraft) : null };
}
