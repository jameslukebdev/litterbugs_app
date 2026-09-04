import { describe, expect, it } from 'vitest';

import { formatMapFundingLabel, isFundedMapMarker } from './mapFundingMarker';

describe('map funding marker', () => {
  it('uses a plain volunteer label when no money has been added', () => {
    expect(formatMapFundingLabel(0)).toBe('Volunteer');
    expect(isFundedMapMarker(0)).toBe(false);
  });

  it('uses compact currency labels for funded reports', () => {
    expect(formatMapFundingLabel(500)).toBe('$5');
    expect(formatMapFundingLabel(2550)).toBe('$25.50');
    expect(isFundedMapMarker(500)).toBe(true);
  });
});
