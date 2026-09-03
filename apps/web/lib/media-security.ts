import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import convert from 'heic-convert';
import sharp from 'sharp';

export const MEDIA_QUARANTINE_BUCKET = 'media_quarantine';
export const MEDIA_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const MEDIA_SCANNER_MAX_SOURCE_BYTES = 3_500_000;
export const MEDIA_MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
export const MEDIA_MAX_DIMENSION = 12_000;
export const MEDIA_MAX_PIXELS = 40_000_000;
export const MEDIA_SCAN_TIMEOUT_MS = 8_000;
export const CLOUDMERSIVE_SCAN_ENDPOINT = 'https://api.cloudmersive.com/virus/scan/file';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUARANTINE_EXTENSION_PATTERN = /\.(jpe?g|png|webp|heic|heif)$/i;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export type SecureMediaKind = 'report' | 'cleanup' | 'avatar';

export interface SecureMediaRequest {
  kind: SecureMediaKind;
  quarantinePath: string;
  subjectId?: string;
  submissionId?: string;
  position?: number;
}

export interface ValidatedSecureMediaRequest extends SecureMediaRequest {
  destinationBucket: 'report_photos' | 'cleanup_photos' | 'profile_avatars';
  destinationPath: string;
}

export class MediaSecurityError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function safeQuarantinePath(path: unknown, userId: string, kind: SecureMediaKind) {
  if (typeof path !== 'string' || path.length > 256 || path.includes('\0')) return false;
  const parts = path.split('/');
  if (parts.length !== 3 || parts[0] !== userId || parts[1] !== kind) return false;
  const filename = parts[2] ?? '';
  const extension = filename.match(QUARANTINE_EXTENSION_PATTERN)?.[0] ?? '';
  return Boolean(extension && isUuid(filename.slice(0, -extension.length)));
}

export function validateSecureMediaRequest(
  value: unknown,
  userId: string,
  createId: () => string = randomUUID,
): ValidatedSecureMediaRequest {
  if (!isUuid(userId) || !isRecord(value) || typeof value.kind !== 'string') {
    throw new MediaSecurityError('MEDIA_INVALID_REQUEST', 400, 'The photo request is invalid.');
  }
  if (!['report', 'cleanup', 'avatar'].includes(value.kind)) {
    throw new MediaSecurityError('MEDIA_INVALID_REQUEST', 400, 'The photo request is invalid.');
  }
  const kind = value.kind as SecureMediaKind;
  if (!safeQuarantinePath(value.quarantinePath, userId, kind)) {
    throw new MediaSecurityError('MEDIA_INVALID_REQUEST', 400, 'The photo request is invalid.');
  }

  if (kind === 'report') {
    if (!hasExactKeys(value, ['kind', 'quarantinePath', 'subjectId']) || !isUuid(value.subjectId)) {
      throw new MediaSecurityError('MEDIA_INVALID_REQUEST', 400, 'The photo request is invalid.');
    }
    return {
      kind,
      quarantinePath: value.quarantinePath as string,
      subjectId: value.subjectId,
      destinationBucket: 'report_photos',
      destinationPath: `${userId}/${value.subjectId}/${createId()}.jpg`,
    };
  }

  if (kind === 'cleanup') {
    if (
      !hasExactKeys(value, ['kind', 'position', 'quarantinePath', 'subjectId', 'submissionId'])
      || !isUuid(value.subjectId)
      || !isUuid(value.submissionId)
      || !Number.isInteger(value.position)
      || (value.position as number) < 1
      || (value.position as number) > 3
    ) {
      throw new MediaSecurityError('MEDIA_INVALID_REQUEST', 400, 'The photo request is invalid.');
    }
    return {
      kind,
      quarantinePath: value.quarantinePath as string,
      subjectId: value.subjectId,
      submissionId: value.submissionId,
      position: value.position as number,
      destinationBucket: 'cleanup_photos',
      destinationPath: `${userId}/${value.subjectId}/${value.submissionId}/after-${value.position}.jpg`,
    };
  }

  if (!hasExactKeys(value, ['kind', 'quarantinePath'])) {
    throw new MediaSecurityError('MEDIA_INVALID_REQUEST', 400, 'The photo request is invalid.');
  }
  return {
    kind,
    quarantinePath: value.quarantinePath as string,
    destinationBucket: 'profile_avatars',
    destinationPath: `${userId}/avatar`,
  };
}

