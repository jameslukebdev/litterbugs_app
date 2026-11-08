'use client';

import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js/pure';
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
    buttonPrimaryColorBackground: '#5146ed', buttonPrimaryColorBorder: '#5146ed', buttonPrimaryColorText: '#ffffff',
    buttonSecondaryColorBackground: '#ffffff', buttonSecondaryColorBorder: '#d6ceef', buttonSecondaryColorText: '#4438bb',
    headingLgFontSize: '24px', headingMdFontSize: '20px',
  },
};

// Stripe says to logout on app sign-out, not on ordinary modal closure. Retain this listener
// after the form unmounts so closed forms' sessions are also invalidated on sign-out/account change.
const sessions = new Map<StripeConnectInstance, { userId: string; invalidate: () => void }>();
let watchingAuth = false;
let authRevision = 0;

export async function createPayoutConnect(firstSession: PayoutSession, onInvalidated: () => void) {
  const supabase = createClient();
  if (!watchingAuth) {
    watchingAuth = true;
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        authRevision++;
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
  const revision = authRevision;
  const { data } = await supabase.auth.getSession();
  if (!data.session || revision !== authRevision) throw new Error('Please sign in again to set up payouts.');
  const userId = data.session.user.id;
  let initial: PayoutSession | null = firstSession;
  let valid = true;
  const instance = loadConnectAndInitialize({
    publishableKey: firstSession.publishableKey,
    appearance: payoutConnectAppearance,
    fetchClientSecret: async () => {
      if (!valid) throw new Error('Payout session has ended. Please sign in again.');
      const next = initial ?? await createPayoutSession();
      initial = null;
      if (!valid || next.publishableKey !== firstSession.publishableKey) {
        throw new Error('Payout session has changed. Please reopen payout setup.');
      }
      return next.clientSecret;
    },
  });
  sessions.set(instance, { userId, invalidate: () => { valid = false; initial = null; onInvalidated(); } });
  return instance;
}
