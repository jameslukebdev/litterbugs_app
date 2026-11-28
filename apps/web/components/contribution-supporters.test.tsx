// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ContributionSupporters, refreshContributionSupporters } from './contribution-supporters';
import { ReportTimeline } from '@/app/reports/[id]/report-timeline';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';

const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/load-contributor-credits', () => ({ loadContributorCredits: load }));
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });
const credit = (name: string | null) => ({ report_id: 'report', names: name ? [name] : [], anonymous_count: name ? 0 : 1,
  donations: [{ name, amountCents: 500, donatedAt: '2026-11-19T16:00:00Z' }] });

it('updates donor details and the timeline together after a local change and a change from another tab', async () => {
  const initial = credit('Donor');
  const report = { id: 'report', reportDate: '2026-11-18T16:00:00Z', state: 'available', contributorCredit: initial } as PublicReportShareModel;
  render(<><ContributionSupporters reportId="report" initialCredit={initial} /><ReportTimeline report={report} /></>);
  expect(screen.getByText('$5.00 donated by Donor')).toBeTruthy();
  expect(load).not.toHaveBeenCalled(); // Initial content is already included in the report.
  load.mockResolvedValue([credit(null)]);
  refreshContributionSupporters('report');
  await screen.findByText('$5.00 donated anonymously');
  expect(screen.queryByText('Donor')).toBeNull();
  expect(screen.getByText('Anonymous')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1); // Both surfaces share the same request.
  load.mockResolvedValue([credit('Donor')]);
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'litterbugs:contributor-credit-changed', newValue: JSON.stringify({ reportId: 'report' }),
  }));
  await screen.findByText('$5.00 donated by Donor');
  await waitFor(() => expect(screen.queryByText('Anonymous')).toBeNull());
});
