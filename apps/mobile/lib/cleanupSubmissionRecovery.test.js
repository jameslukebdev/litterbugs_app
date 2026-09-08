import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ lookup: vi.fn(), rpc: vi.fn(), remove: vi.fn(), upload: vi.fn() }));
vi.mock('react-native', () => ({ Alert: {}, Platform: {} }));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'new-id' }));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-file-system/legacy', () => ({ readAsStringAsync: async () => 'YQ==', EncodingType: { Base64: 'base64' }, getInfoAsync: async () => ({ exists: true, size: 10 }) }));
vi.mock('./supabase', () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: m.lookup }) }) }) }),
  rpc: m.rpc, storage: { from: () => ({ remove: m.remove }) },
} }));
vi.mock('./funding', () => ({ requestGeminiReview: vi.fn() }));
vi.mock('./secureMediaUpload', () => ({ uploadSecureMedia: m.upload }));
vi.mock('./photoSafetyPreparation', () => ({ preparePhotoForSafetyScan: async () => ({ uri: 'file.jpg', mimeType: 'image/jpeg', byteSize: 10 }) }));
import { uploadCleanupSubmission } from './cleanupSubmission';
const input = { cleanupId: 'cleanup', userId: 'user', submissionId: 'stable-id', photos: [{ uri: 'photo.jpg', mimeType: 'image/jpeg' }], description: 'Cleaned' };
beforeEach(() => { vi.clearAllMocks(); m.lookup.mockReset(); m.lookup.mockResolvedValue({ data: null, error: null }); m.upload.mockResolvedValue('path'); m.rpc.mockResolvedValue({ data: null, error: new Error('response lost') }); });
it('returns a previously committed submission without uploading or submitting again', async () => {
  m.lookup.mockResolvedValue({ data: { id: 'stable-id' } });
  expect((await uploadCleanupSubmission(input)).submission.id).toBe('stable-id');
  expect(m.upload).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
});
it('recognizes a commit after a lost save response and preserves its evidence', async () => {
  m.lookup.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: { id: 'stable-id' } });
  expect((await uploadCleanupSubmission(input)).submission.id).toBe('stable-id');
  expect(m.remove).not.toHaveBeenCalled();
});
it('does not delete evidence when a dispatched save cannot be confirmed', async () => {
  await expect(uploadCleanupSubmission(input)).rejects.toThrow('response lost');
  expect(m.rpc).toHaveBeenCalledWith('submit_cleanup_with_weight', expect.objectContaining({ target_submission_id: 'stable-id' }));
  expect(m.remove).not.toHaveBeenCalled();
});
