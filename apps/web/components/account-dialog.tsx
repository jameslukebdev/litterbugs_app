'use client';

import { useEffect, useState } from 'react';

import { Icon } from '@/components/icon';
import { ModalShell } from '@/components/modal-shell';
import { createClient } from '@/lib/supabase/client';

export function AccountDialog({ onClose, onSignedOut }: { onClose: () => void; onSignedOut: () => void }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState('');

  useEffect(() => {
    void createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, []);

  async function signOut() {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    setLoading('signout');
    const { error } = await createClient().auth.signOut();
    setLoading('');
    if (error) return setMessage('Couldn’t sign out. Check your connection and try again.');
    onSignedOut();
  }

  async function sendRecovery() {
    if (!email) return;
    setLoading('recovery');
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading('');
    setMessage(error ? 'We couldn’t send a reset link. Try again.' : 'Password reset email sent.');
  }

  async function deleteAccount() {
    const confirmed = window.confirm('This permanently deletes your account and uploaded photos. Community report locations, categories, severity, status, and dates will remain without your identity. This cannot be undone.');
    if (!confirmed) return;
    setLoading('delete');
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirmation: 'DELETE' } });
    if (error || !data?.deleted) {
      setLoading('');
      return setMessage('Couldn’t delete account. No additional changes were made. Check your connection and try again.');
    }
    await supabase.auth.signOut({ scope: 'local' });
    onSignedOut();
  }

  return (
    <ModalShell onClose={onClose} label="Your Litterbugs account" className="account-dialog" closeDisabled={Boolean(loading)}>
      <div className="account-avatar"><Icon name="account" /></div>
      <h2>Your account</h2>
      <p className="account-status">Signed in</p>
      {email && <p className="account-email">{email}</p>}
      {message && <p className={`form-message ${message.includes('sent') ? 'success-message' : 'error-message'}`} role="status">{message}</p>}
      <div className="account-actions">
        <button className="secondary-button" onClick={sendRecovery} disabled={Boolean(loading)}>{loading === 'recovery' ? 'Sending…' : 'Reset password'}</button>
        <button className="secondary-button" onClick={signOut} disabled={Boolean(loading)}>{loading === 'signout' ? 'Signing out…' : 'Sign out'}</button>
        <button className="danger-button" onClick={deleteAccount} disabled={Boolean(loading)}>{loading === 'delete' ? 'Deleting account…' : 'Delete account'}</button>
      </div>
    </ModalShell>
  );
}
