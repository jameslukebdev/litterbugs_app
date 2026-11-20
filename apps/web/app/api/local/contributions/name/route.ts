import { createClient } from '@/lib/supabase/server';
import { localContributionRequest, readLocalNameChoices, writeLocalNameChoice } from '@/lib/local-contribution-privacy';

export const runtime = 'nodejs';
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const blocked = localContributionRequest(request);
  if (blocked) return reply({ error: 'Not available' }, blocked);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.contributionId !== 'string' || !uuid.test(body.contributionId) || !['read', 'save'].includes(body.action)
    || (body.action === 'save' && typeof body.shown !== 'boolean')) return reply({ error: 'Invalid choice' }, 400);
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user || user.is_anonymous) return reply({ error: 'Please sign in again.' }, 401);
    // Recheck ownership and financial state for every read and every change.
    const { data: contribution, error } = await client.from('cleanup_contributions').select('*')
      .eq('id', body.contributionId).eq('contributor_id', user.id).maybeSingle();
    if (error || !contribution) return reply({ error: 'Contribution not found' }, 404);
    if (!['succeeded', 'paid_out'].includes(contribution.status) || contribution.refunded_at) {
      return reply({ error: 'This contribution cannot be changed.' }, 409);
    }
    // Once the real backend supports privacy, its persisted setting is authoritative.
    if (contribution.show_contributor_name !== undefined) return reply({ error: 'Reload this payment.' }, 409);
    if (body.action === 'save') await writeLocalNameChoice(contribution.id, body.shown);
    const choices = await readLocalNameChoices();
    return reply({ shown: choices[contribution.id] ?? true });
  } catch { return reply({ error: 'Couldn’t save your choice. Try again.' }, 503); }
}
