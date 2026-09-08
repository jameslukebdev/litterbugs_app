import { describe, expect, it } from 'vitest';

import {
  MAX_REPORT_PHOTOS,
  mergeReportPhotoUris,
  reportCameraPickerOptions,
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
      preferredAssetRepresentationMode: 'compatible',
      presentationStyle: 'fullScreen',
      quality: 0.5,
    });
  });

  it('limits a later picker visit to the remaining photo slots', () => {
    expect(reportPhotoPickerOptions(1).selectionLimit).toBe(2);
    expect(reportPhotoPickerOptions(2).selectionLimit).toBe(1);
  });

  it('opens the camera for one report photo at a time', () => {
    expect(reportCameraPickerOptions()).toMatchObject({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      selectionLimit: 1,
      quality: 0.5,
    });
  });

  it('uses picker compression as a fallback for an older development client', () => {
    expect(reportPhotoPickerOptions(0, {
      nativePhotoOptimizationAvailable: false,
    })).toMatchObject({
      allowsMultipleSelection: false,
      selectionLimit: 1,
      orderedSelection: false,
      preferredAssetRepresentationMode: 'compatible',
      quality: 0.15,
    });
    expect(reportCameraPickerOptions({
      nativePhotoOptimizationAvailable: false,
    }).quality).toBe(0.15);
  });

  it('keeps every selected asset while enforcing the three-photo maximum', () => {
    expect(mergeReportPhotoUris(
      ['existing.jpg'],
      [{ uri: 'second.jpg' }, { uri: 'third.jpg' }, { uri: 'extra.jpg' }]
    )).toEqual(['existing.jpg', 'second.jpg', 'third.jpg']);
    expect(MAX_REPORT_PHOTOS).toBe(3);
  });
});
