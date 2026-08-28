import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const configureApp = require('../app.config.js');
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
});
