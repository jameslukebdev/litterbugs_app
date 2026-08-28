type StripeWebhookEvent = {
  livemode: boolean;
};

type ConstructEvent<T extends StripeWebhookEvent> = (
  rawBody: string,
  signature: string,
  secret: string,
) => Promise<T>;

type ConstructStripeWebhookEventOptions<T extends StripeWebhookEvent> = {
  rawBody: string;
  signature: string;
  liveSecret: string;
  testSecret?: string | null;
  constructEvent: ConstructEvent<T>;
};

export const constructStripeWebhookEvent = async <T extends StripeWebhookEvent>(
  {
    rawBody,
    signature,
    liveSecret,
    testSecret,
    constructEvent,
  }: ConstructStripeWebhookEventOptions<T>,
): Promise<T> => {
  try {
    return await constructEvent(rawBody, signature, liveSecret);
  } catch (liveError) {
    const fallbackSecret = testSecret?.trim();
    if (!fallbackSecret || fallbackSecret === liveSecret) throw liveError;

    const event = await constructEvent(rawBody, signature, fallbackSecret);
    if (event.livemode) {
      throw new Error("Invalid Stripe webhook signature mode");
    }
    return event;
  }
};
