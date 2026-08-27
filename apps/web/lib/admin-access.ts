import 'server-only';

import { createClient } from '@/lib/supabase/server';

export type AdminAccessState = 'signed_out' | 'not_authorized' | 'mfa_required' | 'authorized';

export async function getAdminAccessState(): Promise<AdminAccessState> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return 'signed_out';

  const { data: isMember, error: memberError } = await supabase.rpc('is_cleanup_admin_member');
  if (memberError || !isMember) return 'not_authorized';

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_cleanup_admin');
  if (adminError || !isAdmin) return 'mfa_required';
  return 'authorized';
}
