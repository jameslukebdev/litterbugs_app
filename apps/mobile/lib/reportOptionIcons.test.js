import { describe, expect, it } from 'vitest';
import { getLitterTypeIcon, getSiteConditionIcon } from './reportOptionIcons';

describe('report option icons', () => {
  it('matches litter-type icons used by the report form', () => {
    expect(getLitterTypeIcon('Takeout cups')).toBe('cafe-outline');
    expect(getLitterTypeIcon('Trash bags')).toBe('trash-outline');
    expect(getLitterTypeIcon('Custom item')).toBe('create-outline');
  });

  it('matches site-condition icons used by the report form', () => {
    expect(getSiteConditionIcon('Near roadside')).toBe('car-outline');
    expect(getSiteConditionIcon('Broken glass')).toBe('alert-circle-outline');
    expect(getSiteConditionIcon('Custom condition')).toBe('information-circle-outline');
  });
});
