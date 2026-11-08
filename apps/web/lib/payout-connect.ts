'use client';

import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js';
import { createClient } from '@/lib/supabase/client';
import { createPayoutSession, type PayoutSession } from '@/lib/funding';

// Keep the existing payout screen's white canvas, ink, purple actions and rounded controls.
export const payoutConnectAppearance = {
  overlays: 'dialog' as const,
  variables: {
    colorPrimary: '#5146ed', colorBackground: '#ffffff', colorText: '#292932',
    colorSecondaryText: '#686477', colorDanger: '#a8323b', colorBorder: '#e3dff0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSizeBase: '16px', spacingUnit: '8px', borderRadius: '14px', buttonBorderRadius: '14px',
    buttonPaddingX: '18px', buttonPaddingY: '12px', buttonLabelFontSize: '16px', buttonLabelFontWeight: '700',
    formBorderRadius: '14px', inputFieldPaddingY: '12px',
    buttonPrimaryColorBackground: '#5146ed', buttonPrimaryColorBorder: '#5146ed', buttonPrimaryColorText: '#ffffff',
    buttonSecondaryColorBackground: '#ffffff', buttonSecondaryColorBorder: '#d6ceef', buttonSecondaryColorText: '#4438bb',
    headingLgFontSize: '24px', headingMdFontSize: '20px',
  },
};

// Stripe says to logout on app sign-out, not on ordinary modal closure. Retain this listener
// after the form unmounts so closed forms' sessions are also invalidated on sign-out/account change.
const sessions = new Map<StripeConnectInstance, { userId: string; publishableKey: string; onInvalidated: () => void; invalidate: () => void }>();
let watchingAuth = false;
let authRevision = 0;
let pendingOwner: { userId: string; onInvalidated: () => void } | null = null;

function watchPayoutAuth() {
  if (!watchingAuth) {
    watchingAuth = true;
    createClient().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        authRevision++;
        if (pendingOwner && (event === 'SIGNED_OUT' || pendingOwner.userId !== session?.user.id)) {
          const owner = pendingOwner; pendingOwner = null; owner.onInvalidated();
        }
        for (const [instance, owner] of sessions) {
          if (event === 'SIGNED_OUT' || owner.userId !== session?.user.id) {
            void instance.logout().catch(() => undefined);
            owner.invalidate();
            sessions.delete(instance);
          }
        }
      }
    });
  }
}

/** Reuse the signed-in member's Connect instance. Secrets still refresh through Stripe's callback. */
export async function reusePayoutConnect(onInvalidated: () => void) {
  watchPayoutAuth();
  const revision = authRevision;
  const { data } = await createClient().auth.getSession();
  if (!data.session || revision !== authRevision) throw new Error('Please sign in again to set up payouts.');
  for (const [instance, owner] of sessions) {
    if (owner.userId === data.session.user.id) {
      owner.onInvalidated = onInvalidated;
      return instance;
    }
  }
  pendingOwner = { userId: data.session.user.id, onInvalidated };
  return null;
}

export async function createPayoutConnect(firstSession: PayoutSession, onInvalidated: () => void) {
  const supabase = createClient();
  watchPayoutAuth();
  const revision = authRevision;
  const { data } = await supabase.auth.getSession();
  if (!data.session || revision !== authRevision) throw new Error('Please sign in again to set up payouts.');
  const userId = data.session.user.id;
  if (pendingOwner?.userId === userId) pendingOwner = null;
  for (const [instance, owner] of sessions) {
    if (owner.userId === userId && owner.publishableKey === firstSession.publishableKey) {
      owner.onInvalidated = onInvalidated;
      return instance;
    }
  }
  let initial: PayoutSession | null = firstSession;
  let valid = true;
  const instance = loadConnectAndInitialize({
    publishableKey: firstSession.publishableKey,
    appearance: payoutConnectAppearance,
    fetchClientSecret: async () => {
      if (!valid) throw new Error('Payout session has ended. Please sign in again.');
      const next = initial && initial.expiresAt * 1000 > Date.now() ? initial : await createPayoutSession();
      initial = null;
      if (!valid || next.publishableKey !== firstSession.publishableKey) {
        throw new Error('Payout session has changed. Please reopen payout setup.');
      }
      return next.clientSecret;
    },
  });
  const owner = { userId, publishableKey: firstSession.publishableKey, onInvalidated,
    invalidate: () => { valid = false; initial = null; owner.onInvalidated(); } };
  sessions.set(instance, owner);
  return instance;
}
