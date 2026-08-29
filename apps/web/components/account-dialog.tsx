'use client';

import type { Database, Report } from '@litterbugs/report-contract';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import { Icon } from '@/components/icon';
import { ModalShell } from '@/components/modal-shell';
import { PayoutSetupAction } from '@/components/payout-setup-action';
import {
  getProfileAvatarUrl,
  getProfileLabel,
  validateProfileDraft,
  type Profile,
  type ProfileDraftErrors,
} from '@/lib/profile';
import { createClient } from '@/lib/supabase/client';

type CleanupAttemptRow = Database['public']['Tables']['cleanup_attempts']['Row'];
type CleanupAttempt = Pick<
  CleanupAttemptRow,
  'id' | 'report_id' | 'status' | 'claim_expires_at' | 'completed_at' | 'is_paid' | 'reward_amount_cents' | 'payout_status'
> & {
  report: Pick<Report, 'id' | 'title' | 'severity' | 'cleanup_state'> | null;
};
type ContributionRow = Database['public']['Tables']['cleanup_contributions']['Row'];

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
  onProfileChanged,
}: {
  onClose: () => void;
  onSignedOut: () => void;
  onOpenReport: (reportId: string) => void;
  onProfileChanged?: (profile: Profile) => void;
}) {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');
  const [bioDraft, setBioDraft] = useState('');
  const [locationDraft, setLocationDraft] = useState('');
  const [profileErrors, setProfileErrors] = useState<ProfileDraftErrors & { avatarFile?: string }>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [expiredReports, setExpiredReports] = useState<Report[]>([]);
  const [cleanups, setCleanups] = useState<CleanupAttempt[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
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

      setUserId(user.id);
      setEmail(user.email ?? '');
      const [profileResult, reportsResult, expiredReportsResult, cleanupResult, contributionResult] = await Promise.all([
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
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .eq('renewal_status', 'decision_required')
          .gt('renewal_decision_due_at', new Date().toISOString())
          .order('renewal_decision_due_at', { ascending: true })
          .limit(8),
        supabase
          .from('cleanup_attempts')
          .select('id, report_id, status, claim_expires_at, completed_at, is_paid, reward_amount_cents, payout_status, report:reports(id,title,severity,cleanup_state)')
          .eq('cleaner_id', user.id)
          .in('status', ['claimed', 'changes_requested', 'completion_submitted', 'completed'])
          .order('last_activity_at', { ascending: false })
          .limit(12),
        supabase
          .from('cleanup_contributions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(12),
      ]);

      if (cancelled) return;
      setProfile(profileResult.data);
      setDisplayNameDraft(profileResult.data?.display_name ?? '');
      setUsernameDraft(profileResult.data?.username ?? '');
      setBioDraft(profileResult.data?.bio ?? '');
      setLocationDraft(profileResult.data?.location ?? '');
      setProfileEditing(Boolean(profileResult.data && !profileResult.data.profile_completed_at));
      setReports(reportsResult.data ?? []);
      setExpiredReports(expiredReportsResult.data ?? []);
      setCleanups((cleanupResult.data ?? []) as unknown as CleanupAttempt[]);
      setContributions(contributionResult.data ?? []);
      if (profileResult.error || reportsResult.error || expiredReportsResult.error || cleanupResult.error || contributionResult.error) {
        setMessage('Some account activity could not be loaded. You can still use the map.');
      }
      setDataLoading(false);
    }

    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

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

  function startProfileEdit() {
    setDisplayNameDraft(profile?.display_name ?? '');
    setUsernameDraft(profile?.username ?? '');
    setBioDraft(profile?.bio ?? '');
    setLocationDraft(profile?.location ?? '');
    setProfileErrors({});
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatar(false);
    setProfileEditing(true);
  }

  function cancelProfileEdit() {
    if (!profile?.profile_completed_at) return;
    setProfileEditing(false);
    setProfileErrors({});
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatar(false);
  }

  function chooseAvatar(file: File | undefined) {
    if (!file) return;
    const contentType = file.type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : file.type.toLowerCase();
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
    if (!allowed.has(contentType)) {
      setProfileErrors((current) => ({ ...current, avatarFile: 'Choose a JPEG, PNG, WebP, HEIC, or HEIF image.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileErrors((current) => ({ ...current, avatarFile: 'Choose an image smaller than 5 MB.' }));
      return;
    }
    setProfileErrors((current) => ({ ...current, avatarFile: undefined }));
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateProfileDraft({
      displayName: displayNameDraft,
      username: usernameDraft,
      bio: bioDraft,
      location: locationDraft,
    });
    if (!validation.valid || !userId) {
      setProfileErrors(validation.errors);
      return;
    }

    setBusyAction('profile');
    setMessage('');
    setProfileErrors({});
    const supabase = createClient();
    let avatarPath = removeAvatar ? null : profile?.avatar_path ?? null;

    try {
      if (removeAvatar && profile?.avatar_path) {
        const { error } = await supabase.storage.from('profile_avatars').remove([profile.avatar_path]);
        if (error) throw error;
      }
      if (avatarFile) {
        avatarPath = `${userId}/avatar`;
        const { error } = await supabase.storage.from('profile_avatars').upload(avatarPath, avatarFile, {
          contentType: avatarFile.type || 'image/jpeg',
          upsert: true,
        });
        if (error) throw error;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ ...validation.values, avatar_path: avatarPath })
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      setProfile(data);
      onProfileChanged?.(data);
      setProfileEditing(false);
      setAvatarFile(null);
      setAvatarPreview('');
      setRemoveAvatar(false);
      setMessage('Profile saved. Your website and app account are now up to date.');
    } catch (error) {
      const profileError = error as { code?: string; message?: string };
      if (profileError.code === '23505' || /username.*unique/i.test(profileError.message ?? '')) {
        setProfileErrors({ username: 'That username is taken.' });
      } else {
        setMessage(profileError.message || 'Couldn’t save your profile. Check your connection and try again.');
      }
    } finally {
      setBusyAction('');
    }
  }

  function openReport(reportId: string) {
    onOpenReport(reportId);
    onClose();
  }

  async function renewReport(reportId: string) {
    setBusyAction(`renew:${reportId}`);
    const { error } = await createClient().rpc('renew_report', { target_report_id: reportId });
    setBusyAction('');
    if (error) {
      setMessage('The report could not be renewed. Refresh and try again.');
      return;
    }
    setExpiredReports((current) => current.filter(({ id }) => id !== reportId));
    setMessage('Report renewed for 30 days with its cleanup fund preserved.');
  }

  async function closeExpiredReport(reportId: string) {
    if (!window.confirm('Close this report and refund every active contribution, including the 10% fee?')) return;
    setBusyAction(`close:${reportId}`);
    const { error } = await createClient().rpc('close_expired_report', { target_report_id: reportId });
    setBusyAction('');
    if (error) {
      setMessage('The report could not be closed. Refresh and try again.');
      return;
    }
    setExpiredReports((current) => current.filter(({ id }) => id !== reportId));
    setMessage('Report closed. Full contribution refunds have been queued.');
  }

  const displayName = getProfileLabel(profile, email);
  const initial = displayName.charAt(0).toUpperCase();
  const savedAvatarUrl = getProfileAvatarUrl(createClient(), profile);
  const visibleAvatarUrl = avatarPreview || (removeAvatar ? '' : savedAvatarUrl);

  return (
    <ModalShell onClose={onClose} label="Your Litterbugs account" className="account-dialog member-dashboard" closeDisabled={Boolean(busyAction)}>
      <header className="member-dashboard-header">
        <div className="account-avatar" aria-hidden>
          {visibleAvatarUrl ? <Image src={visibleAvatarUrl} alt="" width={64} height={64} unoptimized /> : (initial || <Icon name="account" />)}
        </div>
        <div className="member-profile-summary">
          <span className="eyebrow">YOUR LITTERBUGS ACCOUNT</span>
          <h2>{displayName}</h2>
          <p className="member-profile-line">
            {[profile?.username ? `@${profile.username}` : null, profile?.location].filter(Boolean).join(' · ') || email}
          </p>
        </div>
        {!profileEditing && <button className="secondary-button member-edit-profile" onClick={startProfileEdit}>Edit profile</button>}
      </header>

      {message && <p className={`form-message ${message.includes('sent') || message.includes('saved') ? 'success-message' : 'error-message'}`} role="status">{message}</p>}

      {profileEditing && (
        <section className="member-profile-editor" aria-labelledby="profile-editor-title">
          <header>
            <div>
              <span className="eyebrow">{profile?.profile_completed_at ? 'PROFILE' : 'ONE LAST STEP'}</span>
              <h3 id="profile-editor-title">{profile?.profile_completed_at ? 'Edit your profile' : 'Finish your profile'}</h3>
              {!profile?.profile_completed_at && <p>Add a display name so your account is ready on both the website and mobile app.</p>}
            </div>
          </header>
          <form className="member-profile-form" onSubmit={saveProfile}>
            <div className="member-avatar-editor">
              <div className="account-avatar account-avatar-large" aria-hidden>
                {visibleAvatarUrl ? <Image src={visibleAvatarUrl} alt="" width={88} height={88} unoptimized /> : initial}
              </div>
              <div className="member-avatar-actions">
                <label className="secondary-button member-photo-picker">
                  <span>{avatarFile ? 'Choose another photo' : 'Choose photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={(event) => chooseAvatar(event.target.files?.[0])}
                    disabled={Boolean(busyAction)}
                  />
                </label>
                {(visibleAvatarUrl || profile?.avatar_path) && (
                  <button type="button" className="profile-text-button" onClick={() => { setAvatarFile(null); setAvatarPreview(''); setRemoveAvatar(true); }} disabled={Boolean(busyAction)}>Remove photo</button>
                )}
                <small>JPEG, PNG, WebP, HEIC, or HEIF · 5 MB max</small>
                {profileErrors.avatarFile && <span className="profile-field-error">{profileErrors.avatarFile}</span>}
              </div>
            </div>

            <div className="member-profile-fields">
              <label>Display name
                <input value={displayNameDraft} onChange={(event) => setDisplayNameDraft(event.target.value)} maxLength={60} autoComplete="name" aria-invalid={Boolean(profileErrors.displayName)} />
                <small>{displayNameDraft.length}/60</small>
                {profileErrors.displayName && <span className="profile-field-error">{profileErrors.displayName}</span>}
              </label>
              <label>Username <span className="profile-optional">(optional)</span>
                <span className="profile-username-input"><span aria-hidden>@</span><input value={usernameDraft} onChange={(event) => setUsernameDraft(event.target.value)} maxLength={30} autoCapitalize="none" autoCorrect="off" placeholder="cleanup.friend" aria-invalid={Boolean(profileErrors.username)} /></span>
                <small>{usernameDraft.length}/30</small>
                {profileErrors.username && <span className="profile-field-error">{profileErrors.username}</span>}
              </label>
              <label className="member-profile-wide-field">Bio <span className="profile-optional">(optional)</span>
                <textarea value={bioDraft} onChange={(event) => setBioDraft(event.target.value)} maxLength={160} placeholder="Tell your community a little about yourself." aria-invalid={Boolean(profileErrors.bio)} />
                <small>{bioDraft.length}/160</small>
                {profileErrors.bio && <span className="profile-field-error">{profileErrors.bio}</span>}
              </label>
              <label className="member-profile-wide-field">Location <span className="profile-optional">(optional)</span>
                <input value={locationDraft} onChange={(event) => setLocationDraft(event.target.value)} maxLength={80} placeholder="Asheville, NC" aria-invalid={Boolean(profileErrors.location)} />
                <span className="profile-field-helper">This is public. Use a city or region, not a street address.</span>
                <small>{locationDraft.length}/80</small>
                {profileErrors.location && <span className="profile-field-error">{profileErrors.location}</span>}
              </label>
            </div>

            <div className="member-profile-form-actions">
              {profile?.profile_completed_at && <button type="button" className="secondary-button" onClick={cancelProfileEdit} disabled={Boolean(busyAction)}>Cancel</button>}
              <button className="primary-button" disabled={Boolean(busyAction)}>{busyAction === 'profile' ? 'Saving…' : 'Save profile'}</button>
            </div>
          </form>
        </section>
      )}

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
            {expiredReports.length ? (
              <section className="member-panel">
                <header><div><span className="eyebrow">ACTION NEEDED</span><h3>Renew or close reports</h3></div></header>
                <div className="member-activity-list">
                  {expiredReports.map((report) => (
                    <div key={report.id} className="member-activity-row member-completed-row">
                      <span>
                        <strong>{report.title || 'Litter Report'}</strong>
                        <small>
                          {formatUsd(report.funded_amount_cents)} reward · Decide by {new Date(report.renewal_decision_due_at ?? '').toLocaleDateString()}
                        </small>
                      </span>
                      <div className="account-actions">
                        <button
                          className="secondary-button compact-button"
                          onClick={() => renewReport(report.id)}
                          disabled={Boolean(busyAction)}
                        >
                          {busyAction === `renew:${report.id}` ? 'Renewing…' : 'Renew 30 days'}
                        </button>
                        <button
                          className="danger-button compact-button"
                          onClick={() => closeExpiredReport(report.id)}
                          disabled={Boolean(busyAction)}
                        >
                          {busyAction === `close:${report.id}` ? 'Closing…' : 'Close and refund'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

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

            <section className="member-panel member-contributions-panel">
              <header><div><span className="eyebrow">CLEANUP FUNDS</span><h3>My contributions</h3></div></header>
              <div className="member-activity-list">
                {contributions.map((contribution) => (
                  <button key={contribution.id} className="member-activity-row" onClick={() => openReport(contribution.report_id)}>
                    <span>
                      <strong>{formatUsd(contribution.principal_amount_cents)} cleanup reward</strong>
                      <small>{contribution.status.replaceAll('_', ' ')} · {new Date(contribution.created_at).toLocaleDateString()}</small>
                      <small>{formatUsd(contribution.platform_fee_cents)} fee · {formatUsd(contribution.total_amount_cents)} total charged</small>
                    </span>
                    <Icon name="chevron-right" />
                  </button>
                ))}
                {!contributions.length && <p className="member-empty">Your cleanup contributions will appear here.</p>}
              </div>
            </section>
          </div>
        </>
      )}

      <section className="member-settings">
        <div><span className="eyebrow">ACCOUNT SETTINGS</span><p>{email}</p></div>
        <div className="account-actions">
          <PayoutSetupAction />
          <button className="secondary-button" onClick={sendRecovery} disabled={Boolean(busyAction)}>{busyAction === 'recovery' ? 'Sending…' : 'Reset password'}</button>
          <button className="secondary-button" onClick={signOut} disabled={Boolean(busyAction)}>{busyAction === 'signout' ? 'Signing out…' : 'Sign out'}</button>
          <button className="danger-button" onClick={deleteAccount} disabled={Boolean(busyAction)}>{busyAction === 'delete' ? 'Deleting account…' : 'Delete account'}</button>
        </div>
      </section>
    </ModalShell>
  );
}
