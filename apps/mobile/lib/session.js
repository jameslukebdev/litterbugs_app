import { createContext, useContext, useMemo } from 'react';

const SessionContext = createContext({
  session: null,
  user: null,
  isPermanentUser: false,
});

export function SessionProvider({ session, children }) {
  const value = useMemo(() => {
    const user = session?.user ?? null;

    return {
      session,
      user,
      isPermanentUser: Boolean(user?.id && user.is_anonymous !== true),
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
