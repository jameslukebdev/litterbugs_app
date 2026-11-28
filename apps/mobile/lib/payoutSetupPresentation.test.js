import { describe, expect, it } from 'vitest';
import { payoutRequirementLabels, payoutSetupPresentation } from './payoutSetupPresentation';

describe('payout setup guidance', () => {
  it('shows a currently-required SSN field immediately on reopening setup', () => {
    const notice = payoutSetupPresentation({ status: {
      onboardingStatus: 'pending', payoutsEnabled: false,
      requirementsDue: ['identity.individual.id_numbers.us_ssn_last_4'],
    } });
    expect(notice).toMatchObject({
      kind: 'action_required', title: 'More information needed',
      requirements: ['Last four digits of your Social Security number'],
    });
    expect(notice.detail).toContain('add or correct it');
    expect(notice.detail).toContain('Litterbugs opens the form for you');
    expect(notice.detail).toContain('only in that form');
    expect(JSON.stringify(notice)).not.toContain('in review');
  });

  it('uses the same missing-information guidance after returning from Stripe', () => {
    const status = { onboardingStatus: 'pending', requirementsDue: ['individual.dob.day'] };
    expect(payoutSetupPresentation({ status, waiting: true }))
      .toEqual(payoutSetupPresentation({ status }));
  });

  it('groups component fields into readable information types without duplicates', () => {
    expect(payoutRequirementLabels([
      'identity.individual.dob.day', 'identity.individual.dob.month', 'individual.dob.year',
      'individual.address.line1', 'individual.address.postal_code',
      'identity.individual.given_name', 'identity.individual.surname',
      'individual.email', 'individual.phone', 'external_account',
      'individual.verification.document', 'identity.attestations.terms_of_service.account.date', 'individual.id_number',
    ])).toEqual([
      'Date of birth', 'Home address', 'Legal name', 'Email address', 'Phone number',
      'Bank account for payouts', 'Identity verification documents',
      'Stripe agreement confirmation', 'Tax or identity number',
    ]);
  });

  it('provides safe guidance for unknown fields without showing raw provider text', () => {
    const notice = payoutSetupPresentation({ status: {
      requirementsDue: ['configuration.some_new_field', 'Unrecognized provider description'],
    } });
    expect(notice.requirements).toEqual(['Additional information requested by Stripe']);
    expect(notice.detail).toContain('Continue payout setup');
    expect(JSON.stringify(notice)).not.toContain('configuration.');
  });

  it.each([undefined, null, {}, 'invalid', [null, 7, '', '   ']])('ignores malformed requirement lists: %j', value => {
    expect(payoutRequirementLabels(value)).toEqual([]);
  });

  it('checks pending setup without claiming that submitted information was accepted', () => {
    const notice = payoutSetupPresentation({ status: { onboardingStatus: 'pending', requirementsDue: [] } });
    expect(notice.kind).toBe('pending');
    expect(notice.detail).toContain('No missing information is currently reported');
    expect(notice.detail).toContain('refresh automatically');
    expect(notice.detail).not.toContain('received');
  });

  it('does not show a review message for restricted or unfinished setup', () => {
    for (const input of [{ status: { onboardingStatus: 'restricted' } }, { waiting: true }]) {
      expect(payoutSetupPresentation(input)).toMatchObject({
        kind: 'action_required', title: 'Payout setup needs attention',
      });
    }
  });

  it('prioritizes refresh failures over stale missing information', () => {
    expect(payoutSetupPresentation({
      error: true, waiting: true,
      status: { onboardingStatus: 'pending', requirementsDue: ['individual.id_number'] },
    })).toMatchObject({ kind: 'error', requirements: [] });
  });

  it('removes review warnings when Stripe enables payouts without current requirements', () => {
    expect(payoutSetupPresentation({ waiting: true, status: {
      payoutsEnabled: true, onboardingStatus: 'enabled', requirementsDue: [],
    } })).toBeNull();
  });

  it('keeps current remediation available for enabled accounts without claiming payouts are blocked', () => {
    const notice = payoutSetupPresentation({ status: {
      payoutsEnabled: true, onboardingStatus: 'enabled', requirementsDue: ['individual.id_number'],
    } });
    expect(notice.title).toBe('Keep your payouts ready');
    expect(notice.detail).toContain('Your payouts are enabled.');
    expect(notice.detail).toContain('Update payout details');
  });

  it('describes the reward activity rather than asking members for a business website', () => {
    expect(payoutRequirementLabels(['defaults.profile.business_url', 'business_profile.product_description']))
      .toEqual(['Description of your Litterbugs reward activity']);
  });

  it('keeps initial setup free of review or missing-information warnings', () => {
    expect(payoutSetupPresentation()).toBeNull();
    expect(payoutSetupPresentation({ status: { onboardingStatus: 'not_started', payoutsEnabled: false, requirementsDue: [] } })).toBeNull();
  });
});
