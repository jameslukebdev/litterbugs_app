import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { isPermanentUser } from './reportAccess';
import { useSession } from './session';
import { supabase } from './supabase';

export const PUBLIC_PROFILE_FIELDS = [
  'id',
  'display_name',
  'username',
  'bio',
  'location',
  'provider_avatar_url',
  'avatar_path',
  'profile_completed_at',
  'rank_celebrated_through_points',
  'reports_created_count',
  'created_at',
  'updated_at',
].join(',');

const ProfileContext = createContext(null);

export const getProfileAvatarUrl = (profile) => {
  if (profile?.avatar_path) {
    const { data } = supabase.storage
      .from('profile_avatars')
      .getPublicUrl(profile.avatar_path);
    const version = encodeURIComponent(profile.updated_at || '1');
    return data?.publicUrl ? `${data.publicUrl}?v=${version}` : null;
  }

  return profile?.provider_avatar_url || null;
};

export const getProfileInitials = (displayName) => {
  const parts = String(displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return '?';
  return parts.map((part) => part[0]?.toUpperCase()).join('');
};

export function ProfileProvider({ children }) {
  const { user } = useSession();
  const permanent = isPermanentUser(user);
  const [profile, setProfile] = useState(null);
  const [blockedIds, setBlockedIds] = useState([]);
  const [loading, setLoading] = useState(permanent);
  const [error, setError] = useState(null);
  const [pendingReportCoordinate, setPendingReportCoordinate] = useState(null);

  const refreshProfile = useCallback(async () => {
    if (!permanent) {
      setProfile(null);
      setBlockedIds([]);
      setLoading(false);
      setError(null);
      return null;
    }

    setLoading(true);
    const [profileResult, blocksResult] = await Promise.all([
      supabase
        .from('profiles')
        .select(PUBLIC_PROFILE_FIELDS)
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id),
    ]);

    if (profileResult.error || blocksResult.error) {
      console.log('Profile load error:', profileResult.error || blocksResult.error);
      setError('Your profile could not be loaded. Pull to try again.');
    } else {
      setProfile(profileResult.data ?? null);
      setBlockedIds((blocksResult.data ?? []).map(({ blocked_id }) => blocked_id));
      setError(null);
    }

    setLoading(false);
    return profileResult.data ?? null;
  }, [permanent, user?.id]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const updateProfile = useCallback(async (updates) => {
    if (!permanent) throw new Error('Authentication required');

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select(PUBLIC_PROFILE_FIELDS)
      .single();

    if (updateError) throw updateError;
    setProfile(data);
    setError(null);
    return data;
  }, [permanent, user?.id]);

  const blockUser = useCallback(async (profileId) => {
    if (!permanent || !profileId || profileId === user.id) {
      throw new Error('This account cannot be blocked.');
    }

    const { error: blockError } = await supabase
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_id: profileId });

    if (blockError && blockError.code !== '23505') throw blockError;
    setBlockedIds((current) => (
      current.includes(profileId) ? current : [...current, profileId]
    ));
  }, [permanent, user?.id]);

  const unblockUser = useCallback(async (profileId) => {
    if (!permanent || !profileId) throw new Error('Authentication required');

    const { error: unblockError } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', profileId);

    if (unblockError) throw unblockError;
    setBlockedIds((current) => current.filter((id) => id !== profileId));
  }, [permanent, user?.id]);

  const consumePendingReportCoordinate = useCallback(() => {
    const coordinate = pendingReportCoordinate;
    setPendingReportCoordinate(null);
    return coordinate;
  }, [pendingReportCoordinate]);

  const value = useMemo(() => ({
    profile,
    blockedIds,
    loading,
    error,
    refreshProfile,
    updateProfile,
    blockUser,
    unblockUser,
    pendingReportCoordinate,
    setPendingReportCoordinate,
    consumePendingReportCoordinate,
  }), [
    blockUser,
    blockedIds,
    consumePendingReportCoordinate,
    error,
    loading,
    pendingReportCoordinate,
    profile,
    refreshProfile,
    unblockUser,
    updateProfile,
  ]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
