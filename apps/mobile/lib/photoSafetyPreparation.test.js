import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-file-system/legacy', () => ({ getInfoAsync: vi.fn() }));
vi.mock('expo-modules-core', () => ({ requireOptionalNativeModule: vi.fn(() => null) }));
vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: vi.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

import {
  MEDIA_SCANNER_TARGET_BYTES,
  MEDIA_UPLOAD_MAX_EDGE,
  MEDIA_UPLOAD_TARGET_BYTES,
  preparePhotoForSafetyScan,
  validatePreparedPhotoForSafetyScan,
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
  it('normalizes a small photo before it reaches quarantine', async () => {
    const deps = dependencies(
      { 'file://small.jpg': 2_000_000, 'file://prepared.jpg': 900_000 },
      [{ uri: 'file://prepared.jpg', width: 1600, height: 1200 }],
    );
    await expect(preparePhotoForSafetyScan('file://small.jpg', deps)).resolves.toEqual({
      uri: 'file://prepared.jpg',
      byteSize: 900_000,
      mimeType: 'image/jpeg',
      optimized: true,
    });
    expect(deps.manipulateAsync).toHaveBeenCalledWith('file://small.jpg', [], {
      compress: 0.75,
      format: 'jpeg',
    });
  });

  it('downscales a large camera photo to the performance target', async () => {
    const deps = dependencies(
      {
        'file://large.jpg': 5_020_487,
        'file://encoded.jpg': 2_750_000,
        'file://prepared.jpg': 1_100_000,
      },
      [
        { uri: 'file://encoded.jpg', width: 4032, height: 3024 },
        { uri: 'file://prepared.jpg', width: 2048, height: 1536 },
      ],
    );
    await expect(preparePhotoForSafetyScan('file://large.jpg', deps)).resolves.toMatchObject({
      uri: 'file://prepared.jpg',
      byteSize: 1_100_000,
      mimeType: 'image/jpeg',
      optimized: true,
    });
    expect(deps.manipulateAsync).toHaveBeenNthCalledWith(2, 'file://large.jpg', [
      { resize: { width: MEDIA_UPLOAD_MAX_EDGE } },
    ], {
      compress: 0.75,
      format: 'jpeg',
    });
  });

  it('resizes a photo if compression alone is not enough', async () => {
    const deps = dependencies(
      {
        'file://large.jpg': 5_000_000,
        'file://compressed.jpg': MEDIA_SCANNER_TARGET_BYTES + 1,
        'file://normalized.jpg': MEDIA_UPLOAD_TARGET_BYTES + 1,
        'file://resized.jpg': 1_200_000,
      },
      [
        { uri: 'file://compressed.jpg', width: 4000, height: 3000 },
        { uri: 'file://normalized.jpg', width: 2048, height: 1536 },
        { uri: 'file://resized.jpg', width: 1600, height: 1200 },
      ],
    );
    const result = await preparePhotoForSafetyScan('file://large.jpg', deps);
    expect(result.uri).toBe('file://resized.jpg');
    expect(deps.manipulateAsync).toHaveBeenNthCalledWith(3, 'file://large.jpg', [
      { resize: { width: 1600 } },
    ], {
      compress: 0.68,
      format: 'jpeg',
    });
  });

  it('accepts a normal camera original above 5 MB so it can be compressed', async () => {
    const deps = dependencies(
      {
        'file://camera.jpg': 7_000_000,
        'file://encoded.jpg': 2_500_000,
        'file://prepared.jpg': 1_000_000,
      },
      [
        { uri: 'file://encoded.jpg', width: 4032, height: 3024 },
        { uri: 'file://prepared.jpg', width: 2048, height: 1536 },
      ],
    );
    await expect(preparePhotoForSafetyScan('file://camera.jpg', deps)).resolves.toMatchObject({
      uri: 'file://prepared.jpg',
      optimized: true,
    });
  });

  it('keeps older development clients from crashing when optimization is unavailable', async () => {
    const fileSystem = {
      getInfoAsync: vi.fn(async () => ({ exists: true, size: 5_000_000 })),
    };

    await expect(preparePhotoForSafetyScan('file://large.jpg', {
      fileSystem,
      imageManipulator: null,
    })).rejects.toThrow('Update the Litterbugs development app');
  });

  it('keeps a scanner-sized photo usable on an older development client', async () => {
    const fileSystem = {
      getInfoAsync: vi.fn(async () => ({ exists: true, size: 2_000_000 })),
    };

    await expect(preparePhotoForSafetyScan('file://small.jpg', {
      fileSystem,
      imageManipulator: null,
    })).resolves.toMatchObject({ uri: 'file://small.jpg', optimized: false });
  });

  it('rejects an unusually large original before loading it into memory', async () => {
    const deps = dependencies({ 'file://huge.jpg': 20 * 1024 * 1024 + 1 });
    await expect(preparePhotoForSafetyScan('file://huge.jpg', deps))
      .rejects.toThrow('smaller than 20 MB');
  });

  it('validates an already-prepared photo without re-encoding it', async () => {
    const fileSystem = {
      getInfoAsync: vi.fn(async () => ({ exists: true, size: 1_000_000 })),
    };

    await expect(validatePreparedPhotoForSafetyScan('file://prepared.jpg', { fileSystem }))
      .resolves.toEqual({ uri: 'file://prepared.jpg', byteSize: 1_000_000 });
  });
});