export function detectImageMimeType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff
  ) return 'image/jpeg';
  if (
    bytes.length >= 8
    && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value)
  ) return 'image/png';
  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) return 'image/webp';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp') {
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic';
    if (['mif1', 'msf1', 'heif'].includes(brand)) return 'image/heif';
  }
  return null;
}

type MediaScannerEnvironment = Record<string, string | undefined>;

function scanConfiguration(env: MediaScannerEnvironment) {
  if (env.REPORT_MEDIA_MALWARE_SCANNER_ENABLED !== 'true') return null;
  if (env.REPORT_MEDIA_MALWARE_SCANNER_PROVIDER !== 'cloudmersive') return null;
  const apiKey = env.REPORT_MEDIA_MALWARE_SCANNER_API_KEY?.trim() ?? '';
  if (apiKey.length < 16 || apiKey.length > 256 || /\s/.test(apiKey)) return null;
  const configuredTimeout = Number(env.REPORT_MEDIA_MALWARE_SCANNER_TIMEOUT_MS ?? MEDIA_SCAN_TIMEOUT_MS);
  const timeoutMs = Number.isSafeInteger(configuredTimeout)
    && configuredTimeout >= 1
    && configuredTimeout <= MEDIA_SCAN_TIMEOUT_MS
    ? configuredTimeout
    : MEDIA_SCAN_TIMEOUT_MS;
  return { apiKey, timeoutMs };
}

function validCloudmersiveResponse(value: unknown): value is { CleanResult: boolean; FoundViruses: unknown[] | null } {
  if (!isRecord(value) || !hasExactKeys(value, ['CleanResult', 'FoundViruses'])) return false;
  if (typeof value.CleanResult !== 'boolean') return false;
  if (value.FoundViruses === null) return true;
  if (!Array.isArray(value.FoundViruses) || value.FoundViruses.length > 20) return false;
  return value.FoundViruses.every((item) => {
    if (!isRecord(item) || !hasExactKeys(item, ['FileName', 'VirusName'])) return false;
    return typeof item.FileName === 'string'
      && item.FileName.length <= 256
      && typeof item.VirusName === 'string'
      && item.VirusName.length <= 256;
  });
}

