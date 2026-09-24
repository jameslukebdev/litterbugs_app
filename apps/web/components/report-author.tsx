'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { getProfileAvatarUrl } from '@/lib/profile';
import { ModalShell } from '@/components/modal-shell';
import { MemberSafetyActions } from '@/components/member-safety-actions';
import { MemberReports } from '@/components/member-reports';
import { CommunityRank } from '@/components/community-rank';
import type { Database } from '@litterbugs/report-contract';

type Profile = Database['public']['Tables']['profiles']['Row'];
export type PublicProfile = Pick<Profile, 'id' | 'display_name' | 'username' | 'bio' | 'location' | 'provider_avatar_url' | 'avatar_path' | 'updated_at' | 'created_at'>;
export const publicFields = 'id,display_name,username,bio,location,provider_avatar_url,avatar_path,updated_at,created_at';
export function ReportAuthor({ profileId, sourceReportId, onBlocked, initialProfile }: { profileId: string | null; sourceReportId?: string; onBlocked?: () => void; initialProfile?: PublicProfile }) {
  const [loadedProfile, setProfile] = useState<PublicProfile | null>(initialProfile ?? null);
  const [open, setOpen] = useState(false);
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
  return <>
    <button className="report-author" onClick={() => setOpen(true)} aria-label={`View ${profile.display_name || 'member'}’s profile`}>
      {avatar ? <Image src={avatar} alt="" width={36} height={36} unoptimized /> : <span className="report-author-initial">{profile.display_name?.[0] || '?'}</span>}
      <span className="report-author-copy"><span>{profile.display_name || 'Community member'}</span><CommunityRank userId={profile.id} compact /></span>
    </button>
    {open && <ModalShell label="Member profile" onClose={() => setOpen(false)} className="member-profile-dialog">
      <h2>{profile.display_name || 'Community member'}</h2>
      {profile.username && <p>@{profile.username}</p>}
      {profile.location && <p>{profile.location}</p>}
      {profile.bio && <p>{profile.bio}</p>}
      <p>Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
      <CommunityRank userId={profile.id} />
      <MemberReports profileId={profile.id} />
      <MemberSafetyActions profileId={profile.id} sourceReportId={sourceReportId} onBlocked={() => { setOpen(false); onBlocked?.(); }} />
    </ModalShell>}
  </>;
}
