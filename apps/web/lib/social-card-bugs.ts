import { readCloudflareAsset, usesCloudflareImages } from '@/lib/cloudflare-images';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Bug icons for generated social cards, as data URLs (the image renderer can't fetch site files itself). */
// Literal paths prevent tracing the whole checkout into the Worker bundle.
const FILES = {
  ladybug: () => readFile(path.join(process.cwd(), 'public/brand/bugs/ladybug.png')),
  caterpillar: () => readFile(path.join(process.cwd(), 'public/brand/ranks/caterpillar.svg')),
  flower: () => readFile(path.join(process.cwd(), 'public/brand/bugs/flower.png')),
} as const;
export type SocialCardBug = keyof typeof FILES;

async function loadBug(name: SocialCardBug, load: () => Promise<Buffer>) {
  if (!usesCloudflareImages()) return load();
  const url = name === 'caterpillar' ? '/brand/ranks/caterpillar.svg' : `/brand/bugs/${name}.png`;
  return readCloudflareAsset(url);
}

let bugData: Promise<Record<SocialCardBug, string>> | undefined;
export function loadSocialCardBugs() {
  bugData ??= Promise.all(Object.entries(FILES).map(async ([name, load]) =>
    [name, `data:image/${name === 'caterpillar' ? 'svg+xml' : 'png'};base64,${(await loadBug(name as SocialCardBug, load)).toString('base64')}`] as const))
    .then(entries => Object.fromEntries(entries) as Record<SocialCardBug, string>)
    .catch(error => { bugData = undefined; throw error; });
  return bugData;
}
