import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ContributorCredit } from './contributor-credit';

export type LocalDonation = {
  id: string; reportId: string; contributorId: string | null;
  name: string | null; amountCents: number; donatedAt: string; showName: boolean;
};
const directory = () => join(tmpdir(), 'litterbugs-contributor-credits');
type Choices = Record<string, boolean>;
let pendingWrite = Promise.resolve();

export function localContributionRequest(request: Request, env = process.env) {
  const url = new URL(request.url);
  const local = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
  const forwarded = request.headers.get('x-forwarded-host');
  if (env.NODE_ENV !== 'development' || env.VERCEL || !local(url.hostname)
    || request.headers.get('host') !== url.host
    || (forwarded && forwarded !== url.host)) return 404;
  if (request.headers.get('origin') !== url.origin) return 403;
  return null;
}

export async function readLocalNameChoices(): Promise<Choices> {
  try { return JSON.parse(await readFile(join(directory(), 'name-choices.json'), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw error; }
}

/** Only the authenticated owner route calls this. Local choices never write to Supabase. */
export async function writeLocalNameChoice(id: string, shown: boolean) {
  const write = pendingWrite.then(async () => {
    const choices = await readLocalNameChoices();
    choices[id] = shown;
    await mkdir(directory(), { recursive: true, mode: 0o700 });
    const temporary = join(directory(), `name-choices-${crypto.randomUUID()}.json`);
    await writeFile(temporary, JSON.stringify(choices), { mode: 0o600 });
    await rename(temporary, join(directory(), 'name-choices.json'));
  });
  pendingWrite = write.catch(() => undefined);
  await write;
}

export function localDonationCredits(donations: LocalDonation[], choices: Choices): ContributorCredit[] {
  const reports = new Map<string, ContributorCredit>();
  for (const donation of [...donations].sort((a, b) => Date.parse(b.donatedAt) - Date.parse(a.donatedAt) || a.id.localeCompare(b.id))) {
    const credit = reports.get(donation.reportId) ?? { report_id: donation.reportId, names: [], anonymous_count: 0, donations: [] };
    const name = (choices[donation.id] ?? donation.showName) ? donation.name : null;
    if (name && !credit.names.includes(name)) credit.names.push(name);
    if (!name) credit.anonymous_count++;
    credit.donations!.push({ name, amountCents: donation.amountCents, donatedAt: donation.donatedAt });
    reports.set(donation.reportId, credit);
  }
  return [...reports.values()].map(credit => ({ ...credit, names: credit.names.sort() }));
}

export async function readLocalDonationCredits() {
  const donations: LocalDonation[] = JSON.parse(await readFile(join(directory(), 'donations.json'), 'utf8'));
  return localDonationCredits(donations, await readLocalNameChoices());
}
