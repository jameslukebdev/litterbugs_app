import 'server-only';

import convert from 'heic-convert';
import sharp from 'sharp';

import { isHeicReportPhoto } from '@/lib/report-photo';
import { loadDisplayPhoto, PhotoSourceError } from '@/lib/display-photo-cache';

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

type PhotoStorageClient = {
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{
        data: Blob | null;
        error: unknown;
      }>;
    };
  };
};

export async function loadSocialCardPhoto(
  supabase: PhotoStorageClient,
  bucket: 'report_photos' | 'cleanup_photos',
  path: string | null | undefined,
  width: 640 | 1080 = 1080,
) {
  if (!path) return null;

  try {
    return await loadDisplayPhoto(bucket, path, width === 640 ? 'social-640' : 'social-1080', async () => {
      const { data: source, error } = await supabase.storage.from(bucket).download(path);
      if (error || !source) throw new PhotoSourceError(404, 'Photo not found.');
      if (source.size > MAX_SOURCE_BYTES) throw new PhotoSourceError(413, 'Photo is too large.');

      const sourceBytes = new Uint8Array(await source.arrayBuffer());
      const browserImage = isHeicReportPhoto(path)
        ? Buffer.from(await convert({
          buffer: sourceBytes,
          format: 'JPEG',
          quality: 0.82,
        }))
        : Buffer.from(sourceBytes);
      const cardImage = await sharp(browserImage)
        .rotate()
        .resize({
          width,
          height: width,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: width === 640 ? 75 : 82, mozjpeg: true })
        .toBuffer();

      return cardImage;
    });
  } catch {
    return null;
  }
}

export async function embedSocialCardPhoto(
  supabase: PhotoStorageClient,
  bucket: 'report_photos' | 'cleanup_photos',
  path: string | null | undefined,
) {
  const image = await loadSocialCardPhoto(supabase, bucket, path);
  return image ? `data:image/jpeg;base64,${image.toString('base64')}` : null;
}
