type OperationRow = Record<string, unknown>;

type PayoutContribution = {
  stripe_charge_id: string | null;
  principal_amount_cents: number;
};

const isNullComposite = (row: OperationRow) =>
  Object.values(row).every((value) => value === null);

export const claimedOperationRow = <T extends object>(
  data: unknown,
): T | null => {
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    if (data.length > 1) {
      throw new Error("Financial operation claim returned multiple rows");
    }
    return claimedOperationRow<T>(data[0]);
  }

  if (data === null || data === undefined) return null;
  if (typeof data !== "object") {
    throw new Error("Financial operation claim returned invalid data");
  }
  const row = data as OperationRow;
  if (isNullComposite(row)) return null;
  if (typeof row.id !== "string" || row.id.length === 0) {
    throw new Error("Financial operation claim returned a row without an ID");
  }
  return data as T;
};

export const payoutSourceTransaction = (
  contributions: PayoutContribution[],
  rewardAmountCents: number,
): string | null => {
  if (
    contributions.length !== 1 ||
    !Number.isSafeInteger(rewardAmountCents) ||
    rewardAmountCents <= 0
  ) return null;

  const contribution = contributions[0];
  if (
    !contribution.stripe_charge_id ||
    !contribution.stripe_charge_id.startsWith("ch_") ||
    !Number.isSafeInteger(contribution.principal_amount_cents) ||
    contribution.principal_amount_cents !== rewardAmountCents
  ) return null;

  return contribution.stripe_charge_id;
};
