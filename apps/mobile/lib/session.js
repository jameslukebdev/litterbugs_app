import { createContext, useContext, useMemo } from 'react';

const SessionContext = createContext({
  session: null,
  user: null,
  isGuest: false,
});

export function SessionProvider({ session, children }) {
  const value = useMemo(() => {
    const user = session?.user ?? null;

    return {
      session,
      user,
      isGuest: Boolean(user?.is_anonymous),
    };
  }, [session]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
