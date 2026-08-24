import { describe, expect, it } from 'vitest';

import {
  CLEANUP_NAVIGATION_SAFETY_REMINDER,
  cleanupNavigationUrls,
} from './cleanupNavigation';

describe('cleanup navigation handoff', () => {
  it('builds external map URLs from report coordinates', () => {
    const urls = cleanupNavigationUrls({ latitude: 35.6, longitude: -82.55 });

    expect(urls.apple).toContain('maps.apple.com');
    expect(urls.google).toContain('google.com/maps/dir');
    expect(urls.android).toBe('geo:35.6,-82.55?q=35.6%2C-82.55');
  });

  it('rejects missing or invalid report coordinates', () => {
    expect(cleanupNavigationUrls(null)).toBeNull();
    expect(cleanupNavigationUrls({ latitude: 'invalid', longitude: -82.55 })).toBeNull();
  });

  it('uses the required cleanup travel safety reminder', () => {
    expect(CLEANUP_NAVIGATION_SAFETY_REMINDER).toBe(
      'Travel safely. Park in a safe and legal location before using Litterbugs or beginning a cleanup.'
    );
  });
});
