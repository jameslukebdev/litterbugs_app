// Dependencies are supplied by the iOS adapter so the credential exchange can
// be verified without opening a native account prompt.
export const createAppleSignIn = ({ apple, auth, createNonce, hashNonce, saveAuthorization }) => async () => {
  if (!await apple.isAvailableAsync()) {
    throw new Error('Apple sign-in isn’t available on this device. Please choose another sign-in method.');
  }
  const nonce = createNonce();
  let credential;
  try {
    credential = await apple.signInAsync({
      requestedScopes: [apple.AppleAuthenticationScope.FULL_NAME, apple.AppleAuthenticationScope.EMAIL],
      nonce: await hashNonce(nonce),
    });
  } catch (error) {
    if (error?.code === 'ERR_REQUEST_CANCELED') return { cancelled: true };
    throw error;
  }
  if (!credential.identityToken) {
    throw new Error('Apple sign-in didn’t finish. Please try again.');
  }
  const { data, error } = await auth.signInWithIdToken({
    provider: 'apple', token: credential.identityToken, nonce,
  });
  if (error) throw error;
  if (credential.authorizationCode && saveAuthorization) {
    // An unavailable account-management service must not turn a successful
    // Apple login into a failed login. Deletion retains a legacy-token fallback.
    await saveAuthorization({
      authorizationCode: credential.authorizationCode,
      identityToken: credential.identityToken,
    }).catch(() => null);
  }

  // Apple provides a name only on initial consent. Preserve an existing name,
  // and don't turn an optional profile update failure into a failed login.
  const fullName = [credential.fullName?.givenName, credential.fullName?.middleName,
    credential.fullName?.familyName].filter(Boolean).join(' ').trim();
  if (fullName && !data?.user?.user_metadata?.full_name) {
    await auth.updateUser({ data: { full_name: fullName } }).catch(() => null);
  }
  return { cancelled: false };
};
