import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

vi.mock('server-only', () => ({}));

import {
  CLOUDMERSIVE_SCAN_ENDPOINT,
  MediaSecurityError,
  detectImageMimeType,
  requireCleanMalwareScan,
  sanitizeImage,
  validateSecureMediaRequest,
} from './media-security';

const userId = '11111111-1111-4111-8111-111111111111';
const reportId = '22222222-2222-4222-8222-222222222222';
const uploadId = '33333333-3333-4333-8333-333333333333';
const submissionId = '44444444-4444-4444-8444-444444444444';
const destinationId = '55555555-5555-4555-8555-555555555555';

const enabledEnv = {
  REPORT_MEDIA_MALWARE_SCANNER_ENABLED: 'true',
  REPORT_MEDIA_MALWARE_SCANNER_PROVIDER: 'cloudmersive',
  REPORT_MEDIA_MALWARE_SCANNER_API_KEY: 'server-only-test-key',
  REPORT_MEDIA_MALWARE_SCANNER_TIMEOUT_MS: '8000',
};

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('secure media request binding', () => {
  it('generates server-owned report and cleanup destinations', () => {
    expect(validateSecureMediaRequest({
      kind: 'report',
      quarantinePath: `${userId}/report/${uploadId}.png`,
      subjectId: reportId,
    }, userId, () => destinationId)).toMatchObject({
      destinationBucket: 'report_photos',
      destinationPath: `${userId}/${reportId}/${destinationId}.jpg`,
    });

    expect(validateSecureMediaRequest({
      kind: 'cleanup',
      quarantinePath: `${userId}/cleanup/${uploadId}.heic`,
      subjectId: reportId,
      submissionId,
      position: 3,
    }, userId)).toMatchObject({
      destinationBucket: 'cleanup_photos',
      destinationPath: `${userId}/${reportId}/${submissionId}/after-3.jpg`,
    });
  });

  it('rejects another user path, extra fields, traversal, and invalid positions', () => {
    const invalid = [
      { kind: 'avatar', quarantinePath: `another-user/avatar/${uploadId}.jpg` },
      { kind: 'avatar', quarantinePath: `${userId}/avatar/../${uploadId}.jpg` },
      { kind: 'avatar', quarantinePath: `${userId}/avatar/${uploadId}.jpg`, subjectId: reportId },
      {
        kind: 'cleanup',
        quarantinePath: `${userId}/cleanup/${uploadId}.jpg`,
        subjectId: reportId,
        submissionId,
        position: 4,
      },
    ];
    for (const value of invalid) {
      expect(() => validateSecureMediaRequest(value, userId)).toThrow(MediaSecurityError);
    }
  });
});

