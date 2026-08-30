import { describe, expect, it } from 'vitest';

import {
  reportShareDestinationUrls,
  reportShareImageFilename,
  reportShareImageUrl,
} from './report-share-destinations';

describe('report share destinations', () => {
  const input = {
    message: 'View this cleanup report on Litterbugs.',
    shareUrl: 'https://litterbugs.app/reports/report-id',
    title: 'Creek cleanup',
  };

  it('uses each destination’s prepared composer without exposing coordinates', () => {
    const destinations = reportShareDestinationUrls(input);

    expect(destinations.facebook).toContain('https://www.facebook.com/dialog/share?');
    expect(destinations.facebook).toContain('app_id=1477683410862512');
    expect(destinations.facebook).toContain('href=https%3A%2F%2Flitterbugs.app%2Freports%2Freport-id');
    expect(destinations.whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(destinations.x).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?text=/);
    expect(destinations.email).toMatch(/^mailto:\?subject=/);
    expect(destinations.messages).toMatch(/^sms:\?body=/);

    expect(Object.values(destinations).join(' ')).not.toContain('35.99');
    expect(Object.values(destinations).join(' ')).not.toContain('-78.9');
  });

  it('builds a same-origin social image URL and safe filename', () => {
    expect(reportShareImageUrl(`${input.shareUrl}?source=map#share`)).toBe(
      'https://litterbugs.app/reports/report-id/share-image',
    );
    expect(reportShareImageFilename('Creek cleanup / bottles')).toBe(
      'litterbugs-creek-cleanup-bottles.png',
    );
  });
});
