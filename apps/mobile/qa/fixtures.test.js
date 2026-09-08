import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { CLEANUP_STATES, FIXTURE_REGION, FIXTURE_SCENARIOS, selectFixtureReports } from './fixtures';
import { DEFAULT_REPORT_FILTERS } from '../lib/reportFilters';
import { layoutMapLabels } from '../lib/mapLabelLayout';
import { installFixtureNetworkGuard } from './networkGuard';

describe('isolated fixture dataset', () => {
  it('covers every lifecycle state with and without money, unique synthetic IDs, and sample flags', () => {
    const rows = FIXTURE_SCENARIOS.spectrum;
    expect(new Set(rows.map(row => row.id)).size).toBe(10);
    for (const state of CLEANUP_STATES) {
      expect(rows.filter(row => row.cleanup_state === state).map(row => row.funded_amount_cents > 0)).toEqual([true, false]);
    }
    expect(Object.values(FIXTURE_SCENARIOS).flat().every(row => row.id.startsWith('fixture-') && row.is_sample)).toBe(true);
  });
  it('uses actual discovery filters and excludes closed reports while retaining completed history', () => {
    expect(selectFixtureReports('spectrum')).toHaveLength(10);
    expect(selectFixtureReports('spectrum', { ...DEFAULT_REPORT_FILTERS, status: 'progress', funding: 'funded' })).toHaveLength(3);
    expect(selectFixtureReports('spectrum', { ...DEFAULT_REPORT_FILTERS, status: 'completed', funding: 'volunteer' })).toHaveLength(1);
    expect(selectFixtureReports('lifecycle')).toHaveLength(11);
    expect(selectFixtureReports('empty')).toEqual([]);
    expect(selectFixtureReports('spectrum', DEFAULT_REPORT_FILTERS, { ...FIXTURE_REGION, longitude: 0 })).toEqual([]);
  });
  it('reveals more labels as the crowded points spread apart, preserving IDs and amounts', () => {
    const project = scale => FIXTURE_SCENARIOS.crowded.map(report => ({ id: report.id, report, label: report.funded_amount_cents ? `$${report.funded_amount_cents / 100}` : null, x: report.longitude * scale, y: report.latitude * scale }));
    const wide = layoutMapLabels(project(1000));
    const near = layoutMapLabels(project(100000));
    expect(near.filter(row => row.labelled).length).toBeGreaterThan(wide.filter(row => row.labelled).length);
    expect(near.map(row => [row.id, row.label])).toEqual(wide.map(row => [row.id, row.label]));
  });
  it('rejects JavaScript network transports', async () => {
    const target = {};
    installFixtureNetworkGuard(target);
    await expect(target.fetch('https://example.invalid')).rejects.toThrow('disabled');
    expect(() => new target.XMLHttpRequest()).toThrow('disabled');
    expect(() => new target.WebSocket('wss://example.invalid')).toThrow('disabled');
  });
  it('has no transitive application imports of backend, auth, storage, payment or production bootstrap', () => {
    const seen = new Set();
    function visit(path) {
      if (seen.has(path)) return;
      seen.add(path);
      const source = readFileSync(path, 'utf8');
      const imports = [...source.matchAll(/(?:from\s*|require\s*\(\s*)['"]([^'"]+)['"]/g)].map(match => match[1]);
      for (const name of imports) {
        expect(name).not.toMatch(/supabase|stripe|async-storage|secure-store|\.\/App$|lib\/(session|profile|reports|auth)$/i);
        if (!name.startsWith('.')) continue;
        const base = resolve(dirname(path), name);
        const next = [base, `${base}.js`, `${base}.jsx`].find(candidate => existsSync(candidate));
        expect(next, name).toBeTruthy(); visit(next);
      }
    }
    visit(resolve('qa/index.js'));
    expect(seen.has(resolve('components/ReportMapMarkers.jsx'))).toBe(true);
  });
});
