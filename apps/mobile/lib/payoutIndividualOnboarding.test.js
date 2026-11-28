import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Since the embedded Stripe onboarding (Nov 7, 2026) the edge function delegates to
// _shared/cleaner-onboarding.ts, so check the entry point and the shared logic together.
const onboardingFunctionSource = [
  '../../../supabase/functions/create-cleaner-onboarding-link/index.ts',
  '../../../supabase/functions/_shared/cleaner-onboarding.ts',
].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const fundedCleanupSource = readFileSync(
  new URL('../../../supabase/functions/_shared/funded-cleanup.ts', import.meta.url),
  'utf8',
);
const payoutScreenSource = readFileSync(new URL('../PayoutSetupScreen.js', import.meta.url), 'utf8');

describe('individual Stripe payout onboarding', () => {
  it('creates new recipient accounts as individuals', () => {
    expect(onboardingFunctionSource).toContain('entity_type: "individual"');
    expect(onboardingFunctionSource).toContain('litterbugs-cleaner-individual-');
    expect(onboardingFunctionSource).not.toContain('business_url:');
    expect(onboardingFunctionSource).toContain('product_description: LITTERBUGS_REWARD_ACTIVITY_DESCRIPTION');
  });

  it('prefills unfinished individual onboarding before issuing a new link', () => {
    expect(onboardingFunctionSource).toContain('configureStripeRecipientAsIndividual');
    // Existing accounts are prefilled as individuals in both the link and embedded-session flows.
    expect(onboardingFunctionSource).toContain('if (mode === "link" || mode === "session") {\n        account = await configureStripeRecipientAsIndividual(account);');
    expect(fundedCleanupSource).not.toContain('business_url: "https://litterbugs.app/cleanup-policy"');
    expect(fundedCleanupSource).toContain('fields: "currently_due", future_requirements: "omit"');
    expect(fundedCleanupSource).not.toContain('fields: "eventually_due", future_requirements: "include"');
  });

  it('tells cleaners that no business is required', () => {
    expect(payoutScreenSource).toContain('No business or LLC is required.');
    expect(payoutScreenSource).toContain('personal payout account with Stripe');
    expect(payoutScreenSource).toContain('You do not need a website.');
    expect(payoutScreenSource).toContain('review it when Stripe calls it a “product description.”');
    expect(payoutScreenSource).toContain('status?.age18Confirmed !== true');
  });
});
