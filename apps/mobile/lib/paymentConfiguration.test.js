import { describe, expect, it } from 'vitest';

import {
  paymentSheetConfiguration,
  stripeInitializationConfiguration,
} from './paymentConfiguration';

describe('funded-cleanup payment configuration', () => {
  it('keeps Apple Pay and its Merchant ID out of the interim iOS build', () => {
    expect(stripeInitializationConfiguration({
      publishableKey: 'pk_test_example',
      urlScheme: 'litterbugs',
      applePayEnabled: false,
      merchantIdentifier: undefined,
    })).toEqual({
      publishableKey: 'pk_test_example',
      urlScheme: 'litterbugs',
    });

    expect(paymentSheetConfiguration({
      paymentIntentClientSecret: 'pi_secret',
      platform: 'ios',
      applePayEnabled: false,
      isDevelopment: false,
    })).toEqual({
      merchantDisplayName: 'Litterbugs',
      paymentIntentClientSecret: 'pi_secret',
      returnURL: 'litterbugs://stripe-redirect',
      allowsDelayedPaymentMethods: false,
    });
  });

  it('retains the later Apple Pay enablement path', () => {
    expect(stripeInitializationConfiguration({
      publishableKey: 'pk_live_example',
      urlScheme: 'litterbugs',
      applePayEnabled: true,
      merchantIdentifier: 'merchant.com.litterbugs.app',
    })).toMatchObject({ merchantIdentifier: 'merchant.com.litterbugs.app' });

    expect(paymentSheetConfiguration({
      paymentIntentClientSecret: 'pi_secret',
      platform: 'ios',
      applePayEnabled: true,
      isDevelopment: false,
    })).toMatchObject({ applePay: { merchantCountryCode: 'US' } });
  });

  it('keeps Google Pay scoped to Android while card entry remains universal', () => {
    expect(paymentSheetConfiguration({
      paymentIntentClientSecret: 'pi_secret',
      platform: 'android',
      applePayEnabled: false,
      isDevelopment: true,
    })).toMatchObject({
      googlePay: { merchantCountryCode: 'US', testEnv: true },
    });
  });
});
