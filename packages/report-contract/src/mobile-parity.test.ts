import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  FALLBACK_MAP_CENTER,
  LITTER_OPTIONS,
  MAX_REPORT_NOTES_LENGTH,
  MAX_REPORT_PHOTOS,
  MAX_REPORT_TITLE_LENGTH,
  NOTE_OPTIONS,
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
const mobileReportPhotoSource = readFileSync(
  new URL('../../../apps/mobile/lib/reportPhotoSelection.js', import.meta.url),
  'utf8',
);
const mobileWizardSource = readFileSync(
  new URL('../../../apps/mobile/components/ReportWizardSteps.jsx', import.meta.url),
  'utf8',
);

function block(pattern: RegExp, source = mobileSource): string {
  const match = source.match(pattern);
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

  it('keeps persisted option sets aligned across the separate web and mobile wizards', () => {
    const mobileLitterOptions = quotedValues(
      block(/const LITTER_OPTIONS = \[([\s\S]*?)\n\s*\];/),
      'label',
    );
    const mobileNoteOptions = quotedValues(
      block(/const NOTES_OPTIONS = \[([\s\S]*?)\n\s*\];/),
      'label',
    );
    const mobileSeverityLevels = quotedValues(
      block(/styles\.wizardSeverityList\}>\s*\{\[([\s\S]*?)\]\.map/, mobileWizardSource),
      'level',
    );

    expect([...LITTER_OPTIONS]).toEqual(mobileLitterOptions);
    expect([...NOTE_OPTIONS]).toEqual(mobileNoteOptions);
    expect([...SEVERITY_LEVELS]).toEqual(mobileSeverityLevels);
  });

  it('keeps mobile limits aligned and supports bounded report-photo replacement', () => {
    // Mobile now confirms a manually placed pin without requiring GPS. The web
    // distance policy and wizard sequence are independent UI behavior, not shared data.
    expect(MAX_REPORT_PHOTOS).toBe(3);
    expect(mobileReportPhotoSource).toContain('export const MAX_REPORT_PHOTOS = 3;');
    expect(mobileReportPhotoSource).toContain(
      'const allowsMultipleSelection = nativePhotoOptimizationAvailable && remainingSlots > 1'
    );
    expect(mobileReportPhotoSource).toContain(
      'selectionLimit: allowsMultipleSelection ? remainingSlots : 1'
    );
    expect(mobileReportPhotoSource).toContain('.slice(0, MAX_REPORT_PHOTOS)');
    expect(mobileSource).toContain('mergeReportPhotoUris(prev.photos, preparedAssets)');
    expect(MAX_REPORT_TITLE_LENGTH).toBe(80);
    expect(mobileWizardSource).toContain('maxLength={80}');
    expect(MAX_REPORT_NOTES_LENGTH).toBe(500);
    expect(mobileWizardSource).toContain('maxLength={500}');
    expect(mobileWizardSource).toContain('accessibilityLabel="Choose replacement report photos"');
    expect(mobileSource).toContain('{ photo_paths: replacementPhotoPaths }');
    expect(mobileSource).toContain('bytes.byteLength > 5 * 1024 * 1024');
  });
});
