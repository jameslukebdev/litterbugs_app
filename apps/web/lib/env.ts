const EXPECTED_PROJECT_REF = 'mvaygkflcjswtwchflrk';

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error('Missing the public Supabase URL or publishable key.');
  }

  const endpoint = new URL(url);
  const projectRef = endpoint.hostname.split('.')[0];
  const localDevelopment = process.env.NODE_ENV === 'development'
    && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
  if (projectRef !== EXPECTED_PROJECT_REF && !localDevelopment) {
    throw new Error(`Refusing to connect the website to Supabase project ${projectRef}.`);
  }

  return { url, publishableKey };
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function getGoogleMapsKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '';
}

export function getGoogleMapsMapId() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? '';
}
