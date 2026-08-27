'use client';

import type { Database, Report } from '@litterbugs/report-contract';
import { useEffect, useMemo, useState } from 'react';

import { Icon } from '@/components/icon';
import { ModalShell } from '@/components/modal-shell';
import { createClient } from '@/lib/supabase/client';

type Profile = Database['public']['Tables']['profiles']['Row'];
type CleanupAttemptRow = Database['public']['Tables']['cleanup_attempts']['Row'];
type CleanupAttempt = Pick<
  CleanupAttemptRow,
  'id' | 'report_id' | 'status' | 'claim_expires_at' | 'completed_at' | 'is_paid' | 'reward_amount_cents' | 'payout_status'
> & {
  report: Pick<Report, 'id' | 'title' | 'severity' | 'cleanup_state'> | null;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function cleanupStatus(attempt: CleanupAttempt) {
  if (attempt.status === 'claimed') return 'Ready for cleanup';
  if (attempt.status === 'changes_requested') return 'Better photos requested';
  if (attempt.status === 'completion_submitted') return 'Photos under review';
  if (attempt.payout_status === 'transferred') return 'Reward sent';
  return 'Cleanup complete';
}

export function AccountDialog({
  onClose,
  onSignedOut,
  onOpenReport,
}: {
  onClose: () => void;
  onSignedOut: () => void;
  onOpenReport: (reportId: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [cleanups, setCleanups] = useState<CleanupAttempt[]>([]);
  const [message, setMessage] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user || cancelled) {
        setDataLoading(false);
        return;
      }

      setEmail(user.email ?? '');
      const [profileResult, reportsResult, cleanupResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .or('status.is.null,status.eq.active')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('cleanup_attempts')
          .select('id, report_id, status, claim_expires_at, completed_at, is_paid, reward_amount_cents, payout_status, report:reports(id,title,severity,cleanup_state)')
          .eq('cleaner_id', user.id)
          .in('status', ['claimed', 'changes_requested', 'completion_submitted', 'completed'])
          .order('last_activity_at', { ascending: false })
          .limit(12),
      ]);

      if (cancelled) return;
      setProfile(profileResult.data);
      setReports(reportsResult.data ?? []);
      setCleanups((cleanupResult.data ?? []) as unknown as CleanupAttempt[]);
      if (profileResult.error || reportsResult.error || cleanupResult.error) {
        setMessage('Some account activity could not be loaded. You can still use the map.');
      }
      setDataLoading(false);
    }

    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  const activeCleanups = useMemo(
    () => cleanups.filter(({ status }) => status !== 'completed'),
    [cleanups],
  );
  const completedCleanups = useMemo(
    () => cleanups.filter(({ status }) => status === 'completed'),
    [cleanups],
  );

  async function signOut() {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    setBusyAction('signout');
    const { error } = await createClient().auth.signOut();
    setBusyAction('');
    if (error) return setMessage('Couldn’t sign out. Check your connection and try again.');
    onSignedOut();
  }

  async function sendRecovery() {
    if (!email) return;
    setBusyAction('recovery');
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusyAction('');
    setMessage(error ? 'We couldn’t send a reset link. Try again.' : 'Password reset email sent.');
  }

  async function deleteAccount() {
    const confirmed = window.confirm('This permanently deletes your account and uploaded photos. Community report locations, categories, severity, status, and dates will remain without your identity. This cannot be undone.');
    if (!confirmed) return;
    setBusyAction('delete');
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirmation: 'DELETE' } });
    if (error || !data?.deleted) {
      setBusyAction('');
      return setMessage('Couldn’t delete account. No additional changes were made. Check your connection and try again.');
    }
    await supabase.auth.signOut({ scope: 'local' });
    onSignedOut();
  }

  function openReport(reportId: string) {
    onOpenReport(reportId);
    onClose();
  }

  const displayName = profile?.display_name || profile?.username || email.split('@')[0] || 'Litterbugs member';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <ModalShell onClose={onClose} label="Your Litterbugs account" className="account-dialog member-dashboard" closeDisabled={Boolean(busyAction)}>
      <header className="member-dashboard-header">
        <div className="account-avatar" aria-hidden>{initial || <Icon name="account" />}</div>
        <div>
          <span className="eyebrow">YOUR LITTERBUGS ACCOUNT</span>
          <h2>{displayName}</h2>
          <p className="member-profile-line">
            {[profile?.username ? `@${profile.username}` : null, profile?.location].filter(Boolean).join(' · ') || email}
          </p>
        </div>
      </header>

      {message && <p className={`form-message ${message.includes('sent') ? 'success-message' : 'error-message'}`} role="status">{message}</p>}

      {dataLoading ? (
        <div className="member-dashboard-loading"><span className="spinner" /><span>Loading your activity…</span></div>
      ) : (
        <>
          <section className="member-stats" aria-label="Litterbugs activity summary">
            <div><strong>{reports.length}</strong><span>Active reports</span></div>
            <div><strong>{activeCleanups.length}</strong><span>Current cleanups</span></div>
            <div><strong>{completedCleanups.length}</strong><span>Completed</span></div>
          </section>

          <div className="member-dashboard-grid">
            <section className="member-panel">
              <header><div><span className="eyebrow">REPORTED BY YOU</span><h3>My active reports</h3></div></header>
              <div className="member-activity-list">
                {reports.length ? reports.map((report) => (
                  <button key={report.id} className="member-activity-row" onClick={() => openReport(report.id)}>
                    <span><strong>{report.title || 'Litter Report'}</strong><small>{report.severity || 'Medium'} severity</small></span>
                    <Icon name="chevron-right" />
                  </button>
                )) : <p className="member-empty">You do not have any active reports.</p>}
              </div>
            </section>

            <section className="member-panel">
              <header><div><span className="eyebrow">CLEANUP ACTIVITY</span><h3>My cleanups</h3></div></header>
              <div className="member-activity-list">
                {activeCleanups.map((attempt) => (
                  <button key={attempt.id} className="member-activity-row" onClick={() => openReport(attempt.report_id)}>
                    <span>
                      <strong>{attempt.report?.title || 'Litter cleanup'}</strong>
                      <small>{cleanupStatus(attempt)}{attempt.is_paid ? ` · ${formatUsd(attempt.reward_amount_cents)}` : ''}</small>
                    </span>
                    <Icon name="chevron-right" />
                  </button>
                ))}
                {completedCleanups.slice(0, 4).map((attempt) => (
                  <div key={attempt.id} className="member-activity-row member-completed-row">
                    <span>
                      <strong>{attempt.report?.title || 'Completed litter cleanup'}</strong>
                      <small>{cleanupStatus(attempt)}{attempt.completed_at ? ` · ${new Date(attempt.completed_at).toLocaleDateString()}` : ''}</small>
                    </span>
                  </div>
                ))}
                {!cleanups.length && <p className="member-empty">Claimed and completed cleanups will appear here.</p>}
              </div>
            </section>
          </div>
        </>
      )}

      <section className="member-settings">
        <div><span className="eyebrow">ACCOUNT SETTINGS</span><p>{email}</p></div>
        <div className="account-actions">
          <button className="secondary-button" onClick={sendRecovery} disabled={Boolean(busyAction)}>{busyAction === 'recovery' ? 'Sending…' : 'Reset password'}</button>
          <button className="secondary-button" onClick={signOut} disabled={Boolean(busyAction)}>{busyAction === 'signout' ? 'Signing out…' : 'Sign out'}</button>
          <button className="danger-button" onClick={deleteAccount} disabled={Boolean(busyAction)}>{busyAction === 'delete' ? 'Deleting account…' : 'Delete account'}</button>
        </div>
      </section>
    </ModalShell>
  );
}
