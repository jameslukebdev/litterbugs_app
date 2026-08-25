export const MAX_CLEANUP_REVIEW_NOTE_LENGTH = 500;

export const CLEANUP_CHANGE_REASONS = Object.freeze([
  {
    code: 'additional_photo_needed',
    label: 'Need another photo',
    description: 'The result needs another or clearer after photo.',
  },
  {
    code: 'cleanup_appears_incomplete',
    label: 'Cleanup appears incomplete',
    description: 'The submitted evidence appears to show remaining litter.',
  },
  {
    code: 'details_unclear',
    label: 'Need more information',
    description: 'The description or impact details need clarification.',
  },
  {
    code: 'other',
    label: 'Other',
    description: 'A different evidence update is needed.',
  },
]);

export function cleanupChangeReasonLabel(code) {
  return CLEANUP_CHANGE_REASONS.find((reason) => reason.code === code)?.label
    ?? 'Requested update';
}

const ALLOWED_REASON_CODES = new Set(
  CLEANUP_CHANGE_REASONS.map(({ code }) => code)
);

export function validateCleanupChangeRequest({ reasons, note }) {
  const uniqueReasons = [...new Set(reasons ?? [])];
  const normalizedNote = String(note ?? '').trim();
  const errors = {};

  if (
    uniqueReasons.length < 1
    || uniqueReasons.length > CLEANUP_CHANGE_REASONS.length
    || uniqueReasons.some((reason) => !ALLOWED_REASON_CODES.has(reason))
  ) {
    errors.reasons = 'Choose at least one reason for requesting changes.';
  }

  if (normalizedNote.length > MAX_CLEANUP_REVIEW_NOTE_LENGTH) {
    errors.note = `Keep the note under ${MAX_CLEANUP_REVIEW_NOTE_LENGTH} characters.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      reasons: uniqueReasons,
      note: normalizedNote || null,
    },
  };
}
