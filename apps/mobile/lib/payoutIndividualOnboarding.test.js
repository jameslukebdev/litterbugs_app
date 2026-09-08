import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const onboardingFunctionSource = readFileSync(
  new URL('../../../supabase/functions/create-cleaner-onboarding-link/index.ts', import.meta.url),
  'utf8',
);
const fundedCleanupSource = readFileSync(
  new URL('../../../supabase/functions/_shared/funded-cleanup.ts', import.meta.url),
  'utf8',
);
const payoutScreenSource = readFileSync(new URL('../PayoutSetupScreen.js', import.meta.url), 'utf8');

describe('individual Stripe payout onboarding', () => {
  it('creates new recipient accounts as individuals', () => {
    expect(onboardingFunctionSource).toContain('entity_type: "individual"');
    expect(onboardingFunctionSource).toContain('litterbugs-cleaner-individual-');
    expect(onboardingFunctionSource).toContain('business_url: "https://litterbugs.app/cleanup-policy"');
    expect(onboardingFunctionSource).toContain('Individual litter cleanup services');
  });

  it('prefills unfinished individual onboarding before issuing a new link', () => {
    expect(onboardingFunctionSource).toContain('configureStripeRecipientAsIndividual');
    expect(onboardingFunctionSource).toContain('if (mode === "link")');
    expect(onboardingFunctionSource).not.toContain('account.identity?.entity_type !== "individual"');
    expect(fundedCleanupSource).toContain('business_url: "https://litterbugs.app/cleanup-policy"');
    expect(fundedCleanupSource).toContain('fields: "currently_due", future_requirements: "omit"');
    expect(fundedCleanupSource).not.toContain('fields: "eventually_due", future_requirements: "include"');
  });

  it('tells cleaners that no business is required', () => {
    expect(payoutScreenSource).toContain('No business or LLC is required.');
    expect(payoutScreenSource).toContain('individual Stripe payout profile');
  });
});
