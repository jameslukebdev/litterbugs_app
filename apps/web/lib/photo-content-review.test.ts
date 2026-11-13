import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { requireGooglePhotoReview } from './photo-content-review';
const env = { GEMINI_RELAY_URL: 'https://relay.example', GEMINI_RELAY_SHARED_SECRET: 'test-only-secret-with-more-than-32-characters' };
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
describe('Google content moderation transport', () => {
  it('sends only reconstructed image bytes to the configured fixed endpoint', async () => {
    const fetchImpl = vi.fn(async (_url: URL | string | Request, _init?: RequestInit) => response({decision:'allow'}));
    await requireGooglePhotoReview(new Uint8Array([1,2,3]), {env,fetchImpl});
    const [url,init] = fetchImpl.mock.calls[0];
    expect(url.toString()).toBe('https://relay.example/v1/content-check');
    expect(JSON.parse(String(init!.body))).toEqual({mimeType:'image/jpeg',data:'AQID'});
    expect(init).toMatchObject({redirect:'error',credentials:'omit',cache:'no-store'});
  });
  it('rejects a prohibited-content verdict', async () => {
    await expect(requireGooglePhotoReview(new Uint8Array([1]), {env,fetchImpl:async()=>response({decision:'reject'})})).rejects.toMatchObject({code:'MEDIA_CONTENT_REJECTED',status:422});
  });
  it.each([{decision:'pass'},{decision:'allow',extra:true},{},null])('fails closed on invalid verdicts', async value => {
    await expect(requireGooglePhotoReview(new Uint8Array([1]), {env,fetchImpl:async()=>response(value)})).rejects.toMatchObject({code:'MEDIA_CONTENT_UNAVAILABLE'});
  });
  it('fails closed for missing/unsafe configuration, provider failure and timeout', async () => {
    for(const value of [{}, {...env,GEMINI_RELAY_URL:'http://relay.example'}, {...env,GEMINI_RELAY_URL:'https://relay.example/other'}, {...env,GEMINI_RELAY_SHARED_SECRET:'short'}]) await expect(requireGooglePhotoReview(new Uint8Array([1]), {env:value})).rejects.toMatchObject({code:'MEDIA_CONTENT_UNAVAILABLE'});
    for(const fetchImpl of [async()=>response({},429),async()=>{throw new Error('timeout');}]) await expect(requireGooglePhotoReview(new Uint8Array([1]),{env,fetchImpl})).rejects.toMatchObject({code:'MEDIA_CONTENT_UNAVAILABLE'});
  });
});
