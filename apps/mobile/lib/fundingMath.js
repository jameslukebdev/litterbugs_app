export const MIN_CONTRIBUTION_CENTS = 500;
export const MAX_CONTRIBUTION_CENTS = 500_000;

export function parseContributionAmount(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d{1,4}(\.\d{0,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents >= MIN_CONTRIBUTION_CENTS && cents <= MAX_CONTRIBUTION_CENTS
    ? cents
    : null;
}

export const calculatePlatformFee = (principalAmountCents) =>
  Math.floor((Number(principalAmountCents) + 5) / 10);
