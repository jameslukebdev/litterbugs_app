import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mapScreenSource = readFileSync(
  new URL('../MapScreen.js', import.meta.url),
  'utf8'
);

describe('new report workflow responsiveness', () => {
  it('opens the report form before waiting for a fresh GPS position', () => {
    const start = mapScreenSource.indexOf('const beginReportAtCoordinate = async (coord) => {');
    const end = mapScreenSource.indexOf('\nconst openReportLocationPicker =', start);
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
    expect(beginReportSource).toContain("distancePolicy.status === 'remote_confirmation_required'");
    expect(beginReportSource).toContain("text: 'Use this location'");
    expect(beginReportSource).toContain("closeUnverifiedDraft({ returnToPlacement: true })");
    expect(beginReportSource).not.toContain('accept funding');
    expect(beginReportSource).not.toContain('administrator approval');
  });

  it('prevents workflow advancement while the location check is pending', () => {
    expect(mapScreenSource).toContain(
      "(reportLocationVerification === 'checking' && !isEditing)"
    );
    expect(mapScreenSource).toContain("reportLocationVerification === 'checking'");
  });

  it('starts reports from a visible action and confirms the selected location first', () => {
    expect(mapScreenSource).toContain('accessibilityLabel="Report litter"');
    expect(mapScreenSource).toContain("setReportPlacementActive(true)");
    expect(mapScreenSource).toContain('accessibilityLabel="Report this location"');
    expect(mapScreenSource).toContain(
      'accessibilityLabel="Back to map without creating a report"'
    );

    const confirmStart = mapScreenSource.indexOf('const confirmReportLocation = () => {');
    const confirmEnd = mapScreenSource.indexOf('\nuseEffect(() => {', confirmStart);
    const confirmSource = mapScreenSource.slice(confirmStart, confirmEnd);

    expect(confirmSource).toContain('beginReportAtCoordinate(coord)');
  });

  it('does not use an ordinary map tap as the report entry point', () => {
    expect(mapScreenSource).not.toContain('const onMapPress =');
    expect(mapScreenSource).not.toContain('onMapPress(e)');
  });
});
