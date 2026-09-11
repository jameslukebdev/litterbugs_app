import { readFile } from 'node:fs/promises';
import path from 'node:path';

let logoData: Promise<string> | undefined;

export function loadSocialCardLogo() {
  logoData ??= readFile(path.join(process.cwd(), 'public/brand/litterbugs-logo.png'))
    .then(data => `data:image/png;base64,${data.toString('base64')}`)
    .catch(error => {
      logoData = undefined;
      throw error;
    });
  return logoData;
}
