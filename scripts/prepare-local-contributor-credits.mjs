// Read-only export for a local website review. Credentials stay in this process.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createClient } from '@supabase/supabase-js';

const project = 'mvaygkflcjswtwchflrk';
const keys = JSON.parse(execFileSync('supabase', [
  'projects', 'api-keys', '--project-ref', project, '--output', 'json',
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, DO_NOT_TRACK: '1' } }));
const key = keys.find(item => item.name === 'service_role')?.api_key;
if (!key) throw new Error('The donor lookup credential is unavailable.');
const client = createClient(`https://${project}.supabase.co`, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let visibilityAvailable = true;
const visibility = await client.from('cleanup_contributions').select('show_contributor_name').limit(0);
if (visibility.error) {
  if (visibility.error.code === '42703' || visibility.error.code === 'PGRST204') visibilityAvailable = false;
  else throw new Error('Couldn’t check the donation name setting.');
}
const credits = new Map();
const donations = [];
for (let offset = 0;; offset += 500) {
  const fields = `id,report_id,contributor_id,principal_amount_cents,succeeded_at${visibilityAvailable ? ',show_contributor_name' : ''}`;
  const { data, error } = await client.from('cleanup_contributions').select(fields)
    .in('status', ['succeeded', 'paid_out']).is('refunded_at', null)
    .order('id').range(offset, offset + 499);
  if (error) throw new Error('Couldn’t read the completed donations.');
  const ids = [...new Set(data.map(row => row.contributor_id).filter(Boolean))];
  const names = new Map();
  for (let index = 0; index < ids.length; index += 100) {
    const profiles = await client.from('profiles').select('id,display_name,username').in('id', ids.slice(index, index + 100));
    if (profiles.error) throw new Error('Couldn’t read donor profile names.');
    for (const profile of profiles.data) names.set(profile.id, profile.display_name?.trim() || profile.username?.trim());
  }
  for (const row of data) {
    donations.push({ id: row.id, reportId: row.report_id, contributorId: row.contributor_id,
      name: names.get(row.contributor_id) || null, amountCents: row.principal_amount_cents,
      donatedAt: row.succeeded_at, showName: row.show_contributor_name !== false });
    const credit = credits.get(row.report_id) ?? { names: new Set(), anonymous_count: 0, donations: [] };
    if (row.show_contributor_name === false) credit.anonymous_count++;
    else if (names.get(row.contributor_id)) credit.names.add(names.get(row.contributor_id));
    credit.donations.push({
      name: row.show_contributor_name === false ? null : names.get(row.contributor_id) || null,
      amountCents: row.principal_amount_cents,
      donatedAt: row.succeeded_at,
    });
    credits.set(row.report_id, credit);
  }
  if (data.length < 500) break;
}
const rows = [...credits].map(([report_id, credit]) => ({
  report_id, names: [...credit.names].sort(), anonymous_count: credit.anonymous_count,
  donations: credit.donations.sort((a, b) => Date.parse(b.donatedAt) - Date.parse(a.donatedAt)),
}));
const directory = join(tmpdir(), 'litterbugs-contributor-credits');
await mkdir(directory, { recursive: true, mode: 0o700 });
await writeFile(join(directory, 'credits.json'), JSON.stringify(rows), { mode: 0o600 });
await writeFile(join(directory, 'donations.json'), JSON.stringify(donations), { mode: 0o600 });
console.log(`Prepared donor names for ${rows.length} reports on the local website.`);
