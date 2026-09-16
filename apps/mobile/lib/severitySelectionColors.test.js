import { describe, expect, it } from 'vitest';
import { getSeveritySelectionColors, SEVERITY_SELECTION_COLORS } from './severitySelectionColors';

describe('severity selection colors', () => {
  it('uses progressively stronger red backgrounds from low to high', () => {
    expect(SEVERITY_SELECTION_COLORS.map(({ backgroundColor }) => backgroundColor)).toEqual([
      '#FDEBED',
      '#DF626A',
      '#991F2B',
    ]);
  });

  it('keeps light severity dark and stronger severities white for contrast', () => {
    expect(getSeveritySelectionColors(0).foregroundColor).toBe('#982D38');
    expect(getSeveritySelectionColors(1).foregroundColor).toBe('#FFFFFF');
    expect(getSeveritySelectionColors(2).foregroundColor).toBe('#FFFFFF');
  });
});
