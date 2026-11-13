// Read-only SQL regression check. CTE fixtures replace all application/auth
// tables, so this never creates test users, reports, payments or database rows.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mode = process.argv[2];
if (mode !== '--linked' && mode !== '--local') throw new Error('Choose --local or --linked for the read-only fixture query');
if (mode === '--linked' && (await readFile(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8')).trim() !== 'mvaygkflcjswtwchflrk') throw new Error('Unexpected linked project');
const source = await readFile(new URL('./owner-analytics-business.sql', import.meta.url), 'utf8');
const body = source.replace(/--[^\n]*/g, '');
if (/\b(insert|update|delete|create|alter|drop|truncate|grant|revoke)\b/i.test(body) || !body.trimStart().startsWith('with review_accounts as (')) throw new Error('Expected the reviewed read-only query');
const fixtures = await readFile(new URL('./fixtures/owner-analytics-business.sql', import.meta.url), 'utf8');
const query = source.replaceAll('auth.users', 'fixture_users').replaceAll('public.reports', 'fixture_reports').replaceAll('public.cleanup_attempts', 'fixture_attempts').replaceAll('public.cleanup_submissions', 'fixture_submissions').replaceAll('public.cleanup_contributions', 'fixture_contributions').replace('with review_accounts as (', fixtures.trimEnd());
const directory = await mkdtemp(join(tmpdir(), 'litterbugs-business-check-'));
try {
  const file = join(directory, 'query.sql');
  await writeFile(file, query, { mode: 0o600 });
  const { stdout } = await promisify(execFile)('supabase', ['db', 'query', mode, '--file', file, '--output', 'json'], { timeout: 20_000, maxBuffer: 256_000 });
  const rows = JSON.parse(stdout).rows;
  if (!Array.isArray(rows) || rows.length !== 2) throw new Error('Expected both reporting periods');
  for (const row of rows) {
    if (row.period !== 7 && row.period !== 28) throw new Error('Unexpected reporting period');
    const data = row.data;
    const expected = { newReports: 2, completedCleanups: 1, fundedCents: row.period === 7 ? 600 : 1300, refundedCents: 100, contributors: 2, awaitingCleanup: 2, fundedWaiting: 1, pounds: 3, bags: 1, hours: 0.5 };
    for (const [key, value] of Object.entries(expected)) if (data[key] !== value) throw new Error(`${row.period}-day ${key} did not match the fixture`);
    if (data.daily.reduce((sum, d) => sum + d.reports, 0) !== data.newReports || data.daily.reduce((sum, d) => sum + d.cleanups, 0) !== data.completedCleanups) throw new Error('Daily counts did not reconcile');
    if (data.previous.fundedCents !== (row.period === 7 ? 700 : 0)) throw new Error('Previous-period funding boundary failed');
  }
  console.log('Both periods pass: reviewer exclusions, genuine refunds, late-evening activity and previous-period funding. No database writes.');
} finally { await rm(directory, { recursive: true, force: true }); }
