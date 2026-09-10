import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Integration contract spans the extracted presentation and its owning screen.
const mapScreenSource = ['../MapScreen.js', '../components/ReportWizardSteps.jsx', '../components/ReportDetailsSheet.jsx', '../styles/MapScreen.styles.js'].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

describe('report review cleanup-fund choices', () => {
  it('offers a simple volunteer default and optional reward', () => {
    expect(mapScreenSource).toContain("{ value: 'none', label: 'Not now' }");
    expect(mapScreenSource).toContain("{ value: '5', label: '$5' }");
    expect(mapScreenSource).toContain("{ value: '25', label: '$25' }");
    expect(mapScreenSource).toContain("{ value: 'other', label: 'Other' }");
  });

  it('enforces the custom $1 to $1,000 range', () => {
    expect(mapScreenSource).toContain('placeholder="1.00"');
    expect(mapScreenSource).toContain(
      'Choose at least $1 and no more than $1,000, or select Not now.'
    );
  });

  it('defaults to volunteer while validating optional rewards', () => {
    expect(mapScreenSource).toContain("startingFundingChoice: 'none'");
    expect(mapScreenSource).toContain("'Choose cleanup funding'");
  });

  it('shows the current reward and separates cleanup from utility actions', () => {
    expect(mapScreenSource).toContain('formatUsd(Number(selectedReport.funded_amount_cents))');
    expect(mapScreenSource).toContain('style={styles.reportRewardCaption}>Cleanup reward');
    expect(mapScreenSource).toContain('style={styles.reportDirectionsButton}');

    const cleanupCard = mapScreenSource.indexOf('style={styles.cleanupEligibilityCard}');
    const utilityBar = mapScreenSource.indexOf('styles.reportUtilityBar,');
    const fundButton = mapScreenSource.indexOf('accessibilityLabel="Fund cleanup"', utilityBar);
    const shareButton = mapScreenSource.indexOf("? 'Share completed cleanup'", fundButton);
    expect(cleanupCard).toBeGreaterThan(-1);
    expect(utilityBar).toBeGreaterThan(cleanupCard);
    expect(fundButton).toBeGreaterThan(-1);
    expect(shareButton).toBeGreaterThan(fundButton);
  });

  it('keeps Fund available for active volunteer opportunities', () => {
    expect(mapScreenSource).toContain(
      "const selectedReportCanOpenFunding = fundingEnabled\n    && isCleanupAvailable(selectedReport)\n    && selectedReport?.cleanup_state === 'available'\n    && selectedReport?.renewal_status === 'active';"
    );
    expect(mapScreenSource).not.toContain(
      "const selectedReportCanOpenFunding = fundingEnabled\n    && isCleanupAvailable(selectedReport)\n    && selectedReport?.cleanup_state === 'available'\n    && selectedReport?.renewal_status === 'active'\n    && selectedReport?.funding_eligibility === 'eligible';"
    );
  });

  it('refreshes report funding eligibility after the deferred review finishes', () => {
    expect(mapScreenSource).toContain('const refreshReportAfterFundingReview =');
    expect(mapScreenSource).toContain('const reviewedReport = await getReportById(reportId);');
    expect(mapScreenSource).toContain('if (reviewedReport) upsertReport(reviewedReport);');
    expect(mapScreenSource).toContain(
      'funding_eligibility: latestReport.funding_eligibility,'
    );
    expect(mapScreenSource).toContain(
      'original_photo_reviewed_at: latestReport.original_photo_reviewed_at,'
    );
  });
});
