// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
  durationMinutes: null,
  canonicalUrl: 'https://litterbugs.app/reports/report-id',
};

describe('ReportSocialCard', () => {
  it('uses the real brand asset and a neutral message when no photo is available', () => {
    render(<ReportSocialCard report={report} logoUrl="https://litterbugs.app/brand/litterbugs-logo.png" />);

    expect(screen.getAllByRole('img', { name: 'Litterbugs' })).toHaveLength(2);
    expect(screen.getByText('Photo not provided')).toBeTruthy();
    expect(screen.queryByText('!')).toBeNull();
  });
});
