import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  FALLBACK_MAP_CENTER,
  LITTER_OPTIONS,
  MAX_REPORT_DISTANCE_MILES,
  MAX_REPORT_NOTES_LENGTH,
  MAX_REPORT_PHOTOS,
  MAX_REPORT_TITLE_LENGTH,
  NOTE_OPTIONS,
  REPORT_STEPS,
  SEVERITY_LEVELS,
} from './report';

const mobileSource = readFileSync(
  new URL('../../../apps/mobile/MapScreen.js', import.meta.url),
  'utf8',
);
const mobileReportsSource = readFileSync(
  new URL('../../../apps/mobile/lib/reports.js', import.meta.url),
  'utf8',
);

function block(pattern: RegExp): string {
  const match = mobileSource.match(pattern);
  expect(match, `Expected mobile source to match ${pattern}`).not.toBeNull();
  return match?.[1] ?? '';
}

function quotedValues(source: string, key?: string): string[] {
  const pattern = key
    ? new RegExp(`${key}:\\s*['\"]([^'\"]+)['\"]`, 'g')
    : /['\"]([^'\"]+)['\"]/g;
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

describe('mobile report parity', () => {
  it('keeps the web fallback map center aligned with mobile', () => {
    const fallbackMatch = mobileReportsSource.match(
      /export const DEFAULT_MAP_REGION = Object\.freeze\(\{([\s\S]*?)\}\);/,
    );
    expect(fallbackMatch).not.toBeNull();
    const fallbackBlock = fallbackMatch?.[1] ?? '';
    const latitude = Number(fallbackBlock.match(/latitude:\s*(-?\d+(?:\.\d+)?)/)?.[1]);
    const longitude = Number(fallbackBlock.match(/longitude:\s*(-?\d+(?:\.\d+)?)/)?.[1]);

    expect(FALLBACK_MAP_CENTER).toEqual({ latitude, longitude });
  });

  it('keeps the shared wizard steps and option sets byte-for-byte aligned with mobile', () => {
    const mobileSteps = quotedValues(block(/const REPORT_STEPS = \[([\s\S]*?)\];/));
    const mobileLitterOptions = quotedValues(
      block(/const LITTER_OPTIONS = \[([\s\S]*?)\n\s*\];/),
      'label',
    );
    const mobileNoteOptions = quotedValues(
      block(/const NOTES_OPTIONS = \[([\s\S]*?)\n\s*\];/),
      'label',
    );
    const mobileSeverityLevels = quotedValues(
      block(/styles\.wizardSeverityList\}>\s*\{\[([\s\S]*?)\]\.map/),
      'level',
    );

    expect([...REPORT_STEPS]).toEqual(mobileSteps);
    expect([...LITTER_OPTIONS]).toEqual(mobileLitterOptions);
    expect([...NOTE_OPTIONS]).toEqual(mobileNoteOptions);
    expect([...SEVERITY_LEVELS]).toEqual(mobileSeverityLevels);
  });

  it('keeps all current mobile limits and edit-photo behavior unchanged', () => {
    expect(MAX_REPORT_DISTANCE_MILES).toBe(10);
    expect(mobileSource).toContain('const MAX_REPORT_DISTANCE_MILES = 10;');
    expect(MAX_REPORT_PHOTOS).toBe(3);
    expect(mobileSource).toContain('photos: [...prev.photos, uri].slice(0, 3)');
    expect(MAX_REPORT_TITLE_LENGTH).toBe(80);
    expect(mobileSource).toContain('maxLength={80}');
    expect(MAX_REPORT_NOTES_LENGTH).toBe(500);
    expect(mobileSource).toContain('maxLength={500}');
    expect(mobileSource).toContain("Photo replacement isn't enabled while editing a report yet.");
  });
});
