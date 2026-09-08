import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const fundingSource = readFileSync(new URL('./funding.js', import.meta.url), 'utf8');
const historySource = readFileSync(new URL('../ContributionHistoryScreen.js', import.meta.url), 'utf8');
const contributionScreenSource = readFileSync(new URL('../FundingContributionScreen.js', import.meta.url), 'utf8');

describe('completed cleanup contribution history', () => {
  it('loads only successful contributions attached to completed reports', () => {
    expect(fundingSource).toContain("report:reports!inner(id,title,cleanup_state,funding_eligibility)");
    expect(fundingSource).toContain(".eq('report.cleanup_state', 'completed')");
    expect(fundingSource).toContain(".in('status', ['succeeded', 'paid_out'])");
  });

  it('does not present abandoned attempts as contribution history', () => {
    expect(historySource).not.toContain("payment_pending: 'Processing'");
    expect(historySource).not.toContain("failed: 'Not completed'");
    expect(historySource).toContain('No completed cleanup contributions yet');
  });

  it('clearly explains that contributions are charged before cleaner payout', () => {
    expect(contributionScreenSource).toContain('Stripe charges your selected payment method when you confirm');
    expect(contributionScreenSource).toContain('pays the cleaner only after an approved cleanup');
  });
});
