import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mobileUpdatePlan } from '../../../scripts/mobile-update.mjs';

const require = createRequire(import.meta.url);
const config = require('../app.json').expo;
const profiles = require('../eas.json').build;
const dependencies = require('../package.json').dependencies;
const symbolEnvironment = { POSTHOG_CLI_API_KEY: 'phx_local_test_only', POSTHOG_CLI_PROJECT_ID: '695338' };

describe('mobile over-the-air updates', () => {
  it('uses the existing Litterbugs EAS project and checks in the background', () => {
    expect(dependencies['expo-updates']).toMatch(/^~29\./);
    expect(config.updates).toEqual({
      url: `https://u.expo.dev/${config.extra.eas.projectId}`,
      enabled: true, checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0,
    });
    expect(config.runtimeVersion).toEqual({ policy: 'appVersion' });
    expect(config.version).toBe('2.1.1');
    expect(config.platforms).toEqual(['ios', 'android']);
  });

  it('isolates public, production-test, and QA builds', () => {
    expect(profiles.production.channel).toBe('production');
    expect(profiles['production-internal'].channel).toBe('production-preview');
    expect(profiles['production-simulator'].channel).toBe('production-preview');
    expect(profiles.preview.channel).toBe('preview');
    expect(profiles.development.channel).toBe('development');
    // Test builds match production except analytics, which only store builds send,
    // so staff and simulator testing is never counted as visitor traffic.
    const { EXPO_PUBLIC_ANALYTICS_ENABLED: analytics, EXPO_PUBLIC_ANALYTICS_ENVIRONMENT: environment, POSTHOG_UPLOAD_SYMBOLS: symbols, ...productionEnv } = profiles.production.env;
    expect(analytics).toBe('true');
    expect(environment).toBe('production');
    expect(symbols).toBe('true');
    expect(profiles['production-acceptance-android'].env.POSTHOG_UPLOAD_SYMBOLS).toBe('false');
    // The Android acceptance build extends production but never sends analytics.
    expect(profiles['production-acceptance-android'].env.EXPO_PUBLIC_ANALYTICS_ENABLED).toBe('false');
    expect(profiles['production-internal'].env).toEqual(productionEnv);
    expect(profiles['production-simulator'].env).toEqual(productionEnv);
  });

  it('uploads update source maps to PostHog only when asked, with credentials from the environment', () => {
    expect(mobileUpdatePlan('production-preview', ['--message', 'Fix'], {}).symbolUpload).toBeNull();
    expect(() => mobileUpdatePlan('production', ['--message', 'Fix'], {})).toThrow('POSTHOG_UPLOAD_SYMBOLS=true needs');
    expect(() => mobileUpdatePlan('production', ['--message', 'Fix'], { POSTHOG_UPLOAD_SYMBOLS: 'true' }))
      .toThrow('POSTHOG_UPLOAD_SYMBOLS=true needs POSTHOG_CLI_API_KEY, POSTHOG_CLI_PROJECT_ID.');
    const plan = mobileUpdatePlan('production', ['--message', 'Fix'], {
      POSTHOG_UPLOAD_SYMBOLS: 'true', POSTHOG_CLI_API_KEY: 'phx_secret_value', POSTHOG_CLI_PROJECT_ID: '1',
    });
    expect(plan.env.POSTHOG_UPLOAD_SYMBOLS).toBe('true'); // metro.config.js adds debug IDs to the bundles
    expect(plan.symbolUpload.args).toEqual(['--yes', '@posthog/cli@0.19.0', 'hermes', 'upload', '--directory', 'dist', '--skip-on-conflict']);
    expect(JSON.stringify([plan.args, plan.symbolUpload])).not.toContain('phx_secret_value');
  });

  it.each([
    [0, 0, 0, 2], // publish succeeds, then symbol upload succeeds
    [7, 0, 7, 1], // publish fails: never upload stale maps
    [0, 9, 1, 2], // published update remains live, but diagnostics failure is reported
  ])('runs symbol upload only after a successful publish (%i, %i)', (publishExit, uploadExit, expectedExit, calls) => {
    const directory = mkdtempSync(join(tmpdir(), 'lb-update-test-'));
    try {
      const logPath = join(directory, 'calls.jsonl');
      // Every child command resolves to this stub. No EAS or PostHog CLI runs.
      const executable = join(directory, 'npx');
      writeFileSync(executable, `#!${process.execPath}\nconst fs = require('node:fs');\nconst args = process.argv.slice(2);\nfs.appendFileSync(process.env.LB_TEST_CALLS, JSON.stringify(args) + '\\n');\nprocess.exit(args.includes('eas-cli@27.1.0') ? +process.env.LB_TEST_PUBLISH_EXIT : +process.env.LB_TEST_UPLOAD_EXIT);\n`);
      chmodSync(executable, 0o755);
      const result = spawnSync(process.execPath, [fileURLToPath(new URL('../../../scripts/mobile-update.mjs', import.meta.url)), 'production', '--message', 'Local stub only'], {
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, POSTHOG_UPLOAD_SYMBOLS: 'true',
          POSTHOG_CLI_API_KEY: 'phx_local_test_only', POSTHOG_CLI_PROJECT_ID: '1',
          LB_TEST_CALLS: logPath, LB_TEST_PUBLISH_EXIT: String(publishExit), LB_TEST_UPLOAD_EXIT: String(uploadExit) },
        encoding: 'utf8',
      });
      expect(result.status).toBe(expectedExit);
      const commands = readFileSync(logPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
      expect(commands).toHaveLength(calls);
      if (calls === 2) expect(commands[1]).toContain('upload');
      if (publishExit === 0 && uploadExit !== 0) expect(result.stderr).toContain('update was published');
      expect(result.stdout + result.stderr).not.toContain('phx_local_test_only');
    } finally { rmSync(directory, { recursive: true, force: true }); }
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
    const plan = mobileUpdatePlan('production', ['--message', message, '--rollout-percentage', '10', '--platform', 'android'], symbolEnvironment);
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
