const AUTOMATIC_FUNDING_REFRESH_STATES = new Set([
  null,
  undefined,
  'pending',
  'safety_hold',
]);

export function shouldRefreshFundingEligibility(report) {
  return AUTOMATIC_FUNDING_REFRESH_STATES.has(report?.funding_eligibility);
}

export function fundingReviewCompletionPresentation(previousEligibility, report) {
  if (
    !AUTOMATIC_FUNDING_REFRESH_STATES.has(previousEligibility)
    || shouldRefreshFundingEligibility(report)
  ) {
    return null;
  }

  switch (report?.funding_eligibility) {
    case 'eligible':
      return {
        title: 'Photo review complete',
        message: 'This report is approved for funding. You can now complete your secure Stripe payment.',
      };
    case 'better_photos':
      return {
        title: 'Photo review complete',
        message: report?.funding_hold_reason
          || 'Add clearer report photos before starting the cleanup fund.',
      };
    case 'ineligible':
      return {
        title: 'Photo review complete',
        message: report?.funding_hold_reason
          || 'This report cannot accept cleanup funding.',
      };
    default:
      return null;
  }
}

export function fundingAvailabilityPresentation(report) {
  switch (report?.funding_eligibility) {
    case 'eligible':
      return null;
    case 'better_photos':
      return {
        title: 'Better photos are needed first',
        message: report?.funding_hold_reason
          || 'Update the report with a clearer photo before starting its cleanup fund.',
      };
    case 'safety_hold':
      return {
        title: 'Safety review in progress',
        message: report?.funding_hold_reason
          || 'A Litterbugs administrator must review this report before it can accept contributions.',
      };
    case 'ineligible':
      return {
        title: 'Cleanup fund unavailable',
        message: report?.funding_hold_reason
          || 'This report is not eligible to accept cleanup fund contributions.',
      };
    default:
      return {
        title: 'Checking funding eligibility',
        message: 'The report was saved. We’re still checking its photo before opening the cleanup fund.',
      };
  }
}
