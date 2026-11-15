import { expect, it } from 'vitest';
import { publicReportStoryDescription, publicReportStorySummary } from './public-report-content';
import type { PublicReportShareModel } from './public-report-share-model';
import { publicReportStructuredData } from './public-report-structured-data';

const site = 'https://litterbugs.app';
const report: PublicReportShareModel = {
  id: 'report', title: 'Trash in and around cabin', state: 'completed',
  generalLocation: 'Boone, North Carolina, United States', localityLabel: 'Boone, North Carolina',
  place: { locality: 'Boone', region: 'North Carolina', countryCode: 'US' },
  notes: 'Scattered', litterTypes: ['Cans', 'Bottles'], severity: 'Medium',
  reporterName: 'Nevan', reporterId: 'member-1',
  reportDate: '2026-11-09T15:00:00Z', cleanerName: 'Nevan', completionDate: '2026-11-09T19:30:00Z',
  cleanupDescription: 'Beer cans and other trash cleaned up', bagsOrItemsRemoved: 1, weightPounds: 10,
  beforePhotoUrl: '/reports/report/photo/before', afterPhotoUrl: '/reports/report/photo/after',
  canonicalUrl: `${site}/reports/report`,
};
type Graph = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- loose JSON-LD lookups
const graph = (value: PublicReportShareModel) =>
  publicReportStructuredData(value, site)['@graph'] as unknown as [Graph, Graph];

it('states who cleaned what, where and when in one sentence, attributing amounts to the cleaner', () => {
  expect(publicReportStorySummary(report)).toBe(
    'Nevan cleaned up this spot near Boone, North Carolina, on November 9, 2026, and reported removing 10 pounds of litter. It was cleaned up within a day of being reported.');
  expect(publicReportStorySummary({ ...report, weightPounds: null, bagsOrItemsRemoved: 2 })).toContain('reported removing 2 bags or items of litter.');
  expect(publicReportStorySummary({ ...report, cleanupMinutes: 92 })).toContain('of litter. The cleanup took 1.5 hours. It was cleaned up');
  expect(publicReportStorySummary({ ...report, cleanupMinutes: 35 })).toContain('The cleanup took 35 minutes.');
  expect(publicReportStorySummary({ ...report, cleanupMinutes: 0 })).not.toContain('The cleanup took');
  expect(publicReportStorySummary({ ...report, completionDate: '2026-11-12T16:00:00Z' })).toContain('It was cleaned up 3 days after it was reported.');
  expect(publicReportStorySummary({ ...report, completionDate: '2026-11-10T16:00:00Z' })).toContain('It was cleaned up 1 day after it was reported.');
  // A completion recorded before the report is a data error, not a claim to print.
  expect(publicReportStorySummary({ ...report, completionDate: '2026-11-01T16:00:00Z' })).not.toContain('It was cleaned up');
  expect(publicReportStoryDescription(report)).toBe(
    'Trash in and around cabin. Nevan cleaned up this spot near Boone, North Carolina, on November 9, 2026, and reported removing 10 pounds of litter. It was cleaned up within a day of being reported. The report listed Cans and Bottles.');
});

it('does not invent a cleaner, a place, an amount or a date that was not recorded', () => {
  const sparse = { ...report, cleanerName: null, completionDate: null, bagsOrItemsRemoved: null, weightPounds: 0,
    place: undefined, localityLabel: 'Unverified place' };
  expect(publicReportStorySummary(sparse)).toBe('A Litterbugs member cleaned up this spot.');
  expect(publicReportStorySummary({ ...report, state: 'available', rewardCents: 600 })).toBe(
    'Nevan reported litter at this spot near Boone, North Carolina, on November 9, 2026, and it still needs a cleanup. Its cleanup fund holds $6.00.');
  const unfunded = { ...report, state: 'available' as const, rewardCents: 0, reporterName: 'Community member', reportDate: null };
  expect(publicReportStorySummary({ ...unfunded, fundingEligible: true })).toBe(
    'A community member reported litter at this spot near Boone, North Carolina, and it still needs a cleanup. It has no cleanup fund yet, so anyone can fund it or clean it up as a volunteer.');
  expect(publicReportStorySummary(unfunded)).toContain('It is a volunteer cleanup.');
  expect(publicReportStorySummary({ ...report, state: 'in_progress', reportDate: null })).toBe(
    'A cleanup is underway at this spot near Boone, North Carolina.');
  // An expired report states who, where and when; its outcome is left to the history section.
  expect(publicReportStorySummary({ ...report, state: 'expired' })).toBe('Nevan reported litter at this spot near Boone, North Carolina, on November 9, 2026.');
  expect(publicReportStoryDescription({ ...report, state: 'expired' })).toContain('A cleanup has not been confirmed.');
});

it('describes a completed cleanup as an article with both photos, people, dates and its town', () => {
  const [article] = graph(report);
  expect(article).toMatchObject({
    '@type': 'Article', url: report.canonicalUrl, name: report.title,
    headline: 'Trash in and around cabin, Boone – cleaned up',
    datePublished: '2026-11-09T15:00:00.000Z', dateModified: '2026-11-09T19:30:00.000Z',
    author: { '@type': 'Person', name: 'Nevan', url: `${site}/members/member-1` },
    contributor: { '@type': 'Person', name: 'Nevan' },
    publisher: { '@type': 'Organization', name: 'Litterbugs' },
    contentLocation: { name: 'Boone, North Carolina', address: { addressLocality: 'Boone', addressRegion: 'North Carolina', addressCountry: 'US' } },
    keywords: 'Cans, Bottles',
  });
  expect(article.image.map((image: Graph) => image.url)).toEqual([
    `${site}/reports/report/photo/before`, `${site}/reports/report/photo/after`]);
  expect(JSON.stringify(article)).not.toMatch(/latitude|longitude|GeoCoordinates/);
});

it('lists the breadcrumb trail through the listing tab the report sits under', () => {
  const trail = (value: PublicReportShareModel) => graph(value)[1].itemListElement.map((entry: Graph) => [entry.position, entry.name, entry.item]);
  expect(trail(report)).toEqual([
    [1, 'Litterbugs', site],
    [2, 'Completed cleanups', `${site}/cleanups`],
    [3, 'Trash in and around cabin', report.canonicalUrl],
  ]);
  expect(trail({ ...report, state: 'available' })[1]).toEqual([2, 'Open reports', `${site}/reports`]);
  expect(trail({ ...report, state: 'expired' })[1]).toEqual([2, 'Expired reports', `${site}/reports/history`]);
});

it('omits unrecorded people, photos and places, and never publishes embedded photo data', () => {
  const [article, breadcrumbs] = graph({ ...report, state: 'expired', reporterName: 'Community member', cleanerName: null,
    place: undefined, localityLabel: undefined, beforePhotoUrl: 'data:image/jpeg;base64,AAAA', afterPhotoUrl: null,
    reportDate: 'invalid', expiredDate: '2026-12-09T15:00:00Z' });
  for (const key of ['author', 'contributor', 'contentLocation', 'image', 'datePublished']) expect(article).not.toHaveProperty(key);
  expect(article.dateModified).toBe('2026-12-09T15:00:00.000Z');
  expect(breadcrumbs.itemListElement.map((entry: Graph) => entry.name)).toEqual(['Litterbugs', 'Expired reports', 'Trash in and around cabin']);
});
