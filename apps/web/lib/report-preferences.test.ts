// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { readReportPreferences, writeReportPreferences } from './report-preferences';

beforeEach(() => window.localStorage.clear());

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
