import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { CommunityResults } from './community-results';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
const result = { id: 'result', state: 'completed', title: 'Local result', reportDate: '2026-09-01', completionDate: '2026-10-28T12:00:00Z', cleanerName: 'Cleaner', reporterName: 'Reporter', bagsOrItemsRemoved: 2, weightPounds: 12, beforePhotoUrl: '/before', afterPhotoUrl: '/after' } as PublicReportShareModel;
it('renders real evidence and attribution without repeating the featured result as a card', () => {
  const html = renderToStaticMarkup(<CommunityResults reports={[result]} />);
  expect(html).toContain('Before cleanup: Local result');
  expect(html).toContain('After cleanup: Local result');
  expect(html).toContain('Oct 28, 2026');
  expect(html).toContain('Cleaner'); expect(html).toContain('Reporter');
  expect(html).toContain('2 bags/items · 12 lb (cleaner-reported)');
  expect(html.match(/href="\/reports\/result"/g)).toHaveLength(1);
});
it('does not fabricate outcomes or show active reports as completed evidence', () => {
  const html = renderToStaticMarkup(<CommunityResults reports={[{ ...result, id: 'unapproved', state: 'available' }, { ...result, id: 'legacy', completionDate: null, cleanerName: null, reporterName: undefined, bagsOrItemsRemoved: null, weightPounds: null, afterPhotoUrl: null }]} />);
  expect(html).not.toContain('unapproved');
  expect(html).toContain('Date not recorded');
  expect(html).not.toContain('Recorded outcome');
  expect(html).not.toContain('Cleaned by');
  expect(html).toContain('Before cleanup: Local result');
});
