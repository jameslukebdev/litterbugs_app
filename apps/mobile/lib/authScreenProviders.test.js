import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const authScreenSource = readFileSync(
  new URL('../AuthScreen.js', import.meta.url),
  'utf8'
);

describe('mobile sign-in providers', () => {
  it('always offers Facebook alongside Google and email', () => {
    expect(authScreenSource).toContain("id: 'google'");
    expect(authScreenSource).toContain("id: 'facebook'");
    expect(authScreenSource).toContain("label: 'Continue with Facebook'");
    expect(authScreenSource).not.toContain('FACEBOOK_LOGIN_ENABLED');
  });
});
