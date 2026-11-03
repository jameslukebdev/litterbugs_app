import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { mobileUpdatePlan } from '../../../scripts/mobile-update.mjs';

const require = createRequire(import.meta.url);
const config = require('../app.json').expo;
const profiles = require('../eas.json').build;
const dependencies = require('../package.json').dependencies;

describe('mobile over-the-air updates', () => {
  it('uses the existing Litterbugs EAS project and checks in the background', () => {
    expect(dependencies['expo-updates']).toMatch(/^~29\./);
    expect(config.updates).toEqual({
      url: `https://u.expo.dev/${config.extra.eas.projectId}`,
      enabled: true, checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0,
    });
    expect(config.runtimeVersion).toEqual({ policy: 'appVersion' });
    expect(config.version).toBe('2.0.1');
    expect(config.platforms).toEqual(['ios', 'android']);
  });

  it('isolates public, production-test, and QA builds', () => {
    expect(profiles.production.channel).toBe('production');
    expect(profiles['production-internal'].channel).toBe('production-preview');
    expect(profiles['production-simulator'].channel).toBe('production-preview');
    expect(profiles.preview.channel).toBe('preview');
    expect(profiles.development.channel).toBe('development');
    expect(profiles['production-internal'].env).toEqual(profiles.production.env);
    expect(profiles['production-simulator'].env).toEqual(profiles.production.env);
  });

  it('publishes a production test using production configuration rather than local QA settings', () => {
    const plan = mobileUpdatePlan('production-preview', ['--message', 'Payout guidance', '--dry-run'], {
      APP_VARIANT: 'qa', IOS_BUNDLE_IDENTIFIER: 'qa.bundle', EAS_BUILD_PLATFORM: 'ios', EAS_BUILD: 'true',
    });
    expect(plan.dryRun).toBe(true);
    expect(plan.args).toContain('production-preview');
    expect(plan.args.slice(plan.args.indexOf('--environment'), plan.args.indexOf('--environment') + 2))
      .toEqual(['--environment', 'production']);
    expect(plan.env.APP_VARIANT).toBe('production');
    expect(plan.env.IOS_BUNDLE_IDENTIFIER).toBe('com.litterbugs.app');
    expect(plan.env.EXPO_NO_DOTENV).toBe('1');
    expect(plan.env.EAS_BUILD_PLATFORM).toBeUndefined();
    expect(plan.env.EAS_BUILD).toBeUndefined();
  });

  it('passes messages literally and supports staged public rollouts', () => {
    const message = 'Fix payout setup: $5 `literal`';
    const plan = mobileUpdatePlan('production', ['--message', message, '--rollout-percentage', '10', '--platform', 'android']);
    expect(plan.args).toContain(message);
    expect(plan.args.slice(-2)).toEqual(['--rollout-percentage', '10']);
    expect(plan.env).toMatchObject(profiles.production.env);
  });

  it.each([
    ['qa', ['--message', 'test']],
    ['production', []],
    ['production', ['--message', 'test', '--channel', 'preview']],
    ['production', ['--message', 'test', '--environment', 'preview']],
    ['production', ['--message', 'test', '--platform', 'web']],
    ['production', ['--message', 'test', '--rollout-percentage', '101']],
    ['production', ['--message', 'test', '--rollout-percentage', '1.5']],
  ])('rejects ambiguous or conflicting publication options: %s %j', (target, args) => {
    expect(() => mobileUpdatePlan(target, args)).toThrow();
  });
});
