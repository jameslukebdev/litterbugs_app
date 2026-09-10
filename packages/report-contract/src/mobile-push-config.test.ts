import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const configure = require('../../../apps/mobile/app.config.js');
const config = require('../../../apps/mobile/app.json').expo;

afterEach(() => vi.unstubAllEnvs());

describe('Android notification configuration', () => {
  it.each(['production', 'qa'])('matches the %s application identity', (variant) => {
    vi.stubEnv('APP_VARIANT', variant);
    vi.stubEnv('EAS_BUILD_PLATFORM', 'android');
    vi.stubEnv('ANDROID_PACKAGE_IDENTIFIER', '');
    vi.stubEnv('EAS_BUILD', 'false');
    const resolved = configure({ config });
    const firebase = JSON.parse(readFileSync(new URL(
      `../../../apps/mobile/${resolved.android.googleServicesFile}`,
      import.meta.url,
    ), 'utf8'));

    expect(firebase.project_info.project_id).toBe('litterbugs-notifications');
    expect(firebase.client.some((client: {
      client_info: { android_client_info: { package_name: string } };
    }) => client.client_info.android_client_info.package_name === resolved.android.package)).toBe(true);
  });

  it('does not add Firebase configuration to iOS builds', () => {
    vi.stubEnv('EAS_BUILD_PLATFORM', 'ios');
    vi.stubEnv('EAS_BUILD', 'false');
    expect(configure({ config }).android.googleServicesFile).toBeUndefined();
  });
});
