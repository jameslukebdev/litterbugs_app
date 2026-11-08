import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Bug icons for generated social cards, as data URLs (the image renderer can't fetch site files itself). */
const FILES = {
  ladybug: 'public/brand/bugs/ladybug.png',
  caterpillar: 'public/brand/ranks/caterpillar.svg',
  flower: 'public/brand/bugs/flower.png',
} as const;
export type SocialCardBug = keyof typeof FILES;

let bugData: Promise<Record<SocialCardBug, string>> | undefined;
export function loadSocialCardBugs() {
  bugData ??= Promise.all(Object.entries(FILES).map(async ([name, file]) =>
    [name, `data:image/${file.endsWith('.svg') ? 'svg+xml' : 'png'};base64,${(await readFile(path.join(process.cwd(), file))).toString('base64')}`] as const))
    .then(entries => Object.fromEntries(entries) as Record<SocialCardBug, string>)
    .catch(error => { bugData = undefined; throw error; });
  return bugData;
}
