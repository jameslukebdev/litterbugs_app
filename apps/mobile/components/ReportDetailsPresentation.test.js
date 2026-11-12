import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./ReportDetailsSheet.jsx', import.meta.url), 'utf8');

describe('regular report detail presentation', () => {
  it('follows the website report sheet: title, state, fund, priority line, photos, facts, then reporter', () => {
    const title = source.indexOf("{selectedReport?.title || 'Litter Report'}");
    const state = source.indexOf('{statusText}', title);
    const fund = source.indexOf('in its cleanup fund', state);
    const priority = source.indexOf('priority</Text>', fund);
    const photos = source.indexOf('<ReportPhotoGallery', priority);
    const facts = source.indexOf("['Litter', litter.join(', ')]", photos);
    const reporter = source.indexOf('>Reported by</Text>', facts);
    const order = [title, state, fund, priority, photos, facts, reporter];
    for (const index of order) expect(index).toBeGreaterThan(-1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(source).toContain("'Available to clean'");
    expect(source).not.toContain('accessibilityLabel="Show report on map"');
  });

  it('shows colour through the bug and words, not pills, chips or tinted panels', () => {
    expect(source).not.toContain("'Volunteer Opportunity'");
    expect(source).not.toContain('getSeveritySelectionColors');
    expect(source).not.toContain('styles.reportChip');
  });

  it('uses the website Fund (bee) and Clean (butterfly) buttons', () => {
    expect(source).toContain('<BrandBug kind="bee" size={21} playKey={fundTaps} />');
    expect(source).toContain('<BrandBug kind="butterfly" size={21} playKey={cleanTaps} />');
    expect(source).toContain('>Fund</Text>');
    expect(source).toContain('>Clean</Text>');
  });
});
