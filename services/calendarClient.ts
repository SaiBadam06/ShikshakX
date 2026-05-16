import { toast } from '../components/Toast';

export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const TOKEN_STORAGE_KEY = 'gcal_token';
const globalWindow = window as any;

const hasConfiguredValue = (value?: string) => Boolean(value && !/^your_|^replace_|placeholder/i.test(value));
export const isGoogleCalendarConfigured = hasConfiguredValue(GOOGLE_API_KEY) && hasConfiguredValue(GOOGLE_CLIENT_ID);

if (!isGoogleCalendarConfigured) {
  console.error('Missing required Google API configuration. Please check your .env file.');
  console.log('VITE_GOOGLE_API_KEY:', GOOGLE_API_KEY ? '*** (set)' : 'MISSING');
  console.log('VITE_GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? '*** (set)' : 'MISSING');
}

if (import.meta.env.PROD && isGoogleCalendarConfigured) {
  console.warn('Warning: Using default Google API credentials in production is not recommended.');
}

let gapi: any = null;
let tokenClient: any = null;
let initPromise: Promise<void> | null = null;
let pendingAuthResolver: ((authorized: boolean) => void) | null = null;
let clientsReady = false;

const isScriptAlreadyAvailable = (src: string) => {
  if (src.includes('apis.google.com/js/api.js')) {
    return Boolean(globalWindow.gapi);
  }

  if (src.includes('accounts.google.com/gsi/client')) {
    return Boolean(globalWindow.google?.accounts?.oauth2);
  }

  return false;
};

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    const handleLoad = () => resolve();
    const handleError = () => reject(new Error(`Failed to load ${src}`));

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true' || isScriptAlreadyAvailable(src)) {
        existingScript.dataset.loaded = 'true';
        resolve();
        return;
      }

      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = handleError;
    document.body.appendChild(script);
  });

const getStoredToken = () => {
  const rawToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!rawToken) {
    return null;
  }

  try {
    return JSON.parse(rawToken);
  } catch (error) {
    console.error('Unable to parse stored Google Calendar token:', error);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
};

const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  gapi?.client?.setToken(null);
};

const isTokenExpired = (token: any) => !token?.access_token || !token?.expires_at || Date.now() >= token.expires_at;

const setActiveToken = (token: any) => {
  if (!token?.access_token) {
    clearStoredToken();
    return false;
  }

  const tokenData = {
    ...token,
    expires_at: token.expires_at ?? Date.now() + ((token.expires_in || 3600) * 1000) - 60000,
  };

  gapi?.client?.setToken(tokenData);
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
  return true;
};

const handleTokenResponse = (tokenResponse: any) => {
  if (tokenResponse?.error) {
    console.error('Google Auth Flow error:', tokenResponse);
    let message = `Google Auth Error: ${tokenResponse.error_description || tokenResponse.error}`;
    let isInfo = false;

    switch (tokenResponse.error) {
      case 'invalid_client':
        message = 'Google Auth Error: Invalid Client ID. Please check your Google Cloud OAuth credentials in `.env`.';
        break;
      case 'redirect_uri_mismatch':
      case 'origin_mismatch':
        message = 'Google Auth Error: This app URL is not listed under Authorized JavaScript origins in Google Cloud.';
        break;
      case 'access_denied':
      case 'popup_closed_by_user':
        message = 'Google sign-in was cancelled or access was denied.';
        isInfo = true;
        break;
    }

    clearStoredToken();
    if (isInfo) {
      toast.info(message);
    } else {
      toast.error(message);
    }
    pendingAuthResolver?.(false);
    pendingAuthResolver = null;
    return;
  }

  const authorized = setActiveToken(tokenResponse);
  pendingAuthResolver?.(authorized);
  pendingAuthResolver = null;
};

