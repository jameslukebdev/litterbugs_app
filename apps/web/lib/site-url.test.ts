import { expect, it } from 'vitest';
import { resolveSiteUrl } from './site-url';
it('keeps local builds local and permits explicit preview origins', () => {
  expect(resolveSiteUrl(undefined)).toBe('http://localhost:3000');
  expect(resolveSiteUrl('http://127.0.0.1:3000/')).toBe(
    'http://127.0.0.1:3000',
  );
  expect(resolveSiteUrl('https://preview.example.com', 'preview')).toBe(
    'https://preview.example.com',
  );
});
it.each([
  undefined,
  'http://localhost:3000',
  'https://www.litterbugs.app',
  'http://litterbugs.app',
])('rejects an unsafe production canonical origin %s', (value) => {
  expect(() => resolveSiteUrl(value, 'production')).toThrow(
    'Production requires',
  );
});
it('uses the canonical production origin', () =>
  expect(resolveSiteUrl('https://litterbugs.app/', 'production')).toBe(
    'https://litterbugs.app',
  ));
it.each([
  'https://litterbugs.app/path',
  'https://litterbugs.app/?token=x',
  'https://user:pass@litterbugs.app',
  'ftp://litterbugs.app',
])('rejects paths, credentials and non-web URLs %s', (value) =>
  expect(() => resolveSiteUrl(value)).toThrow(),
);
