// Local-only, read-only bridge to the installed SEO SDK's public OAuth client.
// Refresh credentials remain in its own store; access tokens never leave this
// process. Batching avoids competing CLI cache writers during dashboard refresh.
import { pathToFileURL } from 'node:url';

const stop = setTimeout(() => { process.stderr.write('Google reports unavailable\n'); process.exit(1); }, 25_000);
try {
  if (process.env.NODE_ENV !== 'development' || process.env.ADMIN_ANALYTICS_GOOGLE_LOCAL_CLI !== 'true') throw new Error('Local access only');
  const kind = process.argv[2];
  if (kind !== 'ga' && kind !== 'gsc') throw new Error('Unsupported report');
  const bodies = JSON.parse(process.argv[3]);
  if (!Array.isArray(bodies) || bodies.length !== 3 || !process.env.ADMIN_ANALYTICS_GOOGLE_SDK_MODULE) throw new Error('Invalid report group');
  const { createGoogleAccessTokenClient } = await import(pathToFileURL(process.env.ADMIN_ANALYTICS_GOOGLE_SDK_MODULE).href);
  const { client } = await createGoogleAccessTokenClient();
  const token = await client.getAccessToken();
  if (typeof token !== 'string' || !token) throw new Error('Authorization unavailable');
  const url = kind === 'ga'
    ? 'https://analyticsdata.googleapis.com/v1beta/properties/561329300:runReport'
    : 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Alitterbugs.app/searchAnalytics/query';
  const results = await Promise.all(bodies.map(async (body, index) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8_000) });
        if (!response.ok) {
          if (attempt === 0 && [500, 502, 503, 504].includes(response.status)) { await response.body?.cancel(); continue; }
          throw Object.assign(new Error('Report unavailable'), { diagnostic: `${kind}:${index}:HTTP${response.status}` });
        }
        return await response.json();
      } catch (error) {
        if (attempt === 0 && ['TypeError', 'TimeoutError'].includes(error.name)) continue;
        throw Object.assign(new Error('Report unavailable'), { diagnostic: error.diagnostic ?? `${kind}:${index}:network` });
      }
    }
  }));
  process.stdout.write(JSON.stringify(results));
} catch (error) {
  // Never print a provider payload, credential or authentication-store detail.
  const diagnostic = typeof error.diagnostic === 'string' && /^(ga|gsc):[0-2]:(HTTP\d{3}|network)$/.test(error.diagnostic) ? ` (${error.diagnostic})` : '';
  process.stderr.write(`Google reports unavailable${diagnostic}\n`); process.exitCode = 1;
} finally { clearTimeout(stop); }
