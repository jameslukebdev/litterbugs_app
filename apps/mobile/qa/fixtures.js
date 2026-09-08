import { DEFAULT_REPORT_FILTERS, matchesReportFilters } from '../lib/reportFilters';
import { inViewport } from '../lib/searchGeography';
import { isVisibleReport } from '../lib/reportVisibility';

export const FIXTURE_NOW = new Date('2026-09-08T12:00:00Z');
export const FIXTURE_REGION = Object.freeze({ latitude: 36.22, longitude: -81.67, latitudeDelta: 0.1, longitudeDelta: 0.1 });
export const CLEANUP_STATES = Object.freeze(['available', 'claimed', 'completion_submitted', 'changes_requested', 'completed']);
const names = ['Available', 'In progress', 'Awaiting review', 'Changes requested', 'Completed'];
function report(id, state, cents, latitude, longitude, extra = {}) {
  return Object.freeze({ id: `fixture-${id}`, user_id: 'fixture-owner', title: `${names[CLEANUP_STATES.indexOf(state)]} ${cents ? 'funded' : 'volunteer'}`,
    cleanup_state: state, funded_amount_cents: cents, latitude, longitude, severity: 'Low',
    created_at: '2026-09-01T00:00:00Z', expires_at: '2099-01-01T00:00:00Z',
    expired_at: null, cancelled_at: null, is_sample: true, photo_paths: [], ...extra });
}
// Deliberately synthetic and sample-labelled: never upload this data to live tables.
const spectrum = CLEANUP_STATES.flatMap((state, i) => [
  report(`${state}-funded`, state, [600, 2500, 12550, 100000, 4800][i], 36.252 - i * 0.016, -81.693),
  report(`${state}-volunteer`, state, 0, 36.252 - i * 0.016, -81.647),
]);
export const FIXTURE_SCENARIOS = Object.freeze({
  spectrum: Object.freeze(spectrum),
  crowded: Object.freeze(Array.from({ length: 80 }, (_, i) => report(`crowded-${String(i).padStart(2, '0')}`, CLEANUP_STATES[i % 5], i % 3 ? 600 + i * 100 : 0,
    36.215 + Math.floor(i / 10) * 0.0014, -81.677 + (i % 10) * 0.0014))),
  overlap: Object.freeze(spectrum.map((item, i) => Object.freeze({ ...item, id: `fixture-overlap-${i}`, latitude: 36.22, longitude: -81.67 }))),
  empty: Object.freeze([]),
  lifecycle: Object.freeze([
    ...spectrum,
    report('expired', 'available', 1200, 36.22, -81.67, { expires_at: '2026-01-01T00:00:00Z' }),
    report('cancelled', 'available', 1600, 36.22, -81.67, { cancelled_at: '2026-09-01T00:00:00Z' }),
    report('completed-old', 'completed', 9900, 36.22, -81.67, { expires_at: '2026-01-01T00:00:00Z' }),
  ]),
});
export function selectFixtureReports(scenario, filters = DEFAULT_REPORT_FILTERS, region = FIXTURE_REGION) {
  return (FIXTURE_SCENARIOS[scenario] || []).filter(item => isVisibleReport(item, FIXTURE_NOW)
    && inViewport(item, region) && matchesReportFilters(item, filters, region));
}
