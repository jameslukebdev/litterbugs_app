'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, useSyncExternalStore } from 'react';

import { NotificationLink } from '@/components/notification-inbox';
import { AccountDialog } from '@/components/account-dialog';
import { AuthDialog, authEntryMode, type AuthIntent } from '@/components/auth-dialog';
import { getProfileAvatarUrl, getProfileLabel, type Profile } from '@/lib/profile';
import { getHeaderProfile, getServerHeaderProfile, setHeaderProfile, subscribeHeaderProfile } from '@/lib/header-profile-cache';
import { realUserId } from '@/lib/report-access';
import { createClient } from '@/lib/supabase/client';

export type PublicAccountActionHandle = {
  openAccount: () => void;
  openAuth: (intent?: AuthIntent) => void;
};

export const PublicAccountAction = forwardRef<PublicAccountActionHandle, {
  initialUserId?: string | null;
  compactOnMobile?: boolean;
  onAccountDataChanged?: () => void | Promise<void>;
  onOpenReport?: (reportId: string) => void;
  onResumeDraft?: () => void;
  onUserChange?: (userId: string | null) => void;
}>(function PublicAccountAction({ initialUserId = null, onAccountDataChanged, onOpenReport, onUserChange, onResumeDraft, compactOnMobile }, ref) {
  const router = useRouter();
  const cached = useSyncExternalStore(subscribeHeaderProfile, getHeaderProfile, getServerHeaderProfile);
  const [resolvedUserId, setUserId] = useState(initialUserId);
  const [authChecked, setAuthChecked] = useState(Boolean(initialUserId));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failedAvatar, setFailedAvatar] = useState('');
  const [email, setEmail] = useState('');
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);
  const [entryMode, setEntryMode] = useState<'login' | 'signup'>('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const userId = authChecked ? resolvedUserId : initialUserId ?? cached?.userId ?? null;
  const userIdRef = useRef(initialUserId);
  const promptedForProfileRef = useRef(false);
  const profileRequest = useRef(0);

  const loadProfile = useCallback(async (nextUserId: string | null, nextEmail = '') => {
    const request = ++profileRequest.current;
    setAuthChecked(true);
    const identityChanged = userIdRef.current !== nextUserId;
    userIdRef.current = nextUserId;
    if (identityChanged) { setUserId(nextUserId); setProfile(null); setFailedAvatar(''); }
    setEmail(nextEmail);
    const previous = getHeaderProfile();
    if (previous?.userId !== nextUserId) setHeaderProfile(nextUserId ? { userId: nextUserId, email: nextEmail, profile: null } : null);
    if (identityChanged) onUserChange?.(nextUserId);
    if (nextUserId) setAuthOpen(false);
    if (!nextUserId) {
      setProfile(null);
      promptedForProfileRef.current = false;
      return;
    }

    const { data, error } = await createClient().from('profiles').select('*').eq('id', nextUserId).maybeSingle();
    if (userIdRef.current !== nextUserId || request !== profileRequest.current) return;
    if (error) return;
    setProfile(data);
    setHeaderProfile({ userId: nextUserId, email: nextEmail, profile: data });
    if (data && !data.profile_completed_at && !promptedForProfileRef.current) {
      promptedForProfileRef.current = true;
      setAccountOpen(true);
    }
  }, [onUserChange]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) void loadProfile(realUserId(data.user), data.user?.email ?? '');
    }).catch(() => { if (!cancelled) { setUserId(getHeaderProfile()?.userId ?? initialUserId); setAuthChecked(true); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!cancelled) void loadProfile(realUserId(session?.user), session?.user.email ?? '');
      }, 0);
    });
    return () => {
      cancelled = true;
      // Invalidate pending profile reads from this mounted header.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      profileRequest.current++;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile, initialUserId]);

  useImperativeHandle(ref, () => ({
    openAccount: () => { if (userId) router.push('/account'); else { setAuthIntent(null); setEntryMode('login'); setAuthOpen(true); } },
    openAuth: (intent = null) => { setAuthIntent(intent); setEntryMode(authEntryMode(intent)); setAuthOpen(true); },
  }), [userId, router]);

  const avatarUrl = getProfileAvatarUrl(createClient(), profile ?? (cached?.userId === userId ? cached.profile : null));
  const profileLabel = getProfileLabel(profile ?? (cached?.userId === userId ? cached.profile : null), email || (cached?.userId === userId ? cached.email : ''));

  function openReport(reportId: string) {
    if (onOpenReport) onOpenReport(reportId);
    else router.push(`/map?report=${encodeURIComponent(reportId)}`);
  }

  const avatar = userId && <span className="public-account-avatar-frame" aria-hidden="true">
    <span className="public-account-initials">{(!avatarUrl || failedAvatar === avatarUrl) && (profile || cached?.profile) ? profileLabel.charAt(0).toUpperCase() : null}</span>
    {avatarUrl && failedAvatar !== avatarUrl && <Image className="public-account-avatar" data-loaded="true" src={avatarUrl} alt="" width={52} height={52} unoptimized loading="eager" onError={() => setFailedAvatar(avatarUrl)} />}
  </span>;

  return (
    <>
      <div className={`public-account-actions${compactOnMobile ? ' public-account-actions-desktop' : ''}`}>
        {userId && <NotificationLink key={userId} userId={userId} />}
        {!authChecked && !userId ? <span className="public-account-placeholder" role="status" aria-label="Loading profile" /> : userId ? <button
          type="button" className="public-account-control public-account-control-profile" title="Your profile" onClick={() => router.push('/account')}>
          {avatar}<span className="public-account-label">Profile</span>
        </button> : <>
          <button type="button" className="public-sign-in" onClick={() => { setAuthIntent(null); setEntryMode('login'); setAuthOpen(true); }}>Sign in</button>
          <button type="button" className="public-account-control public-account-control-signed-out" onClick={() => { setAuthIntent(null); setEntryMode('signup'); setAuthOpen(true); }}>
            <span className="public-account-label account-label-desktop">Get started</span><span className="public-account-label account-label-mobile">Log in / Sign up</span>
          </button>
        </>}
      </div>

      {compactOnMobile && (
        <div className="mobile-map-account">
          <NotificationLink key={userId ?? 'guest'} userId={userId} />
          {userId && <button type="button" className="mobile-profile-button" aria-label="Your profile" onClick={() => router.push('/account')}>
            {avatar}
          </button>}
        </div>
      )}

      {authOpen && <AuthDialog initialMode={entryMode} returnPath={entryMode === 'signup' && !authIntent ? '/account' : undefined} onSuccess={() => { setAuthOpen(false); if (entryMode === 'signup' && !authIntent) router.push('/account'); }} intent={authIntent} onClose={() => setAuthOpen(false)} />}
      {accountOpen && userId && (
        <AccountDialog
          onClose={() => setAccountOpen(false)}
          onAccountDataChanged={onAccountDataChanged}
          onOpenReport={openReport}
          onResumeDraft={onResumeDraft}
          onProfileChanged={(nextProfile) => { setProfile(nextProfile); setHeaderProfile({ userId, email, profile: nextProfile }); }}
          onSignedOut={() => {
            setAccountOpen(false);
            void loadProfile(null);
          }}
        />
      )}
    </>
  );
});
