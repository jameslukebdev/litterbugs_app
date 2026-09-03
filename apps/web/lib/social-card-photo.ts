import 'server-only';

import convert from 'heic-convert';
import sharp from 'sharp';

import { isHeicReportPhoto } from '@/lib/report-photo';

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

export async function embedSocialCardPhoto(
  supabase: PhotoStorageClient,
  bucket: 'report_photos' | 'cleanup_photos',
  path: string | null | undefined,
) {
  if (!path) return null;

  try {
    const { data: source, error } = await supabase.storage.from(bucket).download(path);
    if (error || !source || source.size > MAX_SOURCE_BYTES) return null;

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
        width: 720,
        height: 720,
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: true,
      })
      .webp({ quality: 78 })
      .toBuffer();

    return `data:image/webp;base64,${cardImage.toString('base64')}`;
  } catch {
    return null;
  }
}
