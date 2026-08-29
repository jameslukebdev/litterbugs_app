import { createClient } from '@/lib/supabase/client';

export type CleanupFeatureFlags = {
  payments_enabled?: boolean;
  gemini_financial_review_enabled?: boolean;
};

export type ContributionIntent = {
  contributionId: string;
  paymentIntentClientSecret: string;
  publishableKey: string;
  principalAmountCents: number;
  platformFeeCents: number;
  totalAmountCents: number;
  currency: 'usd';
};

export type PayoutStatus = {
  onboardingStatus: 'not_started' | 'pending' | 'restricted' | 'enabled';
  payoutsEnabled: boolean;
  requirementsDue: string[];
};

export function formatUsd(cents = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function parseContributionAmount(value: string) {
  const normalized = value.trim();
  if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents >= 500 && cents <= 500_000 ? cents : null;
}

export function calculatePlatformFee(principalAmountCents: number) {
  return Math.floor((principalAmountCents + 5) / 10);
}

export async function edgeFunctionErrorMessage(
  data: unknown,
  error: unknown,
  fallback: string,
) {
  if (
    data
    && typeof data === 'object'
    && 'error' in data
    && typeof data.error === 'string'
  ) return data.error;

  const context = error && typeof error === 'object' && 'context' in error
    ? error.context
    : null;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: unknown };
      if (typeof payload.error === 'string') return payload.error;
    } catch {
      // Supabase can return a non-JSON response for network or gateway failures.
    }
  }

  return fallback;
}

export async function loadCleanupFeatureFlags(): Promise<CleanupFeatureFlags> {
  const { data, error } = await createClient()
    .from('cleanup_feature_flags')
    .select('name, enabled');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map(({ name, enabled }) => [name, enabled]));
}

export async function createCleanupContribution(
  reportId: string,
  principalAmountCents: number,
): Promise<ContributionIntent> {
  const { data, error } = await createClient().functions.invoke('create-cleanup-contribution', {
    body: {
      reportId,
      principalAmountCents,
      clientRequestId: crypto.randomUUID(),
    },
  });
  if (error || data?.error) {
    throw new Error(await edgeFunctionErrorMessage(data, error, 'Payment could not be started. Please try again.'));
  }
  return data as ContributionIntent;
}

export async function loadPayoutStatus(): Promise<PayoutStatus> {
  const { data, error } = await createClient().functions.invoke('create-cleaner-onboarding-link', {
    body: { mode: 'status' },
  });
  if (error || data?.error) {
    throw new Error(await edgeFunctionErrorMessage(data, error, 'Payout status could not be loaded. Please try again.'));
  }
  return data as PayoutStatus;
}

export async function createPayoutLink(mode: 'link' | 'dashboard') {
  const { data, error } = await createClient().functions.invoke('create-cleaner-onboarding-link', {
    body: {
      mode,
      returnTarget: 'web',
      ...(mode === 'link' ? { confirmAge18: true } : {}),
    },
  });
  if (error || data?.error || !data?.url) {
    throw new Error(await edgeFunctionErrorMessage(
      data,
      error,
      'Payout setup is temporarily unavailable. Please try again later.',
    ));
  }
  return data as PayoutStatus & { url: string };
}
