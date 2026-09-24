import { createClient } from '@/lib/supabase/client';
import { createCleanupContribution, type ContributionIntent } from '@/lib/funding';

type Attempt = { requestId: string; amount: number; createdAt: number };
const key = (userId: string, reportId: string) => `litterbugs-payment:${userId}:${reportId}`;
const maxAge = 23 * 60 * 60 * 1000;
export function readPaymentAttempt(userId: string, reportId: string): Attempt | null {
  const raw = localStorage.getItem(key(userId, reportId));
  if (!raw) return null;
  const saved = JSON.parse(raw) as Attempt;
  if (!saved.requestId || !Number.isInteger(saved.amount) || saved.amount < 100 || saved.amount > 100000 || !Number.isFinite(saved.createdAt)) throw new Error('Your saved payment could not be read. Check Payments before paying again.');
  return saved;
}
export async function resumeOrCreatePayment(userId: string, reportId: string, amount: number): Promise<{ intent?: ContributionIntent; contributionId?: string; amount: number }> {
  // Persist only an idempotency reference, never card data or a Stripe client secret.
  const saved = readPaymentAttempt(userId, reportId);
  const attempt = saved ?? { requestId: crypto.randomUUID(), amount, createdAt: Date.now() };
  if (saved) {
    const client = createClient();
    const { data: row, error } = await client.from('cleanup_contributions').select('id,status').eq('contributor_id', userId).eq('client_request_id', attempt.requestId).maybeSingle();
    if (error) throw new Error('We couldn’t check your previous payment. Retry before paying again.');
    if (row) {
      const { data, error: checkError } = await client.functions.invoke('check-contribution-status', { body: { contributionId: row.id } });
      if (checkError || data?.error) throw new Error('We couldn’t confirm your previous payment. Check Payments before paying again.');
      if (!['requires_payment_method', 'requires_confirmation'].includes(data?.providerState)) {
        // Terminal confirmation lets a later, explicit visit start another contribution.
        // This visit still opens the receipt instead of charging again.
        if (['succeeded', 'canceled'].includes(data?.providerState) && readPaymentAttempt(userId, reportId)?.requestId === attempt.requestId) localStorage.removeItem(key(userId, reportId));
        // Processing payments retain their recovery reference.
        return { contributionId: row.id, amount: attempt.amount };
      }
    }
    if (Date.now() - attempt.createdAt > maxAge) throw new Error('Your earlier payment needs a status check. Open Payments or contact support before paying again.');
  }
  localStorage.setItem(key(userId, reportId), JSON.stringify(attempt));
  const intent = await createCleanupContribution(reportId, attempt.amount, attempt.requestId);
  return { intent, amount: attempt.amount };
}
