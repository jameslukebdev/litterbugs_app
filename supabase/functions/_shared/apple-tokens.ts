import {
  base64url, CompactEncrypt, compactDecrypt, createRemoteJWKSet,
  importPKCS8, jwtVerify, SignJWT,
} from 'npm:jose@6.2.12';

const APPLE_ISSUER = 'https://appleid.apple.com';
const appleKeys = createRemoteJWKSet(new URL(`${APPLE_ISSUER}/auth/keys`));

export type AppleClient = {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
};

export class AppleTokenError extends Error {
  constructor(public code: string) { super(code); }
}

// Select only an explicitly configured client. A QA team/key must never be used
// as a fallback for the production app's different Apple developer team.
export function configuredAppleClient(raw: string | undefined, clientId: string): AppleClient | null {
  if (!raw) return null;
  let clients: unknown;
  try { clients = JSON.parse(raw); } catch { throw new AppleTokenError('apple_configuration_invalid'); }
  if (!Array.isArray(clients)) throw new AppleTokenError('apple_configuration_invalid');
  const client = clients.find((item) => item?.clientId === clientId);
  if (!client) return null;
  if (![client.clientId, client.teamId, client.keyId, client.privateKey].every((value) => typeof value === 'string' && value.length > 0)) {
    throw new AppleTokenError('apple_configuration_invalid');
  }
  return client as AppleClient;
}

async function clientSecret(client: AppleClient): Promise<string> {
  const key = await importPKCS8(client.privateKey, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: client.keyId })
    .setIssuer(client.teamId).setSubject(client.clientId).setAudience(APPLE_ISSUER)
    .setIssuedAt().setExpirationTime('5m').sign(key);
}

export async function verifyAppleIdentity(token: string, clientId: string, subject: string) {
  const { payload } = await jwtVerify(token, appleKeys, {
    issuer: APPLE_ISSUER, audience: clientId, subject, algorithms: ['RS256'],
    requiredClaims: ['exp', 'iat', 'sub', 'aud'],
  });
  return payload;
}

type Dependencies = {
  fetch?: typeof fetch;
  verifyIdentity?: typeof verifyAppleIdentity;
};

// Caller supplies the Apple subject from the authenticated Supabase identity,
// never from request input. Verify both tokens before associating credentials.
export async function exchangeAppleCode(
  client: AppleClient,
  input: { authorizationCode: string; identityToken: string; subject: string },
  dependencies: Dependencies = {},
): Promise<string> {
  const verify = dependencies.verifyIdentity ?? verifyAppleIdentity;
  await verify(input.identityToken, client.clientId, input.subject);
  const response = await (dependencies.fetch ?? fetch)(`${APPLE_ISSUER}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: client.clientId, client_secret: await clientSecret(client),
      grant_type: 'authorization_code', code: input.authorizationCode,
    }),
    signal: AbortSignal.timeout(10000),
  });
  // Do not include Apple's response body or credentials in logs/errors.
  if (!response.ok) throw new AppleTokenError('apple_code_exchange_failed');
  const body = await response.json();
  if (typeof body.id_token !== 'string' || typeof body.refresh_token !== 'string' || !body.refresh_token) {
    throw new AppleTokenError('apple_token_response_invalid');
  }
  await verify(body.id_token, client.clientId, input.subject);
  return body.refresh_token;
}

export async function revokeAppleToken(client: AppleClient, refreshToken: string, send: typeof fetch = fetch) {
  const response = await send(`${APPLE_ISSUER}/auth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: client.clientId, client_secret: await clientSecret(client),
      token: refreshToken, token_type_hint: 'refresh_token',
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new AppleTokenError('apple_token_revocation_failed');
}

function encryptionKey(encoded: string) {
  const key = base64url.decode(encoded);
  if (key.length !== 32) throw new AppleTokenError('apple_encryption_key_invalid');
  return key;
}

// Authenticated encryption binds the stored secret to its owner and client.
// Copying ciphertext into another account's row must not make it usable there.
export async function encryptAppleToken(token: string, key: string, owner: string, clientId: string) {
  return new CompactEncrypt(new TextEncoder().encode(JSON.stringify({ token, owner, clientId })))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).encrypt(encryptionKey(key));
}

export async function decryptAppleToken(ciphertext: string, key: string, owner: string, clientId: string) {
  const { plaintext } = await compactDecrypt(ciphertext, encryptionKey(key), {
    keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'],
  });
  const value = JSON.parse(new TextDecoder().decode(plaintext));
  if (value.owner !== owner || value.clientId !== clientId || typeof value.token !== 'string' || !value.token) {
    throw new AppleTokenError('apple_token_owner_mismatch');
  }
  return value.token as string;
}
