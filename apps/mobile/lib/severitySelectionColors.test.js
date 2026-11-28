import { describe, expect, it } from 'vitest';
import { getSeveritySelectionColors, SEVERITY_SELECTION_COLORS } from './severitySelectionColors';

describe('severity selection colors', () => {
  it('uses the website green, orange and red for low, medium and high', () => {
    expect(SEVERITY_SELECTION_COLORS.map(({ iconColor }) => iconColor)).toEqual(['#77B847', '#F2A93B', '#ED3F48']);
    expect(SEVERITY_SELECTION_COLORS.map(({ backgroundColor }) => backgroundColor)).toEqual(['#ECF6E3', '#FFF4DC', '#FFF0F1']);
  });

  it('keeps words dark on the pale selected fills and clamps out-of-range levels', () => {
    expect(getSeveritySelectionColors(0).foregroundColor).toBe('#2F6B3A');
    expect(getSeveritySelectionColors(1).foregroundColor).toBe('#7A4A00');
    expect(getSeveritySelectionColors(9).foregroundColor).toBe('#A8323B');
  });
});
