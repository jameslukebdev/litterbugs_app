// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { readReportPreferences, writeReportPreferences } from './report-preferences';

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => Array.from(values.keys())[index] ?? null,
      get length() { return values.size; },
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value)),
    } satisfies Storage,
  });
});

describe('report preferences', () => {
  it('keeps guest and account preferences separate and removes duplicate ids', () => {
    writeReportPreferences(null, { favorites: ['one', 'one'], hidden: ['two'] });
    writeReportPreferences('member', { favorites: ['three'], hidden: [] });

    expect(readReportPreferences(null)).toEqual({ favorites: ['one'], hidden: ['two'] });
    expect(readReportPreferences('member')).toEqual({ favorites: ['three'], hidden: [] });
  });

  it('recovers safely from malformed browser storage', () => {
    window.localStorage.setItem('litterbugs.report-preferences.v1:guest', '{bad json');
    expect(readReportPreferences(null)).toEqual({ favorites: [], hidden: [] });
  });
});
