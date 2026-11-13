// Validate the migration and admin/MFA/quota gates in a rollback-only transaction.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
if (process.argv[2] !== '--linked' || (await readFile(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8')).trim() !== 'mvaygkflcjswtwchflrk') throw new Error('Expected linked Litterbugs project');
const migration = process.argv.includes('--existing') ? '' : await readFile(new URL('../supabase/migrations/20261113191709_owner_analytics_hosted_connections.sql', import.meta.url), 'utf8');
const checks = await readFile(new URL('./fixtures/owner-analytics-hosted.sql', import.meta.url), 'utf8');
const directory = await mkdtemp(join(tmpdir(), 'litterbugs-hosted-check-'));
try {
 const file = join(directory, 'check.sql');
 await writeFile(file, `begin;\n${migration}\n${checks}\nrollback;`, { mode: 0o600 });
 await promisify(execFile)('supabase', ['db','query','--linked','--file',file,'--output','json'], { timeout: 30_000, maxBuffer: 256_000 });
 process.stdout.write('Hosted analytics SQL: admin/MFA gates, private aggregates, one-use leases, shared cooldown and daily budget passed; transaction rolled back.\n');
} finally { await rm(directory, { recursive: true, force: true }); }
