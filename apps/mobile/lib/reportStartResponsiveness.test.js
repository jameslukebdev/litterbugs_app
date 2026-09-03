import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mapScreenSource = readFileSync(
  new URL('../MapScreen.js', import.meta.url),
  'utf8'
);

describe('new report workflow responsiveness', () => {
  it('opens the report form before waiting for a fresh GPS position', () => {
    const start = mapScreenSource.indexOf('const beginReportAtCoordinate = async (coord) => {');
    const end = mapScreenSource.indexOf('\nconst onMapPress =', start);
    const beginReportSource = mapScreenSource.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(beginReportSource.indexOf('setFormOpen(true)')).toBeGreaterThanOrEqual(0);
    expect(beginReportSource.indexOf('Location.getCurrentPositionAsync')).toBeGreaterThanOrEqual(0);
    expect(beginReportSource.indexOf('setFormOpen(true)')).toBeLessThan(
      beginReportSource.indexOf('Location.getCurrentPositionAsync')
    );
    expect(beginReportSource).toContain("setReportLocationVerification('checking')");
    expect(beginReportSource).toContain("setReportLocationVerification('verified')");
  });

  it('prevents workflow advancement while the location check is pending', () => {
    expect(mapScreenSource).toContain(
      "(reportLocationVerification === 'checking' && !isEditing)"
    );
    expect(mapScreenSource).toContain("reportLocationVerification === 'checking'");
  });
});
