import litterbugsLogo from '../../assets/LB_Logo_PNG.png';

const SUPABASE_ORIGIN = 'https://mvaygkflcjswtwchflrk.supabase.co';
const SUPABASE_AUTHORIZE_PATH = '/auth/v1/authorize';
const APP_CALLBACK_URL = 'litterbugs://auth/callback';
const DELETE_CONFIRM_URL = 'https://auth.litterbugs.app/delete-account/confirm';
const DELETE_FUNCTION_URL = `${SUPABASE_ORIGIN}/functions/v1/delete-account`;

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

const pageHeaders = {
  ...securityHeaders,
  'Content-Security-Policy': [
    "default-src 'none'",
    "img-src 'self'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
};

const htmlResponse = (body, status = 200) => new Response(body, {
  status,
  headers: {
    ...pageHeaders,
    'Content-Type': 'text/html; charset=utf-8',
  },
});

const renderPage = ({ title, heading, content, script = '' }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${title} | Litterbugs</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: #f5f6f7;
        color: #2b2b2b;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main { width: min(calc(100% - 32px), 560px); margin: 0 auto; padding: 44px 0; }
      .card { background: #fff; border-radius: 18px; padding: 28px; box-shadow: 0 8px 28px rgba(0,0,0,.08); }
      .logo { display: block; width: 150px; height: 92px; margin: 0 auto 18px; object-fit: contain; }
      h1 { margin: 0 0 12px; font-size: 28px; line-height: 1.2; text-align: center; }
      h2 { margin: 28px 0 10px; font-size: 20px; }
      p, li { color: #5f6a73; font-size: 16px; line-height: 1.55; }
      label { display: block; margin: 24px 0 8px; color: #333; font-weight: 700; }
      input { width: 100%; min-height: 50px; border: 1px solid #aeb5bb; border-radius: 10px; padding: 0 14px; font: inherit; }
      button { width: 100%; min-height: 50px; margin-top: 18px; border: 0; border-radius: 10px; background: #b42318; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
      button:disabled { opacity: .6; cursor: wait; }
      a { color: #2e7d32; }
      .quiet { font-size: 14px; text-align: center; }
      .notice { margin-top: 18px; padding: 14px; border-radius: 10px; background: #f2f7f2; }
      .honeypot { position: absolute; left: -10000px; }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <img class="logo" src="/litterbugs-logo.png" alt="Litterbugs" />
        <h1>${heading}</h1>
        ${content}
      </section>
    </main>
    ${script}
  </body>
</html>`;

const renderDeleteRequestPage = () => renderPage({
  title: 'Delete account',
  heading: 'Delete your Litterbugs account',
  content: `
    <p>Enter the email used for Litterbugs. We’ll send a secure sign-in link if an account exists.</p>
    <form method="post" action="/delete-account/request">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" inputmode="email" autocomplete="email" required />
      <label class="honeypot" for="website">Website</label>
      <input class="honeypot" id="website" name="website" type="text" tabindex="-1" autocomplete="off" />
      <button type="submit">Send secure link</button>
    </form>
    <p class="quiet"><a href="/privacy">Read the Litterbugs privacy policy</a></p>`,
});

const renderDeleteEmailSentPage = () => renderPage({
  title: 'Check your email',
  heading: 'Check your email',
  content: `
    <p class="notice">If a Litterbugs account exists for that address, a secure link is on its way.</p>
    <p>Open that link on this device, review what will be deleted, and confirm the request.</p>`,
});

const renderDeleteConfirmPage = () => renderPage({
  title: 'Confirm deletion',
  heading: 'Permanently delete your account?',
  content: `
    <p>Your account and uploaded photos will be deleted. Community report locations, categories, severity, status, and dates will remain without your identity.</p>
    <p><strong>This cannot be undone.</strong></p>
    <div id="message" class="notice">Verifying your secure link…</div>
    <button id="delete" type="button" disabled>Delete account</button>
    <p class="quiet"><a href="/privacy">Privacy policy</a></p>`,
  script: `<script>
    const message = document.getElementById('message');
    const deleteButton = document.getElementById('delete');
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get('access_token');
    history.replaceState(null, '', window.location.pathname);

    if (!accessToken) {
      message.textContent = 'This secure link is invalid or has expired. Request a new link.';
    } else {
      message.textContent = 'Your email is verified. Review the details above before continuing.';
      deleteButton.disabled = false;
    }

    deleteButton.addEventListener('click', async () => {
      deleteButton.disabled = true;
      deleteButton.textContent = 'Deleting account…';
      message.textContent = 'Please keep this page open.';

      try {
        const response = await fetch('/delete-account/complete', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ confirmation: 'DELETE' }),
        });

        if (!response.ok) throw new Error('Deletion failed');
        message.textContent = 'Your Litterbugs account has been deleted.';
        deleteButton.remove();
      } catch {
        message.textContent = 'We couldn’t delete the account. Request a new link and try again.';
        deleteButton.disabled = false;
        deleteButton.textContent = 'Try again';
      }
    });
  </script>`,
});

const renderPrivacyPage = () => renderPage({
  title: 'Privacy policy',
  heading: 'Litterbugs privacy policy',
  content: `
    <p><strong>Last updated:</strong> August 19, 2026</p>
    <p>Litterbugs uses account information to sign you in and associate reports with your account. Reports may include a location, litter category, severity, status, date, optional text, and photos you choose to upload.</p>
    <h2>Location and photos</h2>
    <p>Location access is used to center the map and confirm that new reports are near you. Photos are uploaded only when you select them for a report.</p>
    <h2>Account deletion</h2>
    <p>You can delete your account from the Account menu in the app or at <a href="/delete-account">this deletion page</a>. Deletion removes your account, profile, active refresh sessions, and uploaded report photos. Potentially identifying free text is cleared.</p>
    <p>We retain only de-identified community report information: location, litter category, severity, status, and timestamps. Retained reports no longer contain your user ID and cannot be reconnected to your deleted account.</p>
    <h2>Service providers</h2>
    <p>Litterbugs uses Supabase for authentication, database, and photo storage; Google Maps or Apple Maps for map display; and optional Google or Facebook sign-in when selected.</p>
    <h2>Contact</h2>
    <p>Questions can be sent to <a href="mailto:support@litterbugs.app">support@litterbugs.app</a>.</p>`,
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
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === '/health' && request.method === 'GET') return plainText('ok');
    if (requestUrl.pathname === '/litterbugs-logo.png') {
      if (request.method !== 'GET') return plainText('Method not allowed', 405);
      return new Response(litterbugsLogo, {
        headers: {
          'Cache-Control': 'public, max-age=86400',
          'Content-Type': 'image/png',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    if (requestUrl.pathname === '/privacy' && request.method === 'GET') {
      return htmlResponse(renderPrivacyPage());
    }

    if (requestUrl.pathname === '/delete-account' && request.method === 'GET') {
      return htmlResponse(renderDeleteRequestPage());
    }

    if (requestUrl.pathname === '/delete-account/request' && request.method === 'POST') {
      const formData = await request.formData();
      const email = String(formData.get('email') || '').trim().toLowerCase();
      const website = String(formData.get('website') || '');

      if (!website && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && env.SUPABASE_ANON_KEY) {
        await fetch(`${SUPABASE_ORIGIN}/auth/v1/otp?redirect_to=${encodeURIComponent(DELETE_CONFIRM_URL)}`, {
          method: 'POST',
          headers: {
            'apikey': env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, create_user: false }),
        }).catch(() => null);
      }

      return htmlResponse(renderDeleteEmailSentPage());
    }

    if (requestUrl.pathname === '/delete-account/confirm' && request.method === 'GET') {
      return htmlResponse(renderDeleteConfirmPage());
    }

    if (requestUrl.pathname === '/delete-account/complete' && request.method === 'POST') {
      const authorization = request.headers.get('Authorization');
      if (!authorization?.startsWith('Bearer ') || !env.SUPABASE_ANON_KEY) {
        return plainText('Authentication required', 401);
      }

      const deletionResponse = await fetch(DELETE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      return new Response(deletionResponse.body, {
        status: deletionResponse.status,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    if (request.method !== 'GET') return plainText('Method not allowed', 405);
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
