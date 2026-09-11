import { readFile } from 'node:fs/promises';
import path from 'node:path';

let fontFiles: Promise<[Buffer, Buffer]> | undefined;

export async function loadSocialCardFonts() {
  fontFiles ??= Promise.all([
    readFile(path.join(process.cwd(), 'public/fonts/Inter-Regular.ttf')),
    readFile(path.join(process.cwd(), 'public/fonts/Inter-Bold.ttf')),
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
