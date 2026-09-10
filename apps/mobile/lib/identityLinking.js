export const identityLinkErrorMessage = (error) => {
  if (['identity_already_exists', 'identity_already_linked', 'email_exists'].includes(error?.code)
    || /identity.*already.*(exists|linked)|already.*(another|different).*user|email.*already.*(registered|exists)/i.test(error?.message || '')) {
    return 'This sign-in is already used by another Litterbugs account. Your accounts are still separate. Contact us if you need help bringing them together.';
  }
  if (/network|offline|fetch/i.test(error?.message || '')) return 'Check your connection and try again.';
  return 'We couldn’t connect this sign-in. Please try again. Your existing sign-in still works.';
};

export const connectIdentity = async ({ auth, connect, provider }) => {
  const { data, error } = await auth.getUser();
  if (error || !data?.user) throw new Error('Please sign in again before connecting another sign-in method.');
  const originalId = data.user.id;
  const result = await connect();
  if (result?.cancelled) return result;
  const { data: refreshed, error: refreshError } = await auth.getUser();
  if (refreshError) throw refreshError;
  if (refreshed?.user?.id !== originalId) throw new Error('The account changed during sign-in. Please return to your original account.');
  const identities = refreshed.user.identities || [];
  if (!identities.some((identity) => identity.provider === provider)) {
    throw new Error('The sign-in was not connected. Please try again.');
  }
  return { cancelled: false, identities };
};
