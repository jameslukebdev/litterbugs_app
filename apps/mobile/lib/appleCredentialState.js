// Re-check the session after Apple's asynchronous response so a revoked older
// login cannot sign out an account the person has since switched to.
export async function checkAppleCredentialState({ apple, auth, isActive = () => true }) {
  try {
    const { data } = await auth.getSession();
    const session = data?.session;
    const subject = session?.user?.identities?.find((item) => item.provider === 'apple')?.identity_data?.sub;
    if (!isActive() || !subject) return;
    const state = await apple.getCredentialStateAsync(subject);
    if (![apple.AppleAuthenticationCredentialState.REVOKED, apple.AppleAuthenticationCredentialState.NOT_FOUND].includes(state)) return;
    const { data: latest } = await auth.getSession();
    if (isActive() && latest?.session?.user?.id === session.user.id
      && latest?.session?.access_token === session.access_token) {
      await auth.signOut({ scope: 'local' });
    }
  } catch {
    // Offline responses and unsupported simulator checks do not prove revocation.
  }
}
