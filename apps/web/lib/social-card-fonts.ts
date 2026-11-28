import { readCloudflareAsset, usesCloudflareImages } from '@/lib/cloudflare-images';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

let fontFiles: Promise<[Buffer, Buffer]> | undefined;

export async function loadSocialCardFonts() {
  fontFiles ??= Promise.all([
    usesCloudflareImages() ? readCloudflareAsset('/fonts/Inter-Regular.ttf') : readFile(path.join(process.cwd(), 'public/fonts/Inter-Regular.ttf')),
    usesCloudflareImages() ? readCloudflareAsset('/fonts/Inter-Bold.ttf') : readFile(path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf')),
  ]).catch(error => {
    fontFiles = undefined;
    throw error;
  });
  const [regular, bold] = await fontFiles;
  return [
    { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: bold, weight: 700 as const, style: 'normal' as const },
  ];
}
