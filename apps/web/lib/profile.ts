import type { Database } from '@litterbugs/report-contract';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileAvatarFields = Pick<Profile, 'avatar_path' | 'display_name' | 'provider_avatar_url' | 'updated_at'>;

export type ProfileDraft = {
  displayName: string;
  username: string;
  bio: string;
  location: string;
};

export type ProfileDraftErrors = Partial<Record<keyof ProfileDraft, string>>;

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'litterbugs',
  'moderator',
  'official',
  'support',
]);

export function validateProfileDraft(draft: ProfileDraft) {
  const values = {
    display_name: draft.displayName.trim(),
    username: draft.username.trim().toLowerCase() || null,
    bio: draft.bio.trim() || null,
    location: draft.location.trim() || null,
  };
  const errors: ProfileDraftErrors = {};

  if (!values.display_name) errors.displayName = 'Display name is required.';
  else if (values.display_name.length > 60) errors.displayName = 'Use 60 characters or fewer.';

  if (values.username) {
    if (values.username.length < 3 || values.username.length > 30) {
      errors.username = 'Use between 3 and 30 characters.';
    } else if (!/^[a-z0-9][a-z0-9._]*[a-z0-9]$/.test(values.username)) {
      errors.username = 'Use letters, numbers, periods, or underscores, beginning and ending with a letter or number.';
    } else if (RESERVED_USERNAMES.has(values.username)) {
      errors.username = 'That username is reserved.';
    }
  }

  if (values.bio && values.bio.length > 160) errors.bio = 'Use 160 characters or fewer.';
  if (values.location && values.location.length > 80) errors.location = 'Use 80 characters or fewer.';

  return { values, errors, valid: Object.keys(errors).length === 0 };
}

export function getProfileAvatarUrl(
  supabase: SupabaseClient<Database>,
  profile: ProfileAvatarFields | null,
) {
  if (profile?.avatar_path) {
    const { data } = supabase.storage.from('profile_avatars').getPublicUrl(profile.avatar_path);
    if (data.publicUrl) {
      const separator = data.publicUrl.includes('?') ? '&' : '?';
      return `${data.publicUrl}${separator}v=${encodeURIComponent(profile.updated_at)}`;
    }
  }
  return profile?.provider_avatar_url || '';
}

export function getProfileLabel(profile: Profile | null, email = '') {
  return profile?.display_name || profile?.username || email.split('@')[0] || 'Litterbugs member';
}
