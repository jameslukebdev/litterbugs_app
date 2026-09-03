import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-file-system/legacy', () => ({ getInfoAsync: vi.fn() }));
vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: vi.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

import {
  MEDIA_SCANNER_TARGET_BYTES,
  preparePhotoForSafetyScan,
} from './photoSafetyPreparation';

function dependencies(sizes, results = []) {
  const getInfoAsync = vi.fn(async (uri) => ({
    exists: true,
    size: sizes[uri],
  }));
  const manipulateAsync = vi.fn(async () => results.shift());
  return {
    fileSystem: { getInfoAsync },
    imageManipulator: {
      manipulateAsync,
      SaveFormat: { JPEG: 'jpeg' },
    },
    getInfoAsync,
    manipulateAsync,
  };
}

describe('photo safety preparation', () => {
  it('keeps a photo that already fits under the scanner boundary', async () => {
    const deps = dependencies({ 'file://small.jpg': 2_000_000 });
    await expect(preparePhotoForSafetyScan('file://small.jpg', deps)).resolves.toEqual({
      uri: 'file://small.jpg',
      byteSize: 2_000_000,
      mimeType: null,
      optimized: false,
    });
    expect(deps.manipulateAsync).not.toHaveBeenCalled();
  });

  it('re-encodes a large camera photo before it reaches quarantine', async () => {
    const deps = dependencies(
      { 'file://large.jpg': 5_020_487, 'file://prepared.jpg': 2_750_000 },
      [{ uri: 'file://prepared.jpg', width: 4032, height: 3024 }],
    );
    await expect(preparePhotoForSafetyScan('file://large.jpg', deps)).resolves.toMatchObject({
      uri: 'file://prepared.jpg',
      byteSize: 2_750_000,
      mimeType: 'image/jpeg',
      optimized: true,
    });
    expect(deps.manipulateAsync).toHaveBeenCalledWith('file://large.jpg', [], {
      compress: 0.72,
      format: 'jpeg',
    });
  });

  it('resizes a photo if compression alone is not enough', async () => {
    const deps = dependencies(
      {
        'file://large.jpg': 5_000_000,
        'file://compressed.jpg': MEDIA_SCANNER_TARGET_BYTES + 1,
        'file://resized.jpg': 2_200_000,
      },
      [
        { uri: 'file://compressed.jpg', width: 4000, height: 3000 },
        { uri: 'file://resized.jpg', width: 2560, height: 1920 },
      ],
    );
    const result = await preparePhotoForSafetyScan('file://large.jpg', deps);
    expect(result.uri).toBe('file://resized.jpg');
    expect(deps.manipulateAsync).toHaveBeenNthCalledWith(2, 'file://large.jpg', [
      { resize: { width: 2560 } },
    ], {
      compress: 0.7,
      format: 'jpeg',
    });
  });

  it('rejects an original that exceeds the app upload boundary', async () => {
    const deps = dependencies({ 'file://huge.jpg': 5 * 1024 * 1024 + 1 });
    await expect(preparePhotoForSafetyScan('file://huge.jpg', deps))
      .rejects.toThrow('smaller than 5 MB');
  });
});
