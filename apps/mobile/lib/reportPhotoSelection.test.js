import { describe, expect, it } from 'vitest';

import {
  MAX_REPORT_PHOTOS,
  mergeReportPhotoUris,
  reportPhotoPickerOptions,
} from './reportPhotoSelection';

describe('report photo selection', () => {
  it('opens the picker in explicit multi-select mode for up to three photos', () => {
    expect(reportPhotoPickerOptions(0)).toMatchObject({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 3,
      orderedSelection: true,
      presentationStyle: 'fullScreen',
    });
  });

  it('limits a later picker visit to the remaining photo slots', () => {
    expect(reportPhotoPickerOptions(1).selectionLimit).toBe(2);
    expect(reportPhotoPickerOptions(2).selectionLimit).toBe(1);
  });

  it('keeps every selected asset while enforcing the three-photo maximum', () => {
    expect(mergeReportPhotoUris(
      ['existing.jpg'],
      [{ uri: 'second.jpg' }, { uri: 'third.jpg' }, { uri: 'extra.jpg' }]
    )).toEqual(['existing.jpg', 'second.jpg', 'third.jpg']);
    expect(MAX_REPORT_PHOTOS).toBe(3);
  });
});
