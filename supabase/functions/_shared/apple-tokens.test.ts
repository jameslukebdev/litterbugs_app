import { base64url, exportPKCS8, generateKeyPair, jwtVerify, SignJWT } from 'npm:jose@6.2.12';
import { configuredAppleClient, decryptAppleToken, encryptAppleToken, exchangeAppleCode, revokeAppleToken } from './apple-tokens.ts';
const assert = (value: unknown) => { if (!value) throw new Error('Assertion failed'); };
async function rejects(run: () => Promise<unknown>) {
  let failed = false;
  try { await run(); } catch { failed = true; }
  assert(failed);
}
const issuer = 'https://appleid.apple.com';

Deno.test('Apple credentials never fall back from production to a QA client', () => {
  assert(configuredAppleClient(JSON.stringify([{ clientId: 'qa', teamId: 'qa-team', keyId: 'key', privateKey: 'private' }]), 'production') === null);
  assert(configuredAppleClient(undefined, 'production') === null);
});

Deno.test('Apple token encryption prevents reading, swapping owners, wrong keys, and tampering', async () => {
  const key = base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
  const encrypted = await encryptAppleToken('refresh-secret', key, 'owner', 'client');
  assert(!encrypted.includes('refresh-secret'));
  assert(await decryptAppleToken(encrypted, key, 'owner', 'client') === 'refresh-secret');
  await rejects(() => decryptAppleToken(encrypted, key, 'other-owner', 'client'));
  await rejects(() => decryptAppleToken(encrypted, key, 'owner', 'other-client'));
  await rejects(() => decryptAppleToken(encrypted, base64url.encode(new Uint8Array(32)), 'owner', 'client'));
  const parts = encrypted.split('.');
  parts[3] = (parts[3][0] === 'A' ? 'B' : 'A') + parts[3].slice(1);
  await rejects(() => decryptAppleToken(parts.join('.'), key, 'owner', 'client'));
});

Deno.test('Apple exchange binds both identities and signs the correct client secret', async () => {
  const signing = await generateKeyPair('ES256', { extractable: true });
  const apple = await generateKeyPair('RS256');
  const client = { clientId: 'app.test', teamId: 'TEAM', keyId: 'KEY', privateKey: await exportPKCS8(signing.privateKey) };
  const idToken = await new SignJWT({}).setProtectedHeader({ alg: 'RS256' })
    .setIssuer(issuer).setAudience(client.clientId).setSubject('apple-subject')
    .setIssuedAt().setExpirationTime('5m').sign(apple.privateKey);
  let sent = 0;
  let verified = 0;
  const dependencies = {
    verifyIdentity: async (token: string, audience: string, subject: string) => {
      verified++;
      return (await jwtVerify(token, apple.publicKey, { issuer, audience, subject, algorithms: ['RS256'] })).payload;
    },
    fetch: (async (url, options) => {
      sent++;
      assert(String(url) === `${issuer}/auth/token`);
      const fields = new URLSearchParams(options?.body as URLSearchParams);
      assert(fields.get('code') === 'one-time-code');
      assert(fields.get('grant_type') === 'authorization_code');
      await jwtVerify(fields.get('client_secret')!, signing.publicKey, { issuer: 'TEAM', subject: client.clientId, audience: issuer, algorithms: ['ES256'] });
      return Response.json({ id_token: idToken, refresh_token: 'refresh-secret' });
    }) as typeof fetch,
  };
  const input = { identityToken: idToken, authorizationCode: 'one-time-code', subject: 'apple-subject' };
  assert(await exchangeAppleCode(client, input, dependencies) === 'refresh-secret');
  assert(sent === 1 && verified === 2);
  await rejects(() => exchangeAppleCode(client, { ...input, subject: 'another-user' }, dependencies));
  assert(sent === 1);
  await rejects(() => exchangeAppleCode(client, input, { ...dependencies, fetch: (async () => Response.json({ id_token: 'forged-token', refresh_token: 'secret' })) as typeof fetch }));
});

Deno.test('Apple revocation uses the refresh-token endpoint and retains retryable failures', async () => {
  const signing = await generateKeyPair('ES256', { extractable: true });
  const client = { clientId: 'app.test', teamId: 'TEAM', keyId: 'KEY', privateKey: await exportPKCS8(signing.privateKey) };
  await revokeAppleToken(client, 'refresh-secret', (async (url, options) => {
    const fields = new URLSearchParams(options?.body as URLSearchParams);
    assert(String(url) === `${issuer}/auth/revoke`);
    assert(fields.get('token') === 'refresh-secret' && fields.get('token_type_hint') === 'refresh_token');
    return new Response(null, { status: 200 });
  }) as typeof fetch);
  await rejects(() => revokeAppleToken(client, 'refresh-secret', (async () => new Response('sensitive provider response', { status: 503 })) as typeof fetch));
});
