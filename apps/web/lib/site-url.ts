export function resolveSiteUrl(
  value: string | undefined,
  deploymentEnvironment?: string,
) {
  if (
    deploymentEnvironment === 'production' &&
    value !== 'https://litterbugs.app' &&
    value !== 'https://litterbugs.app/'
  ) {
    throw new Error(
      'Production requires NEXT_PUBLIC_SITE_URL=https://litterbugs.app.',
    );
  }
  const url = new URL(value ?? 'http://localhost:3000');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without credentials, path, query, or fragment.',
    );
  }
  return url.origin;
}
