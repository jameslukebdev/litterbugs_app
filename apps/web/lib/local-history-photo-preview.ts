import 'server-only';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { headers } from 'next/headers';

function loopback(host: string | null) {
  if (!host) return false;
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${host}`).hostname); }
  catch { return false; }
}

/** Local review copies only. Caller must recheck anonymous report visibility first. */
export async function loadLocalHistoryPhotoPreview(reportId: string, sourcePath: string, width: 640 | 1080) {
  const directory = process.env.LITTERBUGS_LOCAL_HISTORY_PHOTO_DIR;
  if (process.env.NODE_ENV !== 'development' || process.env.VERCEL === '1'
    || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'development')
    || (process.env.LITTERBUGS_DEPLOYMENT_ENV && process.env.LITTERBUGS_DEPLOYMENT_ENV !== 'development')
    || !directory || !isAbsolute(directory)
    || !/^[0-9a-f-]{36}$/i.test(reportId) || !sourcePath || ![640, 1080].includes(width)) return null;
  try {
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get('x-forwarded-host');
    if (!loopback(requestHeaders.get('host')) || (forwarded && !loopback(forwarded))) return null;
    const key = createHash('sha256').update(`${reportId}\n${sourcePath}`).digest('hex');
    const bytes = await readFile(join(directory, `${key}-${width}.jpg`));
    if (bytes.length > 1_400_000 || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    return bytes;
  } catch { return null; }
}
