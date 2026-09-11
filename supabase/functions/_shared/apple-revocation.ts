import { serviceClient } from './funded-cleanup.ts';
import { configuredAppleClient, decryptAppleToken, revokeAppleToken } from './apple-tokens.ts';

export async function processAppleRevocation(admin: ReturnType<typeof serviceClient>, ownerId?: string) {
  const { data: item, error } = await admin.rpc('claim_apple_revocation', { target_owner: ownerId ?? null });
  if (error) throw error;
  if (!item) return { pending: false };
  let succeeded = false;
  try {
    const client = configuredAppleClient(Deno.env.get('APPLE_SIGN_IN_CLIENTS'), item.client_id);
    const encryptionKey = Deno.env.get('APPLE_TOKEN_ENCRYPTION_KEY');
    if (!client || !encryptionKey) throw new Error('apple_configuration_unavailable');
    const token = await decryptAppleToken(item.encrypted_token, encryptionKey, item.owner_id, item.client_id);
    await revokeAppleToken(client, token);
    succeeded = true;
  } catch {
    console.error('Apple authorization revocation remains queued');
  }
  const { error: finishError } = await admin.rpc('finish_apple_revocation', {
    target_owner: item.owner_id, target_client: item.client_id, succeeded,
  });
  if (finishError) throw finishError;
  return { pending: !succeeded };
}
