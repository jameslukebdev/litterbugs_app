import { describe, expect, it } from 'vitest';

import { reportAppUrl, storeUrlForUserAgent } from './open-report-action';

describe('shared report app handoff', () => {
  it('builds the existing report deep-link route safely', () => {
    expect(reportAppUrl('report id/with spaces')).toBe(
      'litterbugs://reports/report%20id%2Fwith%20spaces'
    );
  });

  it('selects the appropriate mobile store without redirecting desktop users', () => {
    expect(storeUrlForUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'))
      .toBe('https://apps.apple.com/app/id6757313862');
    expect(storeUrlForUserAgent('Mozilla/5.0 (Linux; Android 15; Pixel 9)'))
      .toBe('https://play.google.com/store/apps/details?id=com.litterbugs.app');
    expect(storeUrlForUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'))
      .toBeNull();
  });
});
