// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { validateCleanupEvidence } from './cleanup-action';

function photo(name = 'after.jpg', type = 'image/jpeg', bytes = 32) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('cleanup evidence validation', () => {
  it('requires after photos and a cleanup description', () => {
    expect(validateCleanupEvidence([], 'Cleaned the roadside')).toMatch(/between 1 and 3/i);
    expect(validateCleanupEvidence([photo()], '  ')).toMatch(/describe what you cleaned/i);
  });

  it('accepts the launch photo formats and complete evidence', () => {
    expect(validateCleanupEvidence([photo('after.heic', 'image/heic')], 'Removed two bags of litter.')).toBe('');
  });

  it('rejects unsupported or oversized files before upload', () => {
    expect(validateCleanupEvidence([photo('after.pdf', 'application/pdf')], 'Cleaned it.')).toMatch(/JPEG, PNG, WebP, HEIC, or HEIF/i);
    expect(validateCleanupEvidence([photo('after.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)], 'Cleaned it.')).toMatch(/smaller than 5 MB/i);
  });
});
