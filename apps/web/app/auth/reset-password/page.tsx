'use client';

import { useEffect, useState } from 'react';

import { ResetPasswordView, type ResetStage } from '@/components/reset-password-view';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<ResetStage>('checking');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const exchangeRecoveryCode = async () => {
      const code = new URL(window.location.href).searchParams.get('code');
      if (code) {
        await createClient().auth.exchangeCodeForSession(code);
        window.history.replaceState({}, '', '/auth/reset-password');
      }
      const { data } = await createClient().auth.getSession();
      // No session means the link was used, expired, or opened without one: offer a new link here.
      setStage(data.session ? 'choose' : 'expired');
    };
    void exchangeRecoveryCode();
  }, []);

  async function updatePassword() {
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    setBusy(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError('We couldn’t save your password. Check your connection and try again.');
    setStage('done');
  }

  async function sendNewLink() {
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) return setError('Enter the email you use for Litterbugs.');
    setBusy(true);
    try {
      const { error: sendError } = await createClient().auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (sendError) return setError('We couldn’t send a new link. Check your connection and try again.');
      setStage('sent');
    } catch {
      setError('We couldn’t send a new link. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <ResetPasswordView stage={stage} password={password} onPassword={setPassword} email={email} onEmail={setEmail}
    busy={busy} error={error} onSave={() => { void updatePassword(); }} onSendLink={() => { void sendNewLink(); }} />;
}
