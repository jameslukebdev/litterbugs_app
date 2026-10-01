'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PublicProfile } from '@/lib/public-profile';
import { CommunityRank } from '@/components/community-rank';
import { MemberReports } from '@/components/member-reports';
import { MemberSafetyActions } from '@/components/member-safety-actions';
export function MemberPage({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  return <main className="info-page"><Link href="/">Browse cleanups</Link><h1>{profile.display_name || 'Community member'}</h1>
    {profile.username && <p>@{profile.username}</p>}{profile.location && <p>{profile.location}</p>}{profile.bio && <p>{profile.bio}</p>}
    <p>Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
    <CommunityRank userId={profile.id} /><MemberReports profileId={profile.id} /><MemberSafetyActions profileId={profile.id} onBlocked={() => router.push('/')} />
  </main>;
}
