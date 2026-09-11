// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ReportSocialCard } from '@/components/report-social-card';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';

const report: PublicReportShareModel = {
  id: 'report-id',
  state: 'available',
  title: 'Creek cleanup',
  severity: 'Medium',
  litterTypes: ['Takeout cups'],
  generalLocation: 'Near the community park',
  notes: null,
  reportDate: null,
  beforePhotoUrl: null,
  afterPhotoUrl: null,
  cleanerName: null,
  completionDate: null,
  cleanupDescription: null,
  bagsOrItemsRemoved: null,
  weightPounds: null,
  canonicalUrl: 'https://litterbugs.app/reports/report-id',
};

afterEach(cleanup);

describe('ReportSocialCard', () => {
  it('uses the real brand asset and a neutral message when no photo is available', () => {
    render(<ReportSocialCard report={report} logoUrl="https://litterbugs.app/brand/litterbugs-logo.png" />);

    expect(screen.getAllByRole('img', { name: 'Litterbugs' })).toHaveLength(2);
    expect(screen.getByText('Photo not provided')).toBeTruthy();
    expect(screen.queryByText('!')).toBeNull();
  });

  it('keeps the after label when the original photo is unavailable', () => {
    render(<ReportSocialCard report={{ ...report, state: 'completed', afterPhotoUrl: '/after.jpg', rewardCents: 600 }} logoUrl="/logo.png" />);
    expect(screen.getByRole('img', { name: 'After' }).getAttribute('src')).toBe('/after.jpg');
    expect(screen.queryByText('Before')).toBeNull();
    expect(screen.queryByText(/cleanup reward/)).toBeNull();
  });

  it('presents completed photos in chronological order', () => {
    render(<ReportSocialCard report={{ ...report, state: 'completed', beforePhotoUrl: '/before.jpg', afterPhotoUrl: '/after.jpg' }} logoUrl="/logo.png" />);
    expect(screen.getAllByRole('img').map(image => image.getAttribute('alt'))).toEqual(['Litterbugs', 'Before', 'After']);
  });

  it('bounds long titles without removing the reward or exposing private details', () => {
    const title = 'A long cleanup report description '.repeat(12);
    render(<ReportSocialCard report={{ ...report, title, rewardCents: 600, notes: 'Private access instructions', generalLocation: 'Private precise address' }} logoUrl="/logo.png" />);
    const excerpt = screen.getByText(/^A long cleanup report description/).textContent!;
    expect(excerpt.length).toBeLessThanOrEqual(100);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(screen.getByText('$6.00 cleanup reward')).toBeTruthy();
    expect(screen.queryByText(/Private/)).toBeNull();
  });
});
