import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mapScreenSource = readFileSync(new URL('../MapScreen.js', import.meta.url), 'utf8');
const payoutSetupSource = readFileSync(new URL('../PayoutSetupScreen.js', import.meta.url), 'utf8');
const contributionFunctionSource = readFileSync(
  new URL('../../../supabase/functions/create-cleanup-contribution/index.ts', import.meta.url),
  'utf8',
);
const claimMigrationSource = readFileSync(
  new URL('../../../supabase/migrations/20260907162230_require_stripe_only_for_funded_cleanup_claims.sql', import.meta.url),
  'utf8',
);

describe('Stripe-gated cleanup workflows', () => {
  it('sends payers directly to Stripe PaymentSheet without payout onboarding', () => {
    expect(mapScreenSource).not.toContain('PAYOUT_WORKFLOW_KIND.FUNDED_REPORT');
    expect(mapScreenSource).not.toContain('PAYOUT_WORKFLOW_KIND.REPORT_CONTRIBUTION');
    expect(mapScreenSource).toContain("navigation.getParent()?.navigate('FundingContribution', { reportId });");
    expect(contributionFunctionSource).not.toContain('.from("cleaner_payout_accounts")');
  });

  it('checks payout setup only before funded cleanup claims', () => {
    expect(mapScreenSource).toContain('kind: PAYOUT_WORKFLOW_KIND.CLEANUP_CLAIM');
    expect(mapScreenSource).toContain('cleanupClaimRequiresPayoutSetup(report)');
  });

  it('returns only after Stripe confirms payouts are enabled', () => {
    expect(payoutSetupSource).toContain("status?.payoutsEnabled !== true");
    expect(payoutSetupSource).toContain('markPayoutWorkflowReady(workflowToken);');
    expect(payoutSetupSource).toContain('cancelPayoutWorkflow(workflowToken);');
    expect(payoutSetupSource).toContain("'Stripe connected'");
    expect(payoutSetupSource).toContain("'Continue to cleanup'");
  });

  it('enforces the funded-claim gate in the backend', () => {
    expect(claimMigrationSource).toContain('cleanup_claim_requires_payout_ready');
    expect(claimMigrationSource).toContain('coalesce(report.funded_amount_cents, 0) > 0');
    expect(claimMigrationSource).toContain("message = 'cleaner_payout_onboarding_required'");
  });
});
