import { describe, expect, it } from 'vitest';

import {
  MAX_CLEANUP_DESCRIPTION_LENGTH,
  validateCleanupSubmission,
} from './cleanupSubmissionValidation';

const validSubmission = {
  photos: [{ uri: 'after.jpg' }],
  description: 'Removed two bags of cans and food containers.',
  bagsOrItemsRemoved: '2',
  durationMinutes: '35',
};

describe('cleanup completion submission validation', () => {
  it('normalizes a valid submission', () => {
    expect(validateCleanupSubmission(validSubmission)).toMatchObject({
      valid: true,
      normalized: {
        description: validSubmission.description,
        bagsOrItemsRemoved: 2,
        durationMinutes: 35,
      },
    });
  });

  it('requires one through three photos and nonblank description', () => {
    expect(validateCleanupSubmission({
      ...validSubmission,
      photos: [],
      description: '   ',
    })).toMatchObject({
      valid: false,
      errors: {
        photos: expect.any(String),
        description: expect.any(String),
      },
    });

    expect(validateCleanupSubmission({
      ...validSubmission,
      photos: [{}, {}, {}, {}],
    }).errors.photos).toBeTruthy();
  });

  it('validates optional whole-number impact fields', () => {
    expect(validateCleanupSubmission({
      ...validSubmission,
      bagsOrItemsRemoved: '-1',
      durationMinutes: '0',
    })).toMatchObject({
      valid: false,
      errors: {
        bagsOrItemsRemoved: expect.any(String),
        durationMinutes: expect.any(String),
      },
    });

    expect(validateCleanupSubmission({
      ...validSubmission,
      bagsOrItemsRemoved: '',
      durationMinutes: '',
    }).normalized).toMatchObject({
      bagsOrItemsRemoved: null,
      durationMinutes: null,
    });
  });

  it('enforces the backend description limit', () => {
    expect(validateCleanupSubmission({
      ...validSubmission,
      description: 'x'.repeat(MAX_CLEANUP_DESCRIPTION_LENGTH + 1),
    }).errors.description).toBeTruthy();
  });
});
