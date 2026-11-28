'use client';

import { useEffect, useState } from 'react';
import { loadContributorCredits } from '@/lib/load-contributor-credits';
import { formatUsd } from '@/lib/funding';
import { donationTimeAgo, type DonorContribution, type ContributorCredit } from '@/lib/contributor-credit';
import styles from './contribution-supporters.module.css';
import { notifyDataChanged } from '@/lib/use-data-refresh';

const creditChanged = 'litterbugs:contributor-credit-changed';
type Credit = ContributorCredit;
const queued = new Map<string, ((row?: Credit) => void)[]>();

async function loadCredits(requests: [string, ((row?: Credit) => void)[]][]) {
  const rows = await loadContributorCredits(requests.map(([id]) => id));
  const credits = new Map(rows.map(row => [row.report_id, row]));
  for (const [id, resolve] of requests) resolve.forEach(callback => callback(credits.get(id)));
}

function creditFor(reportId: string) {
  return new Promise<Credit | undefined>(resolve => {
    if (queued.size === 0) queueMicrotask(() => {
      const batch = [...queued];
      queued.clear();
      for (let i = 0; i < batch.length; i += 100) void loadCredits(batch.slice(i, i + 100));
    });
    const requests = queued.get(reportId) ?? [];
    requests.push(resolve);
    queued.set(reportId, requests);
  });
}

export function refreshContributionSupporters(reportId: string) {
  window.dispatchEvent(new CustomEvent(creditChanged, { detail: reportId }));
  notifyDataChanged();
  try { localStorage.setItem(creditChanged, JSON.stringify({ reportId, revision: crypto.randomUUID() })); } catch { /* Same-page refresh still works without storage. */ }
}

export function ContributionSupporterCredit({ names, anonymousCount, donations, compact = false }: {
  names: string[]; anonymousCount: number; donations?: DonorContribution[]; compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const rows = donations?.length ? donations : [
    ...names.map(name => ({ name, amountCents: 0, donatedAt: '' })),
    ...Array.from({ length: anonymousCount }, () => ({ name: null, amountCents: 0, donatedAt: '' })),
  ];
  if (!rows.length) return null;
  const limit = compact ? 2 : 3;
  const visible = expanded ? rows : rows.slice(0, limit);
  const remaining = rows.length - visible.length;
  const entries = visible.map((donation, index) => {
    const name = donation.name || 'Anonymous';
    return <span className={styles.donation} key={index}>
      {!compact && <span className={styles.avatar} aria-hidden="true">{donation.name ? name.charAt(0).toUpperCase() : 'A'}</span>}
      <span className={styles.donorCopy}>
        <span className={styles.name}>{name}</span>
        {donation.amountCents > 0 && <span className={styles.meta}>
          <span className={styles.amount}>{formatUsd(donation.amountCents)}</span>
          {donation.donatedAt && <><span aria-hidden="true">·</span><time suppressHydrationWarning dateTime={donation.donatedAt} title={`${new Date(donation.donatedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC`}>{donationTimeAgo(donation.donatedAt, now)}</time></>}
        </span>}
      </span>
    </span>;
  });
  if (compact) return <span className={styles.card}>
    <span className={styles.donations}>{entries}</span>
    {remaining > 0 && <span className={styles.more}>+{remaining} more {remaining === 1 ? 'donation' : 'donations'}</span>}
  </span>;

  return <section className={styles.supporters} aria-label="Cleanup funders">
    <div className={styles.donations}>{entries}</div>
    {rows.length > limit && <button type="button" className={styles.moreButton} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
      {expanded ? 'Show fewer donations' : `See all ${rows.length} donations`}
    </button>}
  </section>;
}

export function useContributionCredit(reportId: string, initialCredit?: ContributorCredit | null) {
  const [updated, setUpdated] = useState<{ credit: Credit | null; initial: Credit | null | undefined }>();
  useEffect(() => {
    let current = 0;
    function load() {
      const request = ++current;
      void creditFor(reportId).then(row => { if (current === request) setUpdated({ credit: row ?? null, initial: initialCredit }); });
    }
    function update(event: Event) {
      if ((event as CustomEvent<string>).detail === reportId) load();
    }
    function sync(event: StorageEvent) {
      if (event.key !== creditChanged || !event.newValue) return;
      try { if (JSON.parse(event.newValue).reportId === reportId) load(); } catch { /* Ignore unrelated or invalid storage messages. */ }
    }
    if (initialCredit === undefined) load();
    window.addEventListener(creditChanged, update);
    window.addEventListener('focus', load);
    window.addEventListener('storage', sync);
    return () => {
      current++;
      window.removeEventListener(creditChanged, update);
      window.removeEventListener('focus', load);
      window.removeEventListener('storage', sync);
    };
  }, [reportId, initialCredit]);
  const resolved = updated && updated.initial === initialCredit ? updated.credit : initialCredit;
  return resolved?.report_id === reportId ? resolved : null;
}

export function ContributionSupporters({ reportId, initialCredit, compact = false }: { reportId: string; initialCredit?: ContributorCredit | null; compact?: boolean }) {
  const resolved = useContributionCredit(reportId, initialCredit);
  if (resolved?.report_id !== reportId) return null;
  return <ContributionSupporterCredit names={resolved.names} anonymousCount={resolved.anonymous_count} donations={resolved.donations} compact={compact} />;
}
