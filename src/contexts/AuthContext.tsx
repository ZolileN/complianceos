'use client';

import React, { createContext, useContext } from 'react';
import { useSession, signOut as nextAuthSignOut, SessionProvider } from 'next-auth/react';

type SessionUser = {
  id?: string;
  tenantId?: string;
  role?: string;
  name?: string | null;
  email?: string | null;
}

interface AuthState {
  user: SessionUser | null;
  tenant: { id: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  tenant: null,
  loading: true,
  signOut: async () => {},
});

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  
  const user = (session?.user as SessionUser) || null;
  const tenant = user?.tenantId ? { id: user.tenantId } : null;

  const signOut = async () => {
    await nextAuthSignOut({ callbackUrl: '/login' });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      tenant, 
      loading: status === 'loading', 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export const useAuth = () => useContext(AuthContext);
