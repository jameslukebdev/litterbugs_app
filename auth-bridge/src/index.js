import litterbugsLogo from '../../assets/LB_Logo_PNG.png';

const SUPABASE_ORIGIN = 'https://mvaygkflcjswtwchflrk.supabase.co';
const SUPABASE_AUTHORIZE_PATH = '/auth/v1/authorize';
const APP_CALLBACK_URL = 'litterbugs://auth/callback';

const securityHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Security-Policy': [
    "default-src 'none'",
    "img-src 'self'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const plainText = (body, status = 200) => new Response(body, {
  status,
  headers: {
    ...securityHeaders,
    'Content-Type': 'text/plain; charset=utf-8',
  },
});

const getValidatedTarget = (requestUrl) => {
  const rawTarget = requestUrl.searchParams.get('target');
  if (!rawTarget || rawTarget.includes('<') || rawTarget.includes('>')) return null;

  let target;
  try {
    target = new URL(rawTarget);
  } catch {
    return null;
  }

  const validTarget = target.origin === SUPABASE_ORIGIN
    && target.pathname === SUPABASE_AUTHORIZE_PATH
    && !target.username
    && !target.password
    && target.searchParams.get('provider') === 'facebook'
    && target.searchParams.get('redirect_to') === APP_CALLBACK_URL;

  return validTarget ? target.toString() : null;
};

const renderConnectingPage = (target) => {
  const safeTarget = JSON.stringify(target).replace(/</g, '\\u003c');
  const escapedTarget = target
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>Connecting to Facebook | Litterbugs</title>
    <style>
      * { box-sizing: border-box; }
      html, body { min-height: 100%; }
      body {
        margin: 0;
        display: grid;
        place-items: center;
        background: #f5f6f7;
        color: #2b2b2b;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(100%, 420px);
        padding: 40px 28px;
        text-align: center;
      }
      img {
        display: block;
        width: 170px;
        height: 118px;
        margin: 0 auto 26px;
        object-fit: contain;
      }
      h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.2; }
      p { margin: 0; color: #68717c; font-size: 16px; line-height: 1.45; }
      .spinner {
        width: 32px;
        height: 32px;
        margin: 28px auto 0;
        border: 3px solid #d8e6d9;
        border-top-color: #2e7d32;
        border-radius: 50%;
        animation: spin .8s linear infinite;
      }
      a { display: inline-block; margin-top: 28px; color: #2e7d32; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
    </style>
  </head>
  <body>
    <main>
      <img src="/litterbugs-logo.png" alt="Litterbugs" />
      <h1>Connecting to Facebook…</h1>
      <p>Finish signing in securely with Facebook.</p>
      <div class="spinner" role="status" aria-label="Loading"></div>
      <noscript><a href="${escapedTarget}">Continue to Facebook</a></noscript>
    </main>
    <script>
      const target = ${safeTarget};
      window.setTimeout(() => window.location.replace(target), 350);
    </script>
  </body>
</html>`;
};

export default {
  async fetch(request) {
    if (request.method !== 'GET') return plainText('Method not allowed', 405);

    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === '/health') return plainText('ok');
    if (requestUrl.pathname === '/litterbugs-logo.png') {
      return new Response(litterbugsLogo, {
        headers: {
          'Cache-Control': 'public, max-age=86400',
          'Content-Type': 'image/png',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    if (requestUrl.pathname !== '/start') return plainText('Not found', 404);

    const target = getValidatedTarget(requestUrl);
    if (!target) return plainText('Invalid sign-in request', 400);

    return new Response(renderConnectingPage(target), {
      headers: {
        ...securityHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  },
};
