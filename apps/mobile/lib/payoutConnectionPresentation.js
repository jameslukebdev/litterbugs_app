import { colors } from './theme';
export function payoutConnectionPresentation({ status, loading, error } = {}) {
  if (loading && !status) {
    return {
      label: 'Updating payout details…',
      icon: null,
      color: colors.muted,
      backgroundColor: colors.mist,
    };
  }

  if (error) {
    return {
      label: 'Couldn’t update payout details',
      detail: 'Tap to try again',
      icon: 'alert-circle-outline',
      color: '#8A6400',
      backgroundColor: '#FFF8DD',
    };
  }

  if (status?.payoutsEnabled === true) {
    return {
      label: 'Ready to receive cleanup rewards',
      icon: 'checkmark-circle',
      color: colors.primary,
      backgroundColor: colors.primarySoft,
    };
  }

  return {
    label: 'Set up payouts',
    icon: 'wallet-outline',
    color: colors.body,
    backgroundColor: colors.mist,
  };
}
