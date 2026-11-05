import { describe, expect, it } from 'vitest';
import { googleBrowserHandoff, googleSignInNext, isEmbeddedSocialBrowser } from './google-browser-handoff';

const next = '/map?report=abc&intent=fund#map=36,-81,12';
describe('external Google browser handoff', () => {
  it('opens a fresh entry in Android Chrome with a safe fallback', () => {
    const result = googleBrowserHandoff('https://litterbugs.app', next, 'Android Instagram')!;
    expect(result).toContain('intent://litterbugs.app/auth/google?next=');
    expect(result).toContain(';scheme=https;package=com.android.chrome;');
    const entry = new URL(result.split('#Intent')[0].replace('intent:', 'https:'));
    expect(entry.searchParams.get('next')).toBe(next);
    const fallback = new URL(decodeURIComponent(result.split('S.browser_fallback_url=')[1].split(';end')[0]));
    expect(fallback.pathname).toBe('/sign-in');
    expect(fallback.searchParams.get('next')).toBe(next);
    expect(fallback.searchParams.get('google')).toBe('browser');
    expect(result).not.toMatch(/code_challenge|code_verifier|access_token/);
  });
  it('requests Safari on iPhone without corrupting nested URLs', () => {
    const result = googleBrowserHandoff('https://litterbugs.app', next, 'iPhone Instagram')!;
    const entry = new URL(result.replace('x-safari-https:', 'https:'));
    expect(entry.pathname).toBe('/auth/google');
    expect(entry.searchParams.get('next')).toBe(next);
  });
  it('falls back for unsupported platforms and non-HTTPS Safari links', () => {
    expect(googleBrowserHandoff('https://litterbugs.app', next, 'Unknown Instagram')).toBeNull();
    expect(googleBrowserHandoff('http://localhost:3000', next, 'iPhone Instagram')).toBeNull();
  });
  it.each(['https://evil.example', '//evil.example', '/\t/evil.example', '/auth/google?next=/auth/google', '/sign-in'])('rejects an unsafe or looping destination %s', value => {
    expect(['/', '/account']).toContain(googleSignInNext(value));
  });
  it.each(['Instagram', 'FBAN/FBIOS', 'FBAV/400', 'FB_IAB'])('recognizes %s', ua => {
    expect(isEmbeddedSocialBrowser(ua)).toBe(true);
  });
  it('leaves normal Safari alone', () => {
    expect(isEmbeddedSocialBrowser('iPhone Version/18.0 Mobile Safari/604.1')).toBe(false);
  });
});
