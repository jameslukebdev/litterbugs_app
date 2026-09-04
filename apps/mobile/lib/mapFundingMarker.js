export const isFundedMapMarker = (cents = 0) => (Number(cents) || 0) > 0;

export const formatMapFundingLabel = (cents = 0) => {
  const amount = Number(cents) || 0;
  if (amount <= 0) return 'Volunteer';
  const hasCents = amount % 100 !== 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount / 100);
};
