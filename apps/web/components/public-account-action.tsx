'use client';

import Image from 'next/image';
import Link from 'next/link';
import { IoPersonOutline, IoNotificationsOutline } from 'react-icons/io5';
import { useRouter } from 'next/navigation';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';

import { NotificationLink } from '@/components/notification-inbox';
import { AccountDialog } from '@/components/account-dialog';
import { AuthDialog, type AuthIntent } from '@/components/auth-dialog';
import { getProfileAvatarUrl, getProfileLabel, type Profile } from '@/lib/profile';
import { realUserId } from '@/lib/report-access';
import { createClient } from '@/lib/supabase/client';

export type PublicAccountActionHandle = {
  openAccount: () => void;
  openAuth: (intent?: AuthIntent) => void;
};

export const PublicAccountAction = forwardRef<PublicAccountActionHandle, {
  initialUserId?: string | null;
  mobileTabs?: ReactNode;
  onAccountDataChanged?: () => void | Promise<void>;
  onOpenReport?: (reportId: string) => void;
  onResumeDraft?: () => void;
  onUserChange?: (userId: string | null) => void;
}>(function PublicAccountAction({ initialUserId = null, onAccountDataChanged, onOpenReport, onUserChange, onResumeDraft, mobileTabs }, ref) {
  const router = useRouter();
  const [userId, setUserId] = useState(initialUserId);
  const [authChecked, setAuthChecked] = useState(Boolean(initialUserId));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadedAvatar, setLoadedAvatar] = useState('');
  const [email, setEmail] = useState('');
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const userIdRef = useRef(initialUserId);
  const promptedForProfileRef = useRef(false);

  const loadProfile = useCallback(async (nextUserId: string | null, nextEmail = '') => {
    setAuthChecked(true);
    const identityChanged = userIdRef.current !== nextUserId;
    userIdRef.current = nextUserId;
    if (identityChanged) { setUserId(nextUserId); setProfile(null); setLoadedAvatar(''); }
    setEmail(nextEmail);
    if (identityChanged) onUserChange?.(nextUserId);
    if (nextUserId) setAuthOpen(false);
    if (!nextUserId) {
      setProfile(null);
      promptedForProfileRef.current = false;
      return;
    }

    const { data } = await createClient().from('profiles').select('*').eq('id', nextUserId).maybeSingle();
    if (userIdRef.current !== nextUserId) return;
    setProfile(data);
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
    }).catch(() => { if (!cancelled) setAuthChecked(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!cancelled) void loadProfile(realUserId(session?.user), session?.user.email ?? '');
      }, 0);
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  useImperativeHandle(ref, () => ({
    openAccount: () => { if (userId) router.push('/account'); else { setAuthIntent(null); setAuthOpen(true); } },
    openAuth: (intent = null) => { setAuthIntent(intent); setAuthOpen(true); },
  }), [userId, router]);

  const avatarUrl = getProfileAvatarUrl(createClient(), profile);
  const profileLabel = getProfileLabel(profile, email);

  function openReport(reportId: string) {
    if (onOpenReport) onOpenReport(reportId);
    else router.push(`/?report=${encodeURIComponent(reportId)}`);
  }

  const avatar = userId && <span className="public-account-avatar-frame" aria-hidden="true">
    <span className="public-account-initials">{profileLabel.charAt(0).toUpperCase()}</span>
    {avatarUrl && <Image className="public-account-avatar" data-loaded={loadedAvatar === avatarUrl} src={avatarUrl} alt="" width={52} height={52} unoptimized loading="eager" onLoad={() => setLoadedAvatar(avatarUrl)} onError={() => setLoadedAvatar('')} />}
  </span>;

  return (
    <>
      <div className="public-account-actions">
        {userId && <NotificationLink key={userId} userId={userId} />}
        {!authChecked ? <span className="public-account-placeholder" role="status" aria-label="Loading profile" /> : <button
          type="button"
          className={`public-account-control${userId ? ' public-account-control-profile' : ' public-account-control-signed-out'}`}
          title={userId ? 'Your profile' : 'Sign in'}
          onClick={() => userId ? router.push('/account') : setAuthOpen(true)}
        >
          {avatar}
          <span className="public-account-label">{userId ? 'Profile' : 'Sign in'}</span>
        </button>}
      </div>

      {mobileTabs && <nav className="mobile-discovery-navigation" aria-label="Main app navigation">
        <div className="mobile-discovery-tabs">
          {mobileTabs}
          {userId ? <NotificationLink key={`mobile-${userId}`} userId={userId} mobile /> : <Link className="mobile-updates-link" href="/account/notifications" aria-label="Updates"><IoNotificationsOutline aria-hidden /><span>Updates</span></Link>}
          <button type="button" className="mobile-profile-button" title={userId ? 'Your profile' : 'Sign in'} onClick={() => userId ? router.push('/account') : setAuthOpen(true)}>
            {avatar || <IoPersonOutline aria-hidden />}<span>Profile</span>
          </button>
        </div>
      </nav>}

      {authOpen && <AuthDialog intent={authIntent} onClose={() => setAuthOpen(false)} />}
      {accountOpen && userId && (
        <AccountDialog
          onClose={() => setAccountOpen(false)}
          onAccountDataChanged={onAccountDataChanged}
          onOpenReport={openReport}
          onResumeDraft={onResumeDraft}
          onProfileChanged={setProfile}
          onSignedOut={() => {
            setAccountOpen(false);
            void loadProfile(null);
          }}
        />
      )}
    </>
  );
});