const initializeGoogleClients = async () => {
  if (!isGoogleCalendarConfigured) {
    throw new Error('Google Calendar credentials are missing.');
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    await Promise.all([
      loadScript('https://apis.google.com/js/api.js'),
      loadScript('https://accounts.google.com/gsi/client'),
    ]);

    gapi = globalWindow.gapi;
    if (!gapi || !globalWindow.google?.accounts?.oauth2) {
      throw new Error('Google APIs failed to load.');
    }

    await new Promise<void>((resolve, reject) => {
      gapi.load('client', {
        callback: async () => {
          try {
            await gapi.client.init({
              apiKey: GOOGLE_API_KEY,
              discoveryDocs: DISCOVERY_DOCS,
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        onerror: () => reject(new Error('Failed to load the Google API client.')),
      });
    });

    tokenClient = globalWindow.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: handleTokenResponse,
      error_callback: (error: any) => {
        console.error('Google Auth Initialization Error:', error);
        toast.error('Google Authentication failed to initialize. See console for details.');
        pendingAuthResolver?.(false);
        pendingAuthResolver = null;
      },
    });

    const storedToken = getStoredToken();
    if (storedToken && !isTokenExpired(storedToken)) {
      setActiveToken(storedToken);
    } else if (storedToken) {
      clearStoredToken();
    }

    clientsReady = true;
  })().catch((error) => {
    clientsReady = false;
    initPromise = null;
    throw error;
  });

  return initPromise;
};

const checkToken = (callback: (authorized: boolean) => void) => {
  const token = gapi?.client?.getToken?.() || getStoredToken();
  if (token && !isTokenExpired(token)) {
    callback(setActiveToken(token));
    return;
  }

  clearStoredToken();
  callback(false);
};

export const ensureGoogleCalendarReady = async () => {
  try {
    await initializeGoogleClients();
    return true;
  } catch (error) {
    console.error('Error initializing Google Calendar:', error);
    toast.error('Could not initialize Google Calendar. Check the Google Cloud credentials in your `.env` file.');
    return false;
  }
};

export const hasGoogleCalendarLoaded = () => clientsReady && Boolean(tokenClient && gapi?.client);

export const initGoogleCalendar = async (callback: (authorized: boolean) => void) => {
  if (!isGoogleCalendarConfigured) {
    callback(false);
    return false;
  }

  try {
    await initializeGoogleClients();
    checkToken(callback);
    return true;
  } catch (error) {
    console.error('Google Calendar init failed:', error);
    callback(false);
    return false;
  }
};

export const handleAuthClick = async () => {
  if (!isGoogleCalendarConfigured) {
    toast.error('Google Calendar is not configured. Please use the Google Cloud credentials in your `.env` file.');
    return false;
  }

  if (!hasGoogleCalendarLoaded()) {
    toast.info('Google Calendar is still preparing. Please wait a moment and click again.');
    return false;
  }

  const token = gapi?.client?.getToken?.() || getStoredToken();
  if (token && !isTokenExpired(token)) {
    return setActiveToken(token);
  }

  clearStoredToken();
  return new Promise<boolean>((resolve) => {
    pendingAuthResolver = resolve;
    tokenClient.requestAccessToken({ prompt: token?.access_token ? '' : 'consent' });
  });
};

export const handleSignoutClick = (callback: () => void) => {
  const token = gapi?.client?.getToken?.() || getStoredToken();
  if (token?.access_token && globalWindow.google?.accounts?.oauth2) {
    globalWindow.google.accounts.oauth2.revoke(token.access_token, () => {
      clearStoredToken();
      callback();
    });
    return;
  }

  clearStoredToken();
  callback();
};

const ensureToken = async () => {
  const token = gapi?.client?.getToken?.() || getStoredToken();
  if (token && !isTokenExpired(token)) {
    return setActiveToken(token);
  }

  clearStoredToken();
  return handleAuthClick();
};

export const createCalendarEvent = async (task: { title: string; description: string; dueDate: Date }) => {
  try {
    const isReady = await ensureGoogleCalendarReady();
    if (!isReady) {
      throw new Error('Google Calendar could not be initialized.');
    }

    const isAuthenticated = await ensureToken();
    if (!isAuthenticated) {
      throw new Error('Please connect to Google Calendar first.');
    }

    const event = {
      summary: task.title,
      description: task.description,
      start: {
        dateTime: task.dueDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(task.dueDate.getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const response = await gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return response.result;
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    if (error?.message?.includes('expired') || error?.status === 401) {
      throw new Error('Your Google Calendar session has expired. Please sign in again.');
    }

    throw new Error(`Failed to create Google Calendar event: ${error.message || 'Please try again later.'}`);
  }
};
