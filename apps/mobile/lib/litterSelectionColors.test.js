import { describe, expect, it } from 'vitest';
import { getLitterSelectionColors, LITTER_SELECTION_COLORS } from './litterSelectionColors';

describe('litter selection colors', () => {
  it('cycles through the approved brand palette in a stable order', () => {
    expect(LITTER_SELECTION_COLORS.map(({ backgroundColor }) => backgroundColor)).toEqual([
      '#EAF4EC',
      '#F5E8F8',
      '#FFF4CF',
      '#FBE8E8',
      '#E9EAFF',
    ]);
    expect(getLitterSelectionColors(5)).toBe(LITTER_SELECTION_COLORS[0]);
  });

  it('uses darker matching content across the pastel palette', () => {
    expect(getLitterSelectionColors(0).foregroundColor).toBe('#245F2A');
    expect(getLitterSelectionColors(2).foregroundColor).toBe('#765400');
    expect(getLitterSelectionColors(4).foregroundColor).toBe('#3037C7');
  });
});
