import { describe, expect, it } from 'vitest';
import { DEFAULT_REPORT_TITLE, normalizeReportTitle } from './reportTitle';

describe('report title fallback', () => {
  it('uses Litter Report for empty or whitespace-only titles', () => {
    expect(normalizeReportTitle('')).toBe(DEFAULT_REPORT_TITLE);
    expect(normalizeReportTitle('   ')).toBe('Litter Report');
    expect(normalizeReportTitle(null)).toBe('Litter Report');
  });

  it('preserves a supplied title after trimming it', () => {
    expect(normalizeReportTitle('  Bottles near the trail  ')).toBe('Bottles near the trail');
  });
});
