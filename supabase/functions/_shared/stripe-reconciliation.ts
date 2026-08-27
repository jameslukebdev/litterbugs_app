export const paymentIntentMatchesLedger = ({
  intentId,
  intentAmountReceivedCents,
  intentCurrency,
  intentTransferGroup,
  intentMetadata,
  ledgerPaymentIntentId,
  ledgerReportId,
  ledgerContributorId,
  ledgerClientRequestId,
  ledgerPrincipalCents,
  ledgerFeeCents,
  ledgerTotalCents,
}: {
  intentId: string;
  intentAmountReceivedCents: number;
  intentCurrency: string;
  intentTransferGroup: string | null;
  intentMetadata: Record<string, string>;
  ledgerPaymentIntentId: string;
  ledgerReportId: string;
  ledgerContributorId: string | null;
  ledgerClientRequestId: string;
  ledgerPrincipalCents: number;
  ledgerFeeCents: number;
  ledgerTotalCents: number;
}) =>
  intentId === ledgerPaymentIntentId &&
  intentAmountReceivedCents === ledgerTotalCents &&
  intentCurrency === "usd" &&
  intentTransferGroup === `cleanup_report_${ledgerReportId}` &&
  intentMetadata.purpose === "cleanup_fund" &&
  intentMetadata.report_id === ledgerReportId &&
  (!ledgerContributorId || intentMetadata.contributor_id === ledgerContributorId) &&
  intentMetadata.client_request_id === ledgerClientRequestId &&
  intentMetadata.principal_amount_cents === String(ledgerPrincipalCents) &&
  intentMetadata.platform_fee_cents === String(ledgerFeeCents);

export const refundMatchesLedger = ({
  refundPaymentIntentId,
  refundAmountCents,
  refundCurrency,
  ledgerPaymentIntentId,
  ledgerTotalCents,
}: {
  refundPaymentIntentId: string | undefined;
  refundAmountCents: number;
  refundCurrency: string;
  ledgerPaymentIntentId: string;
  ledgerTotalCents: number;
}) =>
  refundPaymentIntentId === ledgerPaymentIntentId &&
  refundAmountCents === ledgerTotalCents &&
  refundCurrency === "usd";

export const transferMatchesLedger = ({
  transferId,
  transferDestinationId,
  transferAmountCents,
  transferCurrency,
  ledgerTransferId,
  ledgerDestinationId,
  ledgerRewardCents,
}: {
  transferId: string;
  transferDestinationId: string | undefined;
  transferAmountCents: number;
  transferCurrency: string;
  ledgerTransferId: string | null;
  ledgerDestinationId: string | null | undefined;
  ledgerRewardCents: number;
}) =>
  transferAmountCents === ledgerRewardCents &&
  transferCurrency === "usd" &&
  transferDestinationId === ledgerDestinationId &&
  (!ledgerTransferId || ledgerTransferId === transferId);
