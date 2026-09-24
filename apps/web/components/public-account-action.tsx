'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

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
  onAccountDataChanged?: () => void | Promise<void>;
  onOpenReport?: (reportId: string) => void;
  onResumeDraft?: () => void;
  onUserChange?: (userId: string | null) => void;
}>(function PublicAccountAction({ initialUserId = null, onAccountDataChanged, onOpenReport, onUserChange, onResumeDraft }, ref) {
  const router = useRouter();
  const [userId, setUserId] = useState(initialUserId);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [authIntent, setAuthIntent] = useState<AuthIntent>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const userIdRef = useRef(initialUserId);
  const promptedForProfileRef = useRef(false);

  const loadProfile = useCallback(async (nextUserId: string | null, nextEmail = '') => {
    const identityChanged = userIdRef.current !== nextUserId;
    userIdRef.current = nextUserId;
    if (identityChanged) setUserId(nextUserId);
    setEmail(nextEmail);
    if (identityChanged) onUserChange?.(nextUserId);
    if (nextUserId) setAuthOpen(false);
    if (!nextUserId) {
      setProfile(null);
      promptedForProfileRef.current = false;
      return;
    }

    const { data } = await createClient().from('profiles').select('*').eq('id', nextUserId).maybeSingle();
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
    });
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
    openAccount: () => { if (userId) setAccountOpen(true); else { setAuthIntent(null); setAuthOpen(true); } },
    openAuth: (intent = null) => { setAuthIntent(intent); setAuthOpen(true); },
  }), [userId]);

  const avatarUrl = getProfileAvatarUrl(createClient(), profile);
  const profileLabel = getProfileLabel(profile, email);

  function openReport(reportId: string) {
    if (onOpenReport) onOpenReport(reportId);
    else router.push(`/?report=${encodeURIComponent(reportId)}`);
  }

  return (
    <>
      <button
        type="button"
        className={`public-account-control${userId ? '' : ' public-account-control-signed-out'}`}
        onClick={() => userId ? setAccountOpen(true) : setAuthOpen(true)}
      >
        {userId && (avatarUrl ? (
          <Image className="public-account-avatar" src={avatarUrl} alt="" width={28} height={28} unoptimized aria-hidden />
        ) : (
          <span className="public-account-initials" aria-hidden>{profileLabel.charAt(0).toUpperCase()}</span>
        ))}
        <span>{userId ? 'Account' : 'Sign in'}</span>
      </button>

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
