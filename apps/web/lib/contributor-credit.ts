export type DonorContribution = {
  name: string | null;
  amountCents: number;
  donatedAt: string;
};

export type ContributorCredit = {
  report_id: string;
  names: string[];
  anonymous_count: number;
  donations?: DonorContribution[];
};

export type WithContributorCredit<T> = T & { contributorCredit?: ContributorCredit | null };

export async function withContributorCredits<T extends { id: string }>(reports: T[], load: (ids: string[]) => Promise<ContributorCredit[]>): Promise<WithContributorCredit<T>[]> {
  const pending = reports.filter(report => (report as WithContributorCredit<T>).contributorCredit === undefined);
  const credits = new Map<string, ContributorCredit>();
  const batches: Promise<ContributorCredit[]>[] = [];
  for (let offset = 0; offset < pending.length; offset += 100) {
    batches.push(load(pending.slice(offset, offset + 100).map(report => report.id)));
  }
  for (const rows of await Promise.all(batches)) for (const row of rows) credits.set(row.report_id, row);
  return reports.map(report => {
    const existing = (report as WithContributorCredit<T>).contributorCredit;
    return { ...report, contributorCredit: existing === undefined ? credits.get(report.id) ?? null : existing };
  });
}

export function donationTimeAgo(donatedAt: string, now: number) {
  const elapsed = Math.max(0, now - Date.parse(donatedAt));
  if (!Number.isFinite(elapsed)) return '';
  if (elapsed < 60_000) return 'Just now';
  const relative = new Intl.RelativeTimeFormat('en-US', { numeric: 'always' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 86_400_000], ['month', 30 * 86_400_000], ['day', 86_400_000],
    ['hour', 3_600_000], ['minute', 60_000],
  ];
  const [unit, size] = units.find(([, size]) => elapsed >= size)!;
  return relative.format(-Math.floor(elapsed / size), unit);
}
