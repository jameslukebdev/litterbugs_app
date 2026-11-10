'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiMap, FiMapPin } from 'react-icons/fi';
import type { PublicProfile } from '@/lib/public-profile';
import { CommunityRank } from '@/components/community-rank';
import { MemberReports } from '@/components/member-reports';
import { MemberSafetyActions } from '@/components/member-safety-actions';
import styles from './member-page.module.css';

export function MemberPage({ profile, avatarUrl }: { profile: PublicProfile; avatarUrl: string }) {
  const router = useRouter();
  const [failedAvatar, setFailedAvatar] = useState('');
  const name = profile.display_name || 'Community member';
  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase();
  return <main className={styles.profile}>
    <Link href="/map" className={styles.browse}><FiMap aria-hidden="true" /> Browse cleanups</Link>
    <header className={styles.identity}>
      <span className={styles.avatar} aria-hidden="true">
        {avatarUrl && failedAvatar !== avatarUrl ? <Image src={avatarUrl} alt="" width={76} height={76} unoptimized referrerPolicy="no-referrer" onError={() => setFailedAvatar(avatarUrl)} /> : initial}
      </span>
      <div className={styles.details}>
        <h1>{name}</h1>
        {profile.username && <p>@{profile.username}</p>}
        {profile.location && <p className={styles.location}><FiMapPin aria-hidden="true" />{profile.location}</p>}
        <p>Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
      </div>
    </header>
    <CommunityRank userId={profile.id} />
    <MemberReports key={profile.id} profileId={profile.id} />
    <MemberSafetyActions profileId={profile.id} memberName={profile.display_name} onBlocked={() => router.push('/')} />
  </main>;
}
