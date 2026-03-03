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
  /** true when MSAL is configured but can't run (HTTP without localhost) */
  msalUnavailable: boolean;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isAdmin: false,
  userName: '',
  userEmail: '',
  login: async () => {},
  logout: () => {},
  getAccessToken: async () => null,
  msalUnavailable: false,
});

export const useAuth = () => useContext(AuthContext);

let msalInstance: PublicClientApplication | null = null;
let msalReady: Promise<void> | null = null;
const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if (msalEnabled && isSecure) {
  try {
    msalInstance = new PublicClientApplication(msalConfig);
    // Initialize MSAL and handle redirect/popup responses before app renders
    msalReady = msalInstance.initialize().then(() => {
      return msalInstance!.handleRedirectPromise().then(() => {});
    });
  } catch (err) {
    console.warn('[Auth] MSAL init failed (non-secure context?):', err);
    msalInstance = null;
  }
} else if (msalEnabled && !isSecure) {
  console.warn('[Auth] MSAL désactivé : contexte non sécurisé (HTTP). L\'authentification nécessite HTTPS.');
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
        console.log('[Auth] Token acquired:', token ? `${token.substring(0, 20)}...` : 'NULL');
        if (!token) return;
        const apiUrl = import.meta.env.VITE_API_URL || '';
        fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(data => {
            console.log('[Auth] /auth/me response:', data);
            setIsAdmin(data.isAdmin === true);
          })
          .catch((err) => {
            console.error('[Auth] /auth/me failed:', err);
            setIsAdmin(false);
          });
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
        instance.acquireTokenRedirect(loginRequest);
        return null;
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
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      console.error('[Auth] Login failed:', err);
    }
  }, [instance]);

  const logout = useCallback(() => {
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
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
      msalUnavailable: false,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function NoAuthProvider({ children }: { children: ReactNode }) {
  // If MSAL is configured but unavailable (non-secure context), stay read-only
  // If MSAL is not configured at all, allow everything (dev mode)
  const devMode = !msalEnabled;
  return (
    <AuthContext.Provider value={{
      isAuthenticated: false,
      isAdmin: devMode,
      userName: devMode ? 'Mode développement' : '',
      userEmail: devMode ? 'localhost (pas d\'auth)' : '',
      login: async () => { console.warn('[Auth] MSAL not configured or non-secure context'); },
      logout: () => {},
      getAccessToken: async () => null,
      msalUnavailable: msalEnabled && !msalInstance,
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
