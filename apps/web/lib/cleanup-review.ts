export const CLEANUP_CHANGE_REASONS = [
  { code: 'additional_photo_needed', label: 'Need another photo' },
  { code: 'cleanup_appears_incomplete', label: 'Cleanup appears incomplete' },
  { code: 'details_unclear', label: 'Need more information' },
  { code: 'other', label: 'Other' },
] as const;

export function cleanupChangeReasonLabel(code: string) {
  return CLEANUP_CHANGE_REASONS.find(reason => reason.code === code)?.label ?? 'Requested update';
}

export type CleanupReviewDraft = { note: string; reasons: string[] };
const key = (userId: string, submissionId: string) => `litterbugs.review-draft.${userId}.${submissionId}`;
export function loadCleanupReviewDraft(userId: string, submissionId: string): CleanupReviewDraft {
  const raw = localStorage.getItem(key(userId, submissionId));
  if (!raw) return { note: '', reasons: [] };
  const draft = JSON.parse(raw);
  if (typeof draft.note !== 'string' || !Array.isArray(draft.reasons)) throw new Error('Saved feedback could not be read');
  return { note: draft.note.slice(0, 1000), reasons: draft.reasons.filter((code: string) => CLEANUP_CHANGE_REASONS.some(reason => reason.code === code)) };
}
export function saveCleanupReviewDraft(userId: string, submissionId: string, draft: CleanupReviewDraft) {
  localStorage.setItem(key(userId, submissionId), JSON.stringify(draft));
}
export function clearCleanupReviewDraft(userId: string, submissionId: string) {
  localStorage.removeItem(key(userId, submissionId));
}
