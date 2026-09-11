import { base64url, exportPKCS8, generateKeyPair } from 'npm:jose@6.2.12';
import { encryptAppleToken } from './apple-tokens.ts';
import { processAppleRevocation } from './apple-revocation.ts';

const assert = (condition: unknown) => { if (!condition) throw new Error('Assertion failed'); };
type Admin = Parameters<typeof processAppleRevocation>[0];

Deno.test('Apple worker leaves an empty queue alone', async () => {
  const calls: string[] = [];
  const admin = { rpc: async (name: string) => {
    calls.push(name);
    return { data: null, error: null };
  } } as unknown as Admin;
  const result = await processAppleRevocation(admin);
  assert(result.pending === false && calls.join() === 'claim_apple_revocation');
});

Deno.test('Apple worker retains failures and completes only confirmed revocation', async () => {
  const priorClients = Deno.env.get('APPLE_SIGN_IN_CLIENTS');
  const priorKey = Deno.env.get('APPLE_TOKEN_ENCRYPTION_KEY');
  const originalFetch = globalThis.fetch;
  const key = base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
  const signing = await generateKeyPair('ES256', { extractable: true });
  const client = { clientId: 'test.app', teamId: 'TEAM', keyId: 'KEY', privateKey: await exportPKCS8(signing.privateKey) };
  const item = { owner_id: 'test-owner', client_id: client.clientId,
    encrypted_token: await encryptAppleToken('test-refresh-token', key, 'test-owner', client.clientId) };
  const finishes: Record<string, unknown>[] = [];
  const admin = { rpc: async (name: string, args: Record<string, unknown>) => {
    if (name === 'claim_apple_revocation') {
      assert(args.target_owner === item.owner_id);
      return { data: item, error: null };
    }
    assert(name === 'finish_apple_revocation');
    finishes.push(args);
    return { data: null, error: null };
  } } as unknown as Admin;
  let requests = 0;
  let responseStatus = 503;
  globalThis.fetch = (async (url, options) => {
    requests++;
    assert(String(url) === 'https://appleid.apple.com/auth/revoke');
    const fields = new URLSearchParams(options?.body as URLSearchParams);
    assert(fields.get('client_id') === client.clientId);
    assert(fields.get('token') === 'test-refresh-token');
    return new Response(null, { status: responseStatus });
  }) as typeof fetch;
  try {
    Deno.env.delete('APPLE_SIGN_IN_CLIENTS');
    Deno.env.set('APPLE_TOKEN_ENCRYPTION_KEY', key);
    assert((await processAppleRevocation(admin, item.owner_id)).pending);
    assert(requests === 0 && finishes[0].succeeded === false);
    Deno.env.set('APPLE_SIGN_IN_CLIENTS', JSON.stringify([client]));
    assert((await processAppleRevocation(admin, item.owner_id)).pending);
    assert(requests === 1 && finishes[1].succeeded === false);
    responseStatus = 200;
    assert(!(await processAppleRevocation(admin, item.owner_id)).pending);
    assert(requests === 2 && finishes[2].succeeded === true);
    assert(finishes.every((entry) => entry.target_owner === item.owner_id && entry.target_client === item.client_id));
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of [['APPLE_SIGN_IN_CLIENTS', priorClients], ['APPLE_TOKEN_ENCRYPTION_KEY', priorKey]]) {
      if (value === undefined) Deno.env.delete(name!); else Deno.env.set(name!, value);
    }
  }
});
