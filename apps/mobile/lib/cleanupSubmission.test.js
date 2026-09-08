import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  MAX_CLEANUP_DESCRIPTION_LENGTH,
  validateCleanupSubmission,
} from './cleanupSubmissionValidation';

const submissionServiceSource = readFileSync(
  new URL('./cleanupSubmission.js', import.meta.url),
  'utf8',
);
const submissionScreenSource = readFileSync(
  new URL('../CleanupSubmissionScreen.js', import.meta.url),
  'utf8',
);

const validSubmission = {
  photos: [{ uri: 'after.jpg' }],
  description: 'Removed two bags of cans and food containers.',
  bagsOrItemsRemoved: '2',
  weightPounds: '12.5',
};

describe('cleanup completion submission validation', () => {
  it('normalizes a valid submission', () => {
    expect(validateCleanupSubmission(validSubmission)).toMatchObject({
      valid: true,
      normalized: {
        description: validSubmission.description,
        bagsOrItemsRemoved: 2,
        weightPounds: 12.5,
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

  it('validates optional impact fields', () => {
    expect(validateCleanupSubmission({
      ...validSubmission,
      bagsOrItemsRemoved: '-1',
      weightPounds: '0',
    })).toMatchObject({
      valid: false,
      errors: {
        bagsOrItemsRemoved: expect.any(String),
        weightPounds: expect.any(String),
      },
    });

    expect(validateCleanupSubmission({
      ...validSubmission,
      bagsOrItemsRemoved: '',
      weightPounds: '',
    }).normalized).toMatchObject({
      bagsOrItemsRemoved: null,
      weightPounds: null,
    });

    expect(validateCleanupSubmission({
      ...validSubmission,
      weightPounds: '12.345',
    }).errors.weightPounds).toBeTruthy();
  });

  it('enforces the backend description limit', () => {
    expect(validateCleanupSubmission({
      ...validSubmission,
      description: 'x'.repeat(MAX_CLEANUP_DESCRIPTION_LENGTH + 1),
    }).errors.description).toBeTruthy();
  });

  it('submits and presents estimated pounds instead of duration', () => {
    expect(submissionServiceSource).toContain("'submit_cleanup_with_weight'");
    expect(submissionServiceSource).toContain('cleanup_weight_pounds: weightPounds');
    expect(submissionServiceSource).not.toContain('cleanup_duration_minutes');
    expect(submissionScreenSource).toContain('Weight removed (lb)');
    expect(submissionScreenSource).not.toContain('Duration (minutes)');
  });

  it('safety-checks cleanup photos with bounded concurrency', () => {
    expect(submissionServiceSource).toContain('mapInConcurrentBatches(');
    expect(submissionServiceSource).toContain(
      'concurrency: CLEANUP_PHOTO_UPLOAD_CONCURRENCY',
    );
    expect(submissionServiceSource).toContain("stage: 'uploading'");
  });
});
