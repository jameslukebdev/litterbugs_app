import { describe, expect, it } from 'vitest';

import {
  CLEANUP_CHANGE_REASONS,
  MAX_CLEANUP_REVIEW_NOTE_LENGTH,
  cleanupChangeReasonLabel,
  validateCleanupChangeRequest,
} from './cleanupReviewValidation';

describe('cleanup reporter review validation', () => {
  it('requires a supported structured reason', () => {
    expect(validateCleanupChangeRequest({ reasons: [], note: '' })).toMatchObject({
      valid: false,
      errors: { reasons: expect.any(String) },
    });

    expect(validateCleanupChangeRequest({
      reasons: ['unsupported'],
      note: '',
    }).valid).toBe(false);
  });

  it('normalizes supported reasons and an optional note', () => {
    expect(validateCleanupChangeRequest({
      reasons: ['additional_photo_needed', 'additional_photo_needed'],
      note: '  Please add a wider photo.  ',
    })).toEqual({
      valid: true,
      errors: {},
      normalized: {
        reasons: ['additional_photo_needed'],
        note: 'Please add a wider photo.',
      },
    });
  });

  it('supports every backend-approved reason', () => {
    expect(validateCleanupChangeRequest({
      reasons: CLEANUP_CHANGE_REASONS.map(({ code }) => code),
      note: '',
    })).toMatchObject({
      valid: true,
      normalized: { note: null },
    });
  });

  it('enforces the backend note limit', () => {
    expect(validateCleanupChangeRequest({
      reasons: ['other'],
      note: 'x'.repeat(MAX_CLEANUP_REVIEW_NOTE_LENGTH + 1),
    }).errors.note).toBeTruthy();
  });

  it('uses the locked product labels for cleaner feedback', () => {
    expect(cleanupChangeReasonLabel('additional_photo_needed')).toBe('Need another photo');
    expect(cleanupChangeReasonLabel('details_unclear')).toBe('Need more information');
    expect(cleanupChangeReasonLabel('other')).toBe('Other');
  });
});
