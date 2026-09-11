import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { decodeJwt } from 'npm:jose@6.2.12';
import { authenticatedUser, corsHeaders, jsonResponse, serviceClient } from '../_shared/funded-cleanup.ts';
import { configuredAppleClient, encryptAppleToken, exchangeAppleCode } from '../_shared/apple-tokens.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  const admin = serviceClient();
  const user = await authenticatedUser(request, admin);
  if (!user || user.is_anonymous) return jsonResponse({ error: 'Authentication required' }, 401);
  const identity = user.identities?.find((item) => item.provider === 'apple');
  const subject = identity?.identity_data?.sub;
  if (typeof subject !== 'string' || !subject) return jsonResponse({ error: 'Apple sign-in is required' }, 403);
  try {
    const body = await request.json();
    if (typeof body.authorizationCode !== 'string' || body.authorizationCode.length > 4096 || !body.authorizationCode
      || typeof body.identityToken !== 'string' || body.identityToken.length > 16000) {
      return jsonResponse({ error: 'Invalid Apple sign-in response' }, 400);
    }
    // Decode only to select a configured audience. exchangeAppleCode verifies
    // the signature, issuer, audience, expiry and authenticated user's subject.
    const audience = decodeJwt(body.identityToken).aud;
    if (typeof audience !== 'string') return jsonResponse({ error: 'Invalid Apple sign-in response' }, 400);
    const client = configuredAppleClient(Deno.env.get('APPLE_SIGN_IN_CLIENTS'), audience);
    const encryptionKey = Deno.env.get('APPLE_TOKEN_ENCRYPTION_KEY');
    if (!client || !encryptionKey) return jsonResponse({ error: 'Apple account management is temporarily unavailable' }, 503);
    const refreshToken = await exchangeAppleCode(client, {
      identityToken: body.identityToken, authorizationCode: body.authorizationCode, subject,
    });
    const encrypted = await encryptAppleToken(refreshToken, encryptionKey, user.id, client.clientId);
    const { error } = await admin.rpc('save_apple_authorization', {
      target_owner: user.id, target_client: client.clientId, target_token: encrypted,
    });
    if (error) throw error;
    return jsonResponse({ saved: true });
  } catch {
    // Authorization codes, tokens, provider errors and private keys never enter logs.
    console.error('Apple authorization could not be saved');
    return jsonResponse({ error: 'Apple account management is temporarily unavailable' }, 503);
  }
});
