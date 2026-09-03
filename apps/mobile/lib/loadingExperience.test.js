import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readMobileSource = (name) => readFileSync(
  new URL(`../${name}`, import.meta.url),
  'utf8',
);

describe('mobile loading experience', () => {
  it('uses a branded animated loader that respects reduced-motion preferences', () => {
    const source = readMobileSource('BrandedLoadingState.js');
    expect(source).toContain('Animated.loop');
    expect(source).toContain('isReduceMotionEnabled');
    expect(source).toContain('progressTrack');
    expect(source).toContain('progressDot');
    expect(source).toContain("accessibilityRole=\"progressbar\"");
  });

  it('shows intentional loading states for major screen transitions', () => {
    [
      'App.js',
      'ReportList.js',
      'PublicProfileScreen.js',
      'FundingContributionScreen.js',
      'PayoutSetupScreen.js',
      'CleanupSubmissionScreen.js',
      'CleanupReviewScreen.js',
    ].forEach((fileName) => {
      expect(readMobileSource(fileName)).toContain('BrandedLoadingState');
    });
  });

  it('keeps the branded opening screen visible until the map and reports are ready', () => {
    const source = readMobileSource('MapScreen.js');
    expect(source).toContain('Opening the Litterbugs map…');
    expect(source).toContain('onMapReady={() => setMapReady(true)}');
    expect(source).toContain('onMapLoaded={() => {');
    expect(source).toContain('if (!mapSurfaceLoaded || reportsLoading) return undefined;');
    expect(source).toContain('initialMapLoadingOpacity');
  });

  it('keeps action context visible while forms and cleanup actions are busy', () => {
    expect(readMobileSource('AuthScreen.js')).toContain('Signing in…');
    expect(readMobileSource('CompleteProfileScreen.js')).toContain('Saving profile…');
    expect(readMobileSource('MapScreen.js')).toContain('Opening claim…');
    expect(readMobileSource('CleanupSubmissionScreen.js')).toContain('Uploading cleanup photos…');
  });

  it('does not show a false empty reports message during the initial fetch', () => {
    const source = readMobileSource('ReportList.js');
    expect(source).toContain('initialLoading');
    expect(source).toContain('Loading nearby reports…');
  });
});
