// Public live Stripe links owned by Litterbugs (acct_1U2HZe40KMkUKMFW).
// Website-only support; no app entitlements or cleanup contribution records.
export function monthlySupportLinks() {
  return {
    options: [
      { amount: 5, url: 'https://buy.stripe.com/dRmfZa2yDeU24DxfMF7Zu00' },
      { amount: 10, url: 'https://buy.stripe.com/bJe5kw8X17rAgmf1VP7Zu01' },
      { amount: 25, url: 'https://buy.stripe.com/bJe9AMddh4fo5HBfMF7Zu02' },
    ],
    portalUrl: 'https://billing.stripe.com/p/login/dRmfZa2yDeU24DxfMF7Zu00',
  };
}

/** Fixed, non-identifying properties for checkout intent, never proof of payment. */
export function supportCheckoutProperties(value: Record<string, unknown>) {
  return [5, 10, 25].includes(value.amount as number) && value.currency === 'USD' && value.billing_interval === 'month'
    ? { amount: value.amount as number, currency: 'USD', billing_interval: 'month' } : null;
}
