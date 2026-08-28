import { describe, expect, it } from 'vitest';

import { GET as getAndroidAssociation } from '@/app/.well-known/assetlinks.json/route';
import { GET as getAppleAssociation } from '@/app/.well-known/apple-app-site-association/route';

describe('mobile link associations', () => {
  it('associates shared report paths with both Apple transfer identities', async () => {
    const response = getAppleAssociation();
    const body = await response.json();

    expect(response.headers.get('content-type')).toContain('application/json');
    expect(body.applinks.details[0]).toMatchObject({
      appIDs: [
        'DB39U76V6Q.com.litterbugs.app',
        'RLXNU225W4.com.litterbugs.app',
      ],
      components: [{ '/': '/reports/*' }],
    });
  });

  it('uses the production Android package and EAS signing certificate', async () => {
    const response = getAndroidAssociation();
    const body = await response.json();

    expect(response.headers.get('content-type')).toContain('application/json');
    expect(body[0].target).toEqual({
      namespace: 'android_app',
      package_name: 'com.litterbugs.app',
      sha256_cert_fingerprints: [
        '2C:0A:31:66:6C:8C:7A:35:04:E9:0D:8E:B8:15:01:67:30:75:40:11:2F:96:90:51:B0:36:AB:13:C1:B0:AA:0E',
      ],
    });
  });
});
