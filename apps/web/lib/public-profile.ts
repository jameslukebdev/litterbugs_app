import type { Database } from '@litterbugs/report-contract';
type Profile = Database['public']['Tables']['profiles']['Row'];
export type PublicProfile = Pick<Profile, 'id' | 'display_name' | 'username' | 'bio' | 'location' | 'provider_avatar_url' | 'avatar_path' | 'updated_at' | 'created_at'>;
export const publicFields = 'id,display_name,username,bio,location,provider_avatar_url,avatar_path,updated_at,created_at';