describe('malware scan gate', () => {
  it('fails closed when the scanner is disabled or incomplete', async () => {
    await expect(requireCleanMalwareScan(new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg', {
      env: {},
    })).rejects.toMatchObject({ code: 'MEDIA_SCAN_UNAVAILABLE', status: 503 });
  });

  it('sends only one raw-byte multipart file and accepts a strict clean verdict', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(url).toBe(CLOUDMERSIVE_SCAN_ENDPOINT);
      expect(init?.method).toBe('POST');
      expect(init?.cache).toBe('no-store');
      expect(init?.headers).toEqual(expect.objectContaining({ apikey: 'server-only-test-key' }));
      expect(init?.headers).not.toHaveProperty('authorization');
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init?.body as FormData;
      expect([...form.keys()]).toEqual(['inputFile']);
      expect((form.get('inputFile') as File).name).toBe('litterbugs-upload');
      return jsonResponse({ CleanResult: true, FoundViruses: [] });
    });
    await expect(requireCleanMalwareScan(
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      'image/jpeg',
      { env: enabledEnv, fetchImpl: fetchImpl as typeof fetch },
    )).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects infected, malformed, oversized, and provider-error results', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    await expect(requireCleanMalwareScan(bytes, 'image/jpeg', {
      env: enabledEnv,
      fetchImpl: vi.fn(async () => jsonResponse({ CleanResult: false, FoundViruses: [] })) as typeof fetch,
    })).rejects.toMatchObject({ code: 'MEDIA_SCAN_INFECTED', status: 422 });
    await expect(requireCleanMalwareScan(bytes, 'image/jpeg', {
      env: enabledEnv,
      fetchImpl: vi.fn(async () => jsonResponse({ CleanResult: true, FoundViruses: [], extra: true })) as typeof fetch,
    })).rejects.toMatchObject({ code: 'MEDIA_SCAN_UNAVAILABLE' });
    await expect(requireCleanMalwareScan(bytes, 'image/jpeg', {
      env: enabledEnv,
      fetchImpl: vi.fn(async () => new Response('x'.repeat(1025))) as typeof fetch,
    })).rejects.toMatchObject({ code: 'MEDIA_SCAN_UNAVAILABLE' });
    await expect(requireCleanMalwareScan(bytes, 'image/jpeg', {
      env: enabledEnv,
      fetchImpl: vi.fn(async () => new Response(null, { status: 500 })) as typeof fetch,
    })).rejects.toMatchObject({ code: 'MEDIA_SCAN_UNAVAILABLE' });
  });

  it('aborts one slow provider attempt and fails closed', async () => {
    const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      })
    ));
    await expect(requireCleanMalwareScan(
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      'image/jpeg',
      {
        env: { ...enabledEnv, REPORT_MEDIA_MALWARE_SCANNER_TIMEOUT_MS: '1' },
        fetchImpl: fetchImpl as typeof fetch,
      },
    )).rejects.toMatchObject({ code: 'MEDIA_SCAN_UNAVAILABLE', status: 503 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('image content disarm', () => {
  it('detects actual signatures instead of trusting the declared MIME type', () => {
    expect(detectImageMimeType(new Uint8Array([0xff, 0xd8, 0xff]))).toBe('image/jpeg');
    expect(detectImageMimeType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]))).toBe('image/png');
    expect(detectImageMimeType(new TextEncoder().encode('RIFFxxxxWEBP'))).toBe('image/webp');
    expect(detectImageMimeType(new TextEncoder().encode('xxxxftypheic'))).toBe('image/heic');
    expect(detectImageMimeType(new TextEncoder().encode('<script>'))).toBeNull();
  });

  it('re-encodes a valid image as bounded metadata-free JPEG', async () => {
    const source = await sharp({
      create: { width: 40, height: 20, channels: 4, background: '#ff000080' },
    }).png().withMetadata({ orientation: 6 }).toBuffer();
    const result = await sanitizeImage(new Uint8Array(source), 'image/png');
    expect(detectImageMimeType(result.bytes)).toBe('image/jpeg');
    expect(result.bytes.length).toBeLessThan(source.length + 4096);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.format).toBe('jpeg');
    expect(metadata.width).toBe(20);
    expect(metadata.height).toBe(40);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.comments).toBeUndefined();
  });

  it('rejects MIME spoofing and malformed image bytes', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
    }).png().toBuffer();
    await expect(sanitizeImage(new Uint8Array(png), 'image/jpeg'))
      .rejects.toMatchObject({ code: 'MEDIA_INVALID_IMAGE', status: 415 });
    await expect(sanitizeImage(new TextEncoder().encode('<html>not an image</html>'), 'image/jpeg'))
      .rejects.toMatchObject({ code: 'MEDIA_INVALID_IMAGE', status: 415 });
  });

  it('rejects excessive decoded dimensions before reconstruction', async () => {
    const tooWide = await sharp({
      create: { width: 12_001, height: 1, channels: 3, background: '#ffffff' },
    }).png().toBuffer();
    await expect(sanitizeImage(new Uint8Array(tooWide), 'image/png'))
      .rejects.toMatchObject({ code: 'MEDIA_INVALID_IMAGE', status: 415 });
  });
});
