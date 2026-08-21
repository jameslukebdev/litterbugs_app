import { describe, expect, it } from 'vitest';

import { safeNextPath } from './safe-next-path';

describe('auth callback destination', () => {
  it('allows only same-site root-relative paths', () => {
    expect(safeNextPath('/')).toBe('/');
    expect(safeNextPath('/report?step=review')).toBe('/report?step=review');
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath('https://example.com')).toBe('/');
    expect(safeNextPath('//example.com')).toBe('/');
    expect(safeNextPath('/\\example.com')).toBe('/');
  });
});
