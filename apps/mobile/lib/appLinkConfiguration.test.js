import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const configureApp = require('../app.config.js');
const easConfig = require('../eas.json');
const originalEnvironment = { ...process.env };
const baseConfig = {
  name: 'Litterbugs',
  ios: { bundleIdentifier: 'com.litterbugs.app' },
  android: { package: 'com.litterbugs.app' },
  plugins: [],
  extra: {},
};

afterEach(() => {
  process.env = { ...originalEnvironment };
});

describe('app link configuration', () => {
  it('disables the entitlement for every current production-identity iOS build', () => {
    expect(easConfig.build['development-primary'].env.ENABLE_IOS_ASSOCIATED_DOMAINS).toBe('false');
    expect(easConfig.build['production-internal'].env.ENABLE_IOS_ASSOCIATED_DOMAINS).toBe('false');
    expect(easConfig.build.production.env.ENABLE_IOS_ASSOCIATED_DOMAINS).toBe('false');
    expect(easConfig.build.production.env.IOS_BUNDLE_IDENTIFIER).toBe('com.litterbugs.app');
  });

  it('adds verified report links only to the production app identity', () => {
    process.env.APP_VARIANT = 'production';
    process.env.IOS_BUNDLE_IDENTIFIER = 'com.litterbugs.app';
    process.env.ANDROID_PACKAGE_IDENTIFIER = 'com.litterbugs.app';

    const production = configureApp({ config: baseConfig });

    expect(production.ios.associatedDomains).toEqual(['applinks:litterbugs.app']);
    expect(production.android.intentFilters).toEqual([
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{
          scheme: 'https',
          host: 'litterbugs.app',
          pathPrefix: '/reports/',
        }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ]);
  });

  it('does not claim production report links for QA identifiers', () => {
    process.env.APP_VARIANT = 'qa';
    process.env.IOS_BUNDLE_IDENTIFIER = 'com.gegibson.litterbugs.qa';
    process.env.ANDROID_PACKAGE_IDENTIFIER = 'com.litterbugs.app.qa';

    const qa = configureApp({ config: baseConfig });

    expect(qa.ios.associatedDomains).toBeUndefined();
    expect(qa.android.intentFilters).toBeUndefined();
  });

  it('can omit the iOS entitlement while preserving Android and the later enablement path', () => {
    process.env.APP_VARIANT = 'production';
    process.env.IOS_BUNDLE_IDENTIFIER = 'com.litterbugs.app';
    process.env.ANDROID_PACKAGE_IDENTIFIER = 'com.litterbugs.app';
    process.env.ENABLE_IOS_ASSOCIATED_DOMAINS = 'false';

    const interim = configureApp({ config: baseConfig });

    expect(interim.ios.associatedDomains).toBeUndefined();
    expect(interim.android.intentFilters).toHaveLength(1);

    delete process.env.ENABLE_IOS_ASSOCIATED_DOMAINS;
    const final = configureApp({ config: baseConfig });
    expect(final.ios.associatedDomains).toEqual(['applinks:litterbugs.app']);
  });

  it('keeps the current App Store build free of deferred Apple entitlements', () => {
    Object.assign(process.env, easConfig.build.production.env);
    process.env.EAS_BUILD_PLATFORM = 'ios';

    const storeBuild = configureApp({ config: baseConfig });

    expect(storeBuild.ios.bundleIdentifier).toBe('com.litterbugs.app');
    expect(storeBuild.ios.associatedDomains).toBeUndefined();
    expect(storeBuild.extra.stripeApplePayEnabled).toBe(false);
  });
});
