import 'server-only';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { list } from './model';

const execute = promisify(execFile);

// Reuse the owner's existing read-scoped SEO Google connection locally. OAuth
// refresh credentials stay in its credential store, never in this app or Git.
export function localGoogleEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.ADMIN_ANALYTICS_GOOGLE_LOCAL_CLI === 'true';
}

export async function localGoogleReports(kind: 'ga' | 'gsc', bodies: unknown[]): Promise<unknown[]> {
  if (!localGoogleEnabled()) throw new Error('Local Google connection disabled');
  if (bodies.length !== 3) throw new Error('Invalid report group');
  const script = resolve(process.cwd(), '../../scripts/owner-analytics-google-live.mjs');
  let stdout: string;
  try { ({ stdout } = await execute(process.execPath, [script, kind, JSON.stringify(bodies)], { timeout: 30_000, maxBuffer: 2_000_000 })); }
  catch (error) {
    const stderr = typeof (error as { stderr?: unknown }).stderr === 'string' ? (error as { stderr: string }).stderr : '';
    const diagnostic = stderr.match(/\((?:ga|gsc):[0-2]:(?:HTTP\d{3}|network)\)/)?.[0] ?? '(connection unavailable)';
    console.warn(`Owner analytics Google ${kind} ${diagnostic}`);
    throw new Error('Google reports unavailable');
  }
  const results = list(JSON.parse(stdout));
  if (results.length !== 3) throw new Error('Incomplete Google report group');
  return results;
}
