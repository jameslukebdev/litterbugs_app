import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { from: mocks.from } }));
vi.mock('react-native', () => ({ Alert: {}, Platform: { OS: 'ios' } }));
vi.mock('expo-crypto', () => ({}));
vi.mock('expo-file-system/legacy', () => ({}));
vi.mock('expo-image-picker', () => ({}));
vi.mock('./funding', () => ({ requestGeminiReview: vi.fn() }));
vi.mock('./secureMediaUpload', () => ({ uploadSecureMedia: vi.fn() }));
vi.mock('./photoSafetyPreparation', () => ({ preparePhotoForSafetyScan: vi.fn() }));
import { loadCleanupSubmissionContext } from './cleanupSubmission';
const attempt = { id: 'cleanup', report_id: 'report', cleaner_id: 'owner', status: 'claimed', claim_expires_at: '2099-01-01T00:00:00Z' };
function respond(value) { return { select() { return this; }, eq() { return this; }, maybeSingle: async () => value }; }
beforeEach(() => mocks.from.mockReset());
it('retries a transient context failure without requiring evidence to be resubmitted', async () => {
  mocks.from.mockReturnValueOnce(respond({ error: new Error('offline') })).mockReturnValueOnce(respond({ data: attempt })).mockReturnValueOnce(respond({ data: { id: 'report' } }));
  await expect(loadCleanupSubmissionContext('cleanup', 'owner')).rejects.toThrow('offline');
  expect(await loadCleanupSubmissionContext('cleanup', 'owner')).toEqual({ attempt, report: { id: 'report' } });
});
it('recognizes expired claims before opening the submission form', async () => {
  mocks.from.mockReturnValue(respond({ data: { ...attempt, claim_expires_at: '2020-01-01T00:00:00Z' } }));
  await expect(loadCleanupSubmissionContext('cleanup', 'owner')).rejects.toThrow('cleanup_claim_expired');
});
it('rejects another cleaner and a report that is no longer visible', async () => {
  mocks.from.mockReturnValueOnce(respond({ data: attempt }));
  await expect(loadCleanupSubmissionContext('cleanup', 'other')).rejects.toThrow('cleanup_submission_not_allowed');
  mocks.from.mockReturnValueOnce(respond({ data: attempt })).mockReturnValueOnce(respond({ data: null }));
  await expect(loadCleanupSubmissionContext('cleanup', 'owner')).rejects.toThrow('cleanup_submission_not_allowed');
});
it('distinguishes a closed correction window from network errors', async () => {
  mocks.from.mockReturnValue(respond({ data: { ...attempt, status: 'changes_requested', correction_due_at: '2020-01-01T00:00:00Z' } }));
  await expect(loadCleanupSubmissionContext('cleanup', 'owner')).rejects.toThrow('cleanup_correction_expired');
});
