// Read-only export for loopback development previews. Credentials stay in this
// process; neither source files nor credentials are written into the web app.
// Run: node --experimental-strip-types scripts/prepare-history-photo-preview.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import convert from 'heic-convert';
import { isExpiredPublicReport, isPubliclyShareableReport } from '../apps/web/lib/public-report-share-model.ts';

const project = 'mvaygkflcjswtwchflrk';
let keys;
try {
  keys = JSON.parse(execFileSync('supabase', ['projects', 'api-keys', '--project-ref', project, '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
} catch { throw new Error('Could not retrieve the configured project credentials; response withheld.'); }
const anon = keys.find(key => key.name === 'anon')?.api_key;
const privileged = keys.find(key => key.name === 'service_role')?.api_key;
if (!anon || !privileged) throw new Error('The configured project credentials were unavailable.');
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const url = `https://${project}.supabase.co`;
const publicClient = createClient(url, anon, options);
const storageReader = createClient(url, privileged, options);
const directory = join(homedir(), '.codex', 'local-previews', 'litterbugs-expired-photos');
await mkdir(directory, { recursive: true, mode: 0o700 });
let prepared = 0;
for (let offset = 0;; offset += 200) {
  const { data, error } = await publicClient.from('reports')
    .select('id,title,cleanup_state,cancelled_at,expired_at,expires_at,renewal_status,is_sample,is_published,photo_paths')
    .eq('cleanup_state', 'available').eq('is_published', true).eq('is_sample', false)
    .or(`expired_at.not.is.null,expires_at.lte.${new Date().toISOString()}`)
    .order('id').range(offset, offset + 199);
  if (error) throw new Error('Could not verify public report visibility.');
  for (const report of data) {
    if (!isPubliclyShareableReport(report) || !isExpiredPublicReport(report)) continue;
    const path = report.photo_paths?.[0];
    if (!path) continue;
    const { data: image, error: imageError } = await storageReader.storage.from('report_photos').download(path);
    if (imageError || !image) throw new Error(`Could not read original photo for report ${report.id}.`);
    if (image.size > 25 * 1024 * 1024) throw new Error('Photo exceeds the display processing limit.');
    let source = Buffer.from(await image.arrayBuffer());
    if (/\.hei[cf]$/i.test(path)) source = Buffer.from(await convert({ buffer: source, format: 'JPEG', quality: 0.82 }));
    const key = createHash('sha256').update(`${report.id}\n${path}`).digest('hex');
    for (const width of [640, 1080]) {
      const bytes = await sharp(source).rotate().resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: width === 640 ? 75 : 82, mozjpeg: true }).toBuffer();
      if (bytes.length > 1_400_000) throw new Error('Preview copy exceeds the display limit.');
      await writeFile(join(directory, `${key}-${width}.jpg`), bytes, { mode: 0o600 });
    }
    prepared++;
  }
  if (data.length < 200) break;
}
console.log(`Prepared local photo variants for ${prepared} expired report(s).`);
console.log(`Local preview directory: ${directory}`);
