import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mobilePackage = JSON.parse(readFileSync(
  new URL('../../../apps/mobile/package.json', import.meta.url),
  'utf8',
));
const appJson = JSON.parse(readFileSync(
  new URL('../../../apps/mobile/app.json', import.meta.url),
  'utf8',
)).expo;
const easJson = JSON.parse(readFileSync(
  new URL('../../../apps/mobile/eas.json', import.meta.url),
  'utf8',
));

describe('mobile configuration non-regression', () => {
  it('keeps the existing application and EAS identity unchanged', () => {
    expect(appJson).toMatchObject({
      name: 'Litterbugs',
      slug: 'litterbugs-partner',
      scheme: 'litterbugs',
      owner: 'litterbugs-community-cleanup',
      ios: {
        bundleIdentifier: 'com.litterbugs.app',
      },
      android: {
        package: 'com.litterbugs.app',
      },
      extra: {
        eas: {
          projectId: 'df0d0855-71d9-4943-b278-d1f083ab6b06',
        },
      },
    });
    expect(appJson.plugins).toEqual([
      'expo-secure-store',
      'expo-web-browser',
      'expo-notifications',
      [
        'expo-image-picker',
        {
          photosPermission: 'Litterbugs uses your photos when you choose report or profile pictures.',
          cameraPermission: 'Litterbugs uses your camera when you take report or profile pictures.',
          microphonePermission: false,
        },
      ],
    ]);
  });

  it('keeps every existing build profile and environment mapping unchanged', () => {
    expect(easJson.cli).toEqual({
      version: '>= 16.0.0',
      appVersionSource: 'remote',
    });
    expect(easJson.build).toEqual({
      development: {
        environment: 'development',
        env: {
          APP_VARIANT: 'qa',
          ENABLE_APPLE_PAY: 'false',
          IOS_BUNDLE_IDENTIFIER: 'com.gegibson.litterbugs.qa',
          ANDROID_PACKAGE_IDENTIFIER: 'com.litterbugs.app.qa',
        },
        developmentClient: true,
        distribution: 'internal',
      },
      'development-simulator': {
        environment: 'development',
        env: {
          APP_VARIANT: 'qa',
          ENABLE_APPLE_PAY: 'false',
          IOS_BUNDLE_IDENTIFIER: 'com.gegibson.litterbugs.qa',
          ANDROID_PACKAGE_IDENTIFIER: 'com.litterbugs.app.qa',
        },
        developmentClient: true,
        distribution: 'internal',
        ios: { simulator: true },
      },
      'production-simulator': {
        environment: 'production',
        env: {
          APP_VARIANT: 'production',
          ENABLE_APPLE_PAY: 'false',
          IOS_BUNDLE_IDENTIFIER: 'com.litterbugs.app',
          ANDROID_PACKAGE_IDENTIFIER: 'com.litterbugs.app',
        },
        developmentClient: true,
        distribution: 'internal',
        ios: { simulator: true },
      },
      'development-primary': {
        environment: 'production',
        env: {
          APP_VARIANT: 'production',
          ENABLE_APPLE_PAY: 'false',
          IOS_BUNDLE_IDENTIFIER: 'com.litterbugs.app',
          ANDROID_PACKAGE_IDENTIFIER: 'com.litterbugs.app',
        },
        developmentClient: true,
        distribution: 'internal',
      },
      preview: {
        environment: 'preview',
        env: {
          APP_VARIANT: 'qa',
          ENABLE_APPLE_PAY: 'false',
          IOS_BUNDLE_IDENTIFIER: 'com.gegibson.litterbugs.qa',
          ANDROID_PACKAGE_IDENTIFIER: 'com.litterbugs.app.qa',
        },
        distribution: 'internal',
      },
      production: {
        environment: 'production',
        env: {
          APP_VARIANT: 'production',
          ENABLE_APPLE_PAY: 'false',
          ANDROID_PACKAGE_IDENTIFIER: 'com.litterbugs.app',
        },
        autoIncrement: true,
      },
      'production-internal': {
        environment: 'production',
        env: {
          APP_VARIANT: 'production',
          ENABLE_APPLE_PAY: 'false',
          IOS_BUNDLE_IDENTIFIER: 'com.litterbugs.app',
          ANDROID_PACKAGE_IDENTIFIER: 'com.litterbugs.app',
        },
        distribution: 'internal',
      },
    });
  });

  it('keeps the existing mobile runtime versions separate from web upgrades', () => {
    expect(mobilePackage.dependencies).toMatchObject({
      '@react-native-google-signin/google-signin': '16.1.4',
      '@supabase/supabase-js': '2.87.1',
      expo: '~54.0.37',
      react: '19.1.0',
      'react-native': '0.81.5',
      'react-native-maps': '1.20.1',
    });
  });
});
