import { Configuration, LogLevel } from '@azure/msal-browser';

const TENANT_ID = import.meta.env.VITE_AZURE_AD_TENANT_ID || '';
const CLIENT_ID = import.meta.env.VITE_AZURE_AD_CLIENT_ID || '';

export const msalEnabled = !!TENANT_ID && !!CLIENT_ID && CLIENT_ID !== 'VOTRE_APP_REGISTRATION_CLIENT_ID';

export const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
    cacheMigrationEnabled: true,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (_level, message) => {
        console.debug('[MSAL]', message);
      },
    },
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};
