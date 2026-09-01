import { describe, expect, it } from 'vitest';

import { hasRequiredReportPhoto } from './reportDraft';

describe('hasRequiredReportPhoto', () => {
  it('requires a photo for a new report', () => {
    expect(hasRequiredReportPhoto()).toBe(false);
    expect(hasRequiredReportPhoto({ photoUris: ['file://report.jpg'] })).toBe(true);
  });

  it('allows an edit to keep an existing photo', () => {
    expect(hasRequiredReportPhoto({
      isEditing: true,
      existingPhotoPaths: ['member/report/photo.jpg'],
    })).toBe(true);
  });

  it('requires a photo when editing a legacy photo-less report', () => {
    expect(hasRequiredReportPhoto({
      isEditing: true,
      existingPhotoPaths: [],
    })).toBe(false);
  });
});
