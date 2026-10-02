import { beforeEach, expect, it, vi } from 'vitest';
import Page from './page';

const identity = vi.hoisted(() => ({ claims: { sub: 'customer' } as Record<string, unknown> | null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims: identity.claims } }) } }) }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock('@/components/payment-return-content', () => ({ PaymentReturnContent: () => null }));
beforeEach(() => { identity.claims = { sub: 'customer' }; });

it('keeps receipt and report identifiers through an expired-session sign-in without forwarding provider secrets', async () => {
  identity.claims = null;
  const next = '/payment-return?contribution=receipt-id&report=report-id';
  await expect(Page({ searchParams: Promise.resolve({ contribution: 'receipt-id', report: 'report-id', payment_intent_client_secret: 'do-not-forward' }) }))
    .rejects.toThrow(`redirect:/sign-in?next=${encodeURIComponent(next)}`);
});
it('requires a permanent account for an anonymous session', async () => {
  identity.claims = { sub: 'guest', is_anonymous: true };
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(`redirect:/sign-in?next=${encodeURIComponent('/payment-return')}`);
});
it('passes authenticated receipt context through and ignores repeated parameters', async () => {
  const page = await Page({ searchParams: Promise.resolve({ contribution: 'receipt-id', report: ['a', 'b'] }) });
  expect(page.props).toEqual({ contribution: 'receipt-id', report: '' });
});