export async function requireCleanMalwareScan(
  bytes: Uint8Array,
  contentType: string,
  options: { env?: MediaScannerEnvironment; fetchImpl?: typeof fetch } = {},
) {
  const configuration = scanConfiguration(options.env ?? process.env);
  if (!configuration) {
    throw new MediaSecurityError(
      'MEDIA_SCAN_UNAVAILABLE',
      503,
      'Photo safety checking is temporarily unavailable. Please try again shortly.',
    );
  }
  if (!ALLOWED_MIME_TYPES.has(contentType) || bytes.length < 1) {
    throw new MediaSecurityError('MEDIA_INVALID_IMAGE', 415, 'Choose a supported image and try again.');
  }
  if (bytes.length > MEDIA_SCANNER_MAX_SOURCE_BYTES) {
    throw new MediaSecurityError(
      'MEDIA_SCAN_TOO_LARGE',
      413,
      'This photo is too large for safety checking. Choose a smaller image.',
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), configuration.timeoutMs);
  try {
    const form = new FormData();
    const uploadBytes = new Uint8Array(bytes.byteLength);
    uploadBytes.set(bytes);
    form.append('inputFile', new Blob([uploadBytes.buffer], { type: contentType }), 'litterbugs-upload');
    const response = await (options.fetchImpl ?? fetch)(CLOUDMERSIVE_SCAN_ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        accept: 'application/json',
        apikey: configuration.apiKey,
        'cache-control': 'no-store',
      },
      body: form,
      signal: controller.signal,
    });
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (!response.ok || (declaredLength && declaredLength > 1024)) {
      throw new MediaSecurityError('MEDIA_SCAN_UNAVAILABLE', 503, 'Photo safety checking is temporarily unavailable. Please try again shortly.');
    }
    const responseBytes = new Uint8Array(await response.arrayBuffer());
    if (responseBytes.length < 1 || responseBytes.length > 1024) {
      throw new MediaSecurityError('MEDIA_SCAN_UNAVAILABLE', 503, 'Photo safety checking is temporarily unavailable. Please try again shortly.');
    }
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(responseBytes));
    } catch {
      payload = null;
    }
    if (!validCloudmersiveResponse(payload)) {
      throw new MediaSecurityError('MEDIA_SCAN_UNAVAILABLE', 503, 'Photo safety checking is temporarily unavailable. Please try again shortly.');
    }
    if (!payload.CleanResult) {
      throw new MediaSecurityError('MEDIA_SCAN_INFECTED', 422, 'This photo did not pass the safety check. Choose a different image.');
    }
  } catch (error) {
    if (error instanceof MediaSecurityError) throw error;
    throw new MediaSecurityError('MEDIA_SCAN_UNAVAILABLE', 503, 'Photo safety checking is temporarily unavailable. Please try again shortly.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function sanitizeImage(bytes: Uint8Array, declaredMimeType: string) {
  if (bytes.length < 1 || bytes.length > MEDIA_MAX_SOURCE_BYTES) {
    throw new MediaSecurityError('MEDIA_INVALID_IMAGE', 413, 'Choose an image smaller than 5 MB.');
  }
  const detectedMimeType = detectImageMimeType(bytes);
  const normalizedDeclared = declaredMimeType === 'image/jpg' ? 'image/jpeg' : declaredMimeType;
  if (!detectedMimeType || detectedMimeType !== normalizedDeclared) {
    throw new MediaSecurityError('MEDIA_INVALID_IMAGE', 415, 'The selected file is not a valid supported image.');
  }

  try {
    const decoded = detectedMimeType === 'image/heic' || detectedMimeType === 'image/heif'
      ? Buffer.from(await convert({ buffer: bytes, format: 'JPEG', quality: 0.9 }))
      : Buffer.from(bytes);
    const metadata = await sharp(decoded, {
      animated: false,
      failOn: 'warning',
      limitInputPixels: MEDIA_MAX_PIXELS,
    }).metadata();
    if (
      !metadata.width
      || !metadata.height
      || metadata.width > MEDIA_MAX_DIMENSION
      || metadata.height > MEDIA_MAX_DIMENSION
      || metadata.width * metadata.height > MEDIA_MAX_PIXELS
      || (metadata.pages ?? 1) !== 1
    ) {
      throw new MediaSecurityError('MEDIA_INVALID_IMAGE', 415, 'The selected image cannot be processed safely.');
    }
    const output = await sharp(decoded, {
      animated: false,
      failOn: 'warning',
      limitInputPixels: MEDIA_MAX_PIXELS,
    })
      .rotate()
      .resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    if (output.length < 1 || output.length > MEDIA_MAX_OUTPUT_BYTES) {
      throw new MediaSecurityError('MEDIA_INVALID_IMAGE', 413, 'The selected image cannot be processed within the 5 MB limit.');
    }
    return {
      bytes: new Uint8Array(output),
      contentType: 'image/jpeg' as const,
      sha256: createHash('sha256').update(output).digest('hex'),
    };
  } catch (error) {
    if (error instanceof MediaSecurityError) throw error;
    throw new MediaSecurityError('MEDIA_INVALID_IMAGE', 415, 'The selected file is not a valid supported image.');
  }
}
