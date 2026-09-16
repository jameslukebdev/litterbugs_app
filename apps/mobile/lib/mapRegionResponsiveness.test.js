import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mapScreenSource = readFileSync(
  new URL('../MapScreen.js', import.meta.url),
  'utf8'
);

describe('map region responsiveness', () => {
  it('does not update MapScreen state from inside the shared region updater', () => {
    const handlerStart = mapScreenSource.indexOf(
      'onRegionChangeComplete={(nextRegion) => {'
    );
    const handlerEnd = mapScreenSource.indexOf('\n          maxZoom=', handlerStart);
    const handlerSource = mapScreenSource.slice(handlerStart, handlerEnd);

    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    expect(handlerSource).toContain('refreshReportMarkerSnapshots();');
    expect(handlerSource).toContain('setRegion(nextRegion);');
    expect(handlerSource).not.toContain('setRegion((currentRegion) =>');
  });
});
