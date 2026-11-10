'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiChevronRight, FiMapPin } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import { getProfileAvatarUrl } from '@/lib/profile';
import { ModalShell } from '@/components/modal-shell';
import { MemberSafetyActions } from '@/components/member-safety-actions';
import { CommunityRank } from '@/components/community-rank';
import styles from './report-author.module.css';

export { publicFields, type PublicProfile } from '@/lib/public-profile';
import { publicFields, type PublicProfile } from '@/lib/public-profile';
export function ReportAuthor({ profileId, sourceReportId, onBlocked, initialProfile }: { profileId: string | null; sourceReportId?: string; onBlocked?: () => void; initialProfile?: PublicProfile }) {
  const [loadedProfile, setProfile] = useState<PublicProfile | null>(initialProfile ?? null);
  const [open, setOpen] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState('');
  useEffect(() => {
    let cancelled = false;
    if (initialProfile) return;
    if (profileId) void createClient().from('profiles').select(publicFields).eq('id', profileId).maybeSingle().then(({ data }) => {
      if (!cancelled) setProfile(data);
    });
    return () => { cancelled = true; };
  }, [profileId, initialProfile]);
  const profile = initialProfile ?? (loadedProfile?.id === profileId ? loadedProfile : null);
  if (!profile) return null;
  const avatar = getProfileAvatarUrl(createClient(), profile);
  const hasAvatar = Boolean(avatar && failedAvatar !== avatar);
  const name = profile.display_name || 'Community member';
  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase();
  return <>
    <button className="report-author" onClick={() => setOpen(true)} aria-label={`View ${profile.display_name || 'member'}’s profile`}>
      {hasAvatar ? <Image src={avatar} alt="" width={36} height={36} unoptimized referrerPolicy="no-referrer" onError={() => setFailedAvatar(avatar)} /> : <span className="report-author-initial">{initial}</span>}
      <span className="report-author-copy"><span>{name}</span><CommunityRank userId={profile.id} compact /></span>
    </button>
    {open && <ModalShell label="Member profile" onClose={() => setOpen(false)} className={`member-profile-dialog ${styles.dialog}`}>
      <div className={styles.summary}>
        <header className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {hasAvatar ? <Image src={avatar} alt="" width={72} height={72} unoptimized referrerPolicy="no-referrer" onError={() => setFailedAvatar(avatar)} /> : initial}
          </span>
          <div className={styles.details}>
            <h2>{name}</h2>
            {profile.username && <p>@{profile.username}</p>}
            {profile.location && <p className={styles.location}><FiMapPin aria-hidden="true" />{profile.location}</p>}
            <p>Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
          </div>
        </header>
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        <CommunityRank userId={profile.id} preview />
        <Link href={`/members/${profile.id}`} className={`secondary-button ${styles.profileLink}`}>Open full profile <FiChevronRight aria-hidden="true" /></Link>
      </div>
      <MemberSafetyActions profileId={profile.id} memberName={profile.display_name} sourceReportId={sourceReportId} onBlocked={() => { setOpen(false); onBlocked?.(); }} />
    </ModalShell>}
  </>;
}
