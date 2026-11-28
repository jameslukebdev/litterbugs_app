// These are requirement names, never the member's identity or banking values.
export function payoutRequirementLabels(requirements) {
  if (!Array.isArray(requirements)) return [];
  return [...new Set(requirements.filter(value => typeof value === 'string' && value.trim()).map(value => {
    const field = value.toLowerCase();
    if (/\b(us_ssn_last_4|ssn_last_4)\b/.test(field)) return 'Last four digits of your Social Security number';
    if (/\b(us_ssn|ssn|id_number|id_numbers)\b/.test(field)) return 'Tax or identity number';
    if (/\b(dob|date_of_birth)\b/.test(field)) return 'Date of birth';
    if (/\b(address|address_kana|address_kanji)\b/.test(field)) return 'Home address';
    if (/\b(first_name|last_name|full_name|given_name|surname)\b/.test(field)) return 'Legal name';
    if (/\b(email)\b/.test(field)) return 'Email address';
    if (/\b(phone|phone_number)\b/.test(field)) return 'Phone number';
    if (/\b(external_account|external_accounts|bank_account|bank_accounts)\b/.test(field)) return 'Bank account for payouts';
    if (/\b(document|documents|verification)\b/.test(field)) return 'Identity verification documents';
    if (/\b(tos_acceptance|service_agreement|terms_of_service)\b/.test(field)) return 'Stripe agreement confirmation';
    if (/\b(product_description|business_url|url)\b/.test(field)) return 'Description of your Litterbugs reward activity';
    // Stripe may add new fields or return free-form descriptions. Do not expose
    // internal paths or unrecognized provider text as instructions to members.
    return 'Additional information requested by Stripe';
  }))];
}

export function payoutSetupPresentation({ status, error = false, waiting = false } = {}) {
  if (error) return {
    kind: 'error', title: 'Payout status unavailable', requirements: [],
    detail: 'Your existing setup is unchanged. Refresh to check what is needed before continuing.',
  };
  const requirements = payoutRequirementLabels(status?.requirementsDue);
  if (status?.payoutsEnabled === true) return requirements.length ? {
    kind: 'action_required', title: 'Keep your payouts ready', requirements,
    detail: 'Your payouts are enabled. Stripe needs an update to keep them available. Tap Update payout details below to review the requested information in the secure form.',
  } : null;
  if (requirements.length) return {
    kind: 'action_required', title: 'More information needed', requirements,
    detail: 'Our payment provider, Stripe, needs the following information. Tap Continue payout setup below to reopen the secure form and add or correct it. Litterbugs opens the form for you; enter sensitive details only in that form.',
  };
  if (status?.onboardingStatus === 'pending') return {
    kind: 'pending', title: 'Stripe is checking your payout setup', requirements: [],
    detail: 'No missing information is currently reported. Payouts are not ready yet. We’ll refresh automatically while this screen is open. You can return here from your profile at any time.',
  };
  if (status?.onboardingStatus === 'restricted' || waiting) return {
    kind: 'action_required', title: 'Payout setup needs attention', requirements: [],
    detail: 'Payouts are not enabled. Tap Continue payout setup below to reopen the secure form and check for any required steps, or contact Litterbugs support if you cannot continue.',
  };
  return null;
}
