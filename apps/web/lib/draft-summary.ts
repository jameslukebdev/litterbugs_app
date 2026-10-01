import { accountDraftPayload, type CloudDraft } from '@litterbugs/report-contract';
import { createClient } from './supabase/client';
import { loadLocalReportDraft } from './saved-report-draft';
import { loadLocalCleanupDraft } from './saved-cleanup-draft';

export type DraftSummary = { title: string; photos: number; detail: string; savedAt?: string; savedOn?: 'account' | 'device' };
export function accountDraftSummary(record: CloudDraft): DraftSummary | null {
  if (!record.payload || record.state === 'deleted' || Date.parse(record.expires_at) <= Date.now()) return null;
  const p = accountDraftPayload(record.payload, record.draft_key);
  return { title: p.kind === 'report' ? p.draft.title || 'Untitled litter report' : 'Cleanup evidence', photos: record.photo_paths.length, detail: p.kind === 'report' ? `${p.coordinates.latitude.toFixed(4)}, ${p.coordinates.longitude.toFixed(4)}` : p.description, savedAt: record.updated_at, savedOn: 'account' };
}
export async function readDraftComparison(userId: string, key: string) {
  const [local, remote] = await Promise.all([
    key === 'report' ? loadLocalReportDraft(userId) : loadLocalCleanupDraft(userId, key.slice(8)),
    createClient().from('customer_drafts').select('*').eq('user_id', userId).eq('draft_key', key).maybeSingle(),
  ]);
  if (remote.error) throw remote.error;
  const device: DraftSummary | null = local ? 'draft' in local
    ? { title: local.draft.title || 'Untitled litter report', photos: local.draft.photos.length, savedAt: local.savedAt ? new Date(local.savedAt).toISOString() : undefined, savedOn: 'device', detail: `${local.coordinates.latitude.toFixed(4)}, ${local.coordinates.longitude.toFixed(4)}` }
    : { title: 'Cleanup evidence', photos: local.photos.length, savedAt: local.savedAt ? new Date(local.savedAt).toISOString() : undefined, savedOn: 'device', detail: local.description } : null;
  return { device, account: remote.data ? accountDraftSummary(remote.data as CloudDraft) : null };
}
