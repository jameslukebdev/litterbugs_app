import 'server-only';
import { MediaSecurityError } from './media-security';

export async function requireGooglePhotoReview(
  bytes: Uint8Array,
  options: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch } = {},
) {
  const env = options.env ?? process.env;
  const unavailable = () => new MediaSecurityError('MEDIA_CONTENT_UNAVAILABLE', 503, 'Photo content checking is temporarily unavailable. Please try again shortly.');
  const secret = env.GEMINI_RELAY_SHARED_SECRET ?? '';
  let endpoint: URL;
  try {
    endpoint = new URL(env.GEMINI_RELAY_URL ?? '');
    if (endpoint.protocol !== 'https:' || endpoint.origin !== env.GEMINI_RELAY_URL || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw unavailable();
    endpoint.pathname = '/v1/content-check';
  } catch { throw unavailable(); }
  if (secret.length < 32 || /\s/.test(secret)) throw unavailable();
  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint, {
      method: 'POST', redirect: 'error', cache: 'no-store', credentials: 'omit',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mimeType: 'image/jpeg', data: Buffer.from(bytes).toString('base64') }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok || Number(response.headers.get('content-length') ?? 0) > 1024) throw unavailable();
    const resultBytes = new Uint8Array(await response.arrayBuffer());
    if (resultBytes.length < 1 || resultBytes.length > 1024) throw unavailable();
    const result: unknown = JSON.parse(new TextDecoder().decode(resultBytes));
    if (!result || typeof result !== 'object' || Array.isArray(result) || Object.keys(result).length !== 1 || !('decision' in result) || !['allow', 'reject'].includes(String(result.decision))) throw unavailable();
    if (result.decision !== 'allow') throw new MediaSecurityError('MEDIA_CONTENT_REJECTED', 422, 'This photo may contain inappropriate content. Choose another photo. If this seems wrong, contact admin@litterbugs.app.');
  } catch (error) {
    if (error instanceof MediaSecurityError) throw error;
    throw unavailable();
  }
}
