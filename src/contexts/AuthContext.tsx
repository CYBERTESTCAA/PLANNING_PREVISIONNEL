import { createContext, useContext, useCallback, useState, useEffect, ReactNode } from 'react';
import { PublicClientApplication, InteractionRequiredAuthError, AccountInfo } from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { msalConfig, msalEnabled, loginRequest } from '@/lib/msalConfig';
import { setAuthTokenProvider } from '@/lib/api';

interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userName: string;
  userEmail: string;
  login: () => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isAdmin: false,
  userName: '',
  userEmail: '',
  login: async () => {},
  logout: () => {},
  getAccessToken: async () => null,
});

export const useAuth = () => useContext(AuthContext);

let msalInstance: PublicClientApplication | null = null;
if (msalEnabled) {
  msalInstance = new PublicClientApplication(msalConfig);
}

function AuthInner({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const account: AccountInfo | null = accounts[0] ?? null;

  useEffect(() => {
    if (account) {
      setUserName(account.name || '');
      setUserEmail(account.username || '');
      // Check admin status via backend /auth/me
      getAccessTokenSilent().then(token => {
        if (!token) return;
        const apiUrl = import.meta.env.VITE_API_URL || '';
        fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(data => setIsAdmin(data.isAdmin === true))
          .catch(() => setIsAdmin(false));
      });
    } else {
      setUserName('');
      setUserEmail('');
      setIsAdmin(false);
    }
  }, [account]);

  const getAccessTokenSilent = useCallback(async (): Promise<string | null> => {
    if (!account) return null;
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return response.idToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        try {
          const response = await instance.acquireTokenPopup(loginRequest);
          return response.idToken;
        } catch {
          return null;
        }
      }
      return null;
    }
  }, [instance, account]);

  // Wire token provider into API client
  useEffect(() => {
    setAuthTokenProvider(account ? getAccessTokenSilent : null);
    return () => setAuthTokenProvider(null);
  }, [account, getAccessTokenSilent]);

  const login = useCallback(async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (err) {
      console.error('[Auth] Login failed:', err);
    }
  }, [instance]);

  const logout = useCallback(() => {
    instance.logoutPopup({ postLogoutRedirectUri: window.location.origin });
  }, [instance]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isAdmin,
      userName,
      userEmail,
      login,
      logout,
      getAccessToken: getAccessTokenSilent,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function NoAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{
      isAuthenticated: false,
      isAdmin: true, // No auth configured → allow everything (dev mode)
      userName: '',
      userEmail: '',
      login: async () => { console.warn('[Auth] MSAL not configured'); },
      logout: () => {},
      getAccessToken: async () => null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!msalEnabled || !msalInstance) {
    return <NoAuthProvider>{children}</NoAuthProvider>;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AuthInner>{children}</AuthInner>
    </MsalProvider>
  );
}
