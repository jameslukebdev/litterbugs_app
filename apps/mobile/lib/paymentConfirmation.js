export function evaluatePaymentConfirmation({ paymentIntent, error }) {
  if (error) {
    return {
      confirmed: false,
      message: 'Stripe could not confirm the final payment status yet. Do not try the payment again. Return to the report and refresh it shortly.',
    };
  }

  if (paymentIntent?.status !== 'Succeeded') {
    return {
      confirmed: false,
      message: 'Stripe is still confirming this payment. Do not try the payment again. Return to the report and refresh it shortly.',
    };
  }

  return { confirmed: true, message: null };
}
