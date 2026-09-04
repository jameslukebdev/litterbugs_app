import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readMobileSource = (name) => readFileSync(
  new URL(`../${name}`, import.meta.url),
  'utf8',
);

describe('mobile loading experience', () => {
  it('uses a still branded loader and reserves motion for active work', () => {
    const source = readMobileSource('BrandedLoadingState.js');
    expect(source).not.toContain('Animated.loop');
    expect(source).not.toContain('progressTrack');
    expect(source).toContain('logoOnly');
    expect(source).toContain('working ?');
    expect(source).toContain('ActivityIndicator');
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
    const appSource = readMobileSource('App.js');
    const source = readMobileSource('MapScreen.js');
    expect(appSource).toContain('launchOverlay');
    expect(appSource).toContain('SplashScreen.hideAsync()');
    expect(readMobileSource('index.js')).toContain('SplashScreen.preventAutoHideAsync()');
    expect(source).toContain('<BrandedLoadingState logoOnly />');
    expect(source).toContain('onMapReady={() => setMapReady(true)}');
    expect(source).toContain('onMapLoaded={() => {');
    expect(source).toContain('if (!mapSurfaceLoaded || reportsLoading) return undefined;');
    expect(source).not.toContain('initialMapLoadingOpacity');
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
