'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LinkSignInMethod({ connected }: { connected: string[] }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const providers = ['google', ...(process.env.NEXT_PUBLIC_FACEBOOK_LOGIN_ENABLED === 'true' ? ['facebook'] : [])] as Array<'google' | 'facebook'>;
  async function link(provider: 'google' | 'facebook') {
    setBusy(provider); setError('');
    try {
      const { error } = await createClient().auth.linkIdentity({ provider, options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/account/settings')}` } });
      if (error) throw error;
    } catch { setError('This sign-in method could not be connected. It may already belong to another account. Try again or contact support.'); setBusy(''); }
  }
  return <><div className="draft-recovery-actions">{providers.filter(provider => !connected.includes(provider)).map(provider => <button key={provider} className="secondary-button" disabled={!!busy} onClick={() => void link(provider)}>{busy === provider ? 'Connecting…' : `Connect ${provider === 'google' ? 'Google' : 'Facebook'}`}</button>)}</div>{error && <p role="alert">{error}</p>}<p>Connecting another method lets you use it with this same account on the web and app.</p></>;
}
