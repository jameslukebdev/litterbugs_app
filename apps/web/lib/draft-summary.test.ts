import { expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT, type CloudDraft } from '@litterbugs/report-contract';
vi.mock('./supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('./saved-report-draft', () => ({ loadLocalReportDraft: vi.fn() }));
vi.mock('./saved-cleanup-draft', () => ({ loadLocalCleanupDraft: vi.fn() }));
import { accountDraftSummary } from './draft-summary';
const record: CloudDraft = {
  user_id: 'owner', draft_key: 'cleanup:attempt', revision: 1, mutation_id: null, request_hash: null,
  submission_id: 'submission', state: 'editing', updated_at: '2026-10-01T12:00:00Z', expires_at: '2099-01-01T00:00:00Z',
  photo_paths: ['private/one', 'private/two'],
  payload: { version: 1, kind: 'cleanup', description: 'Removed bottles', bagsOrItems: '2', weightPounds: '5', correctionDueAt: null },
};
it('summarizes saved cleanup evidence without exposing private media paths', () => {
  const summary = accountDraftSummary(record);
  expect(summary).toMatchObject({ title: 'Cleanup evidence', photos: 2, detail: 'Removed bottles', savedAt: record.updated_at });
  expect(JSON.stringify(summary)).not.toContain('private/');
});
it('does not offer deleted or expired drafts for continuation', () => {
  expect(accountDraftSummary({ ...record, state: 'deleted' })).toBeNull();
  expect(accountDraftSummary({ ...record, expires_at: '2000-01-01T00:00:00Z' })).toBeNull();
});
it('rejects an incompatible draft rather than displaying it as a usable version', () => {
  expect(() => accountDraftSummary({ ...record, payload: { version: 2 } })).toThrow('cannot be opened');
});

it('includes the funding selection and real account expiry in report comparisons',()=>{
 const summary=accountDraftSummary({...record,draft_key:'report',payload:{version:1,kind:'report',coordinates:{latitude:1,longitude:2},step:4,fundingChoice:'other',customAmount:'17.50',draft:{...EMPTY_REPORT_DRAFT,photos:undefined}} as unknown as CloudDraft['payload']});
 expect(summary?.fields).toContain('Starting contribution: $17.50');
 expect(summary?.expiresAt).toBe(record.expires_at);
});
