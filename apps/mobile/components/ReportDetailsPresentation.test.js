import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./ReportDetailsSheet.jsx', import.meta.url), 'utf8');

describe('regular report detail presentation', () => {
  it('uses the requested regular-report hierarchy and removes redundant navigation', () => {
    const reportTitle = source.indexOf("{selectedReport?.title || 'Litter Report'}");
    const reward = source.indexOf("'Volunteer Opportunity'", reportTitle);
    const reporter = source.indexOf("selectedReport?.cleanup_state !== 'completed' ? <View style={styles.reportIdentityCard}", reward);
    const regularPhoto = source.indexOf("selectedReport?.cleanup_state !== 'completed' ? (\n          <ReportPhotoGallery");
    const severity = source.indexOf('styles.reportSeverityBelowPhoto', regularPhoto);
    const dates = source.indexOf('styles.reportMetaStackBelowPhoto', regularPhoto);
    expect(reportTitle).toBeGreaterThan(-1);
    expect(reportTitle).toBeLessThan(reward);
    expect(reward).toBeLessThan(reporter);
    expect(reporter).toBeLessThan(regularPhoto);
    expect(regularPhoto).toBeGreaterThan(-1);
    expect(regularPhoto).toBeLessThan(severity);
    expect(severity).toBeLessThan(dates);
    expect(regularPhoto).toBeLessThan(dates);
    expect(source).not.toContain('accessibilityLabel="Show report on map"');
    expect(source).not.toContain('>Directions</Text>');
  });

  it('uses the requested reward, severity, and option presentation', () => {
    expect(source).toContain("'heart'");
    expect(source).toContain("'#E13B3B'");
    expect(source).toContain('getSeveritySelectionColors(severityIndex)');
    expect(source).toContain('getLitterTypeIcon(type)');
    expect(source).toContain('getSiteConditionIcon(note)');
    expect(source).toContain('>Site Conditions</Text>');
  });

  it('uses the revised cleanup, funding, and sharing controls', () => {
    expect(source).toContain('>Claim Cleanup</Text>');
    expect(source).toContain('name="link-outline"');
    expect(source).toContain('color="#B448CF"');
    expect(source).toContain('color="#66BB6A"');
  });
});
