export function payoutConnectionPresentation({ status, loading, error } = {}) {
  if (loading) {
    return {
      label: 'Checking Stripe connection…',
      icon: null,
      color: '#687178',
      backgroundColor: '#F4F6F7',
    };
  }

  if (error) {
    return {
      label: 'Stripe status unavailable',
      detail: 'Tap to try again',
      icon: 'alert-circle-outline',
      color: '#8A6400',
      backgroundColor: '#FFF8DD',
    };
  }

  if (status?.payoutsEnabled === true) {
    return {
      label: 'Stripe connected',
      icon: 'checkmark-circle',
      color: '#2F7D32',
      backgroundColor: '#EEF7EF',
    };
  }

  return {
    label: 'Stripe not connected',
    icon: 'close-circle',
    color: '#C62828',
    backgroundColor: '#FFF1F1',
  };
}
