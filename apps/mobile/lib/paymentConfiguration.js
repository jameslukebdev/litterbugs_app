export function stripeInitializationConfiguration({
  publishableKey,
  urlScheme,
  applePayEnabled,
  merchantIdentifier,
}) {
  return {
    publishableKey,
    urlScheme,
    ...(applePayEnabled && merchantIdentifier ? { merchantIdentifier } : {}),
  };
}

export function paymentSheetConfiguration({
  paymentIntentClientSecret,
  platform,
  applePayEnabled,
  isDevelopment,
}) {
  return {
    merchantDisplayName: 'Litterbugs',
    paymentIntentClientSecret,
    returnURL: 'litterbugs://stripe-redirect',
    allowsDelayedPaymentMethods: false,
    ...(platform === 'ios' && applePayEnabled ? {
      applePay: { merchantCountryCode: 'US' },
    } : {}),
    ...(platform === 'android' ? {
      googlePay: { merchantCountryCode: 'US', testEnv: isDevelopment },
    } : {}),
  };
}
