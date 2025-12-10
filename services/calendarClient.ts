// Google API configuration loaded from environment variables
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Validate required environment variables
if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
  console.error('Missing required Google API configuration. Please check your .env file.');
  console.log('VITE_GOOGLE_API_KEY:', GOOGLE_API_KEY ? '*** (set)' : 'MISSING');
  console.log('VITE_GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? '*** (set)' : 'MISSING');
}

// Check for placeholder values in production
if (import.meta.env.PROD && (GOOGLE_API_KEY?.startsWith('AIza') || GOOGLE_CLIENT_ID?.startsWith('6'))) {
  console.warn('Warning: Using default Google API credentials in production is not recommended.');
}

const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

import { toast } from '../components/Toast';

let gapi: any = null;
let gis: any = null;
let tokenClient: any = null;

// Flags to prevent race conditions during script loading
let gapiReady = false;
let gisReady = false;

export const initGoogleCalendar = (callback: (authorized: boolean) => void) => {
    // Prevent re-initialization if scripts are already loaded or loading.
    if (gapi || gis) {
        checkToken(callback);
        return;
    }
    
    // Check for placeholder keys upfront. If they exist, do not attempt to load scripts.
    if (GOOGLE_API_KEY.startsWith("YOUR_") || GOOGLE_CLIENT_ID.startsWith("YOUR_")) {
        console.warn("Google Calendar API keys are not configured in 'services/calendarClient.ts'. The feature will be disabled.");
        return;
    }

    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.async = true;
    scriptGapi.defer = true;
    scriptGapi.onload = () => {
        gapi = (window as any).gapi;
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: GOOGLE_API_KEY,
                    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
                });
                console.log('gapi client initialized');
                gapiReady = true;
                if (gisReady) checkToken(callback);
            } catch (error) {
                console.error("Error initializing Google API client:", error);
                toast.error("Could not connect to Google Services. Check API Key.");
            }
        });
    };
    document.body.appendChild(scriptGapi);

    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = () => {
        gis = (window as any).google.accounts.id;
        try {
            tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: (tokenResponse: any) => {
                    if (tokenResponse.error) {
                        console.error('Google Auth Flow error:', tokenResponse);
                        let message = `Google Auth Error: ${tokenResponse.error_description || tokenResponse.error}`;
                        let isInfo = false;

                        switch (tokenResponse.error) {
                            case 'invalid_client':
                                message = 'Google Auth Error: Invalid Client ID. Please check your configuration in `services/calendarClient.ts` and the Google Cloud Console.';
                                break;
                            case 'redirect_uri_mismatch':
                            case 'origin_mismatch':
                                message = 'Google Auth Error: Mismatched URL. Ensure your app\'s URL is listed under "Authorized JavaScript origins" in your Google Cloud OAuth settings.';
                                break;
                            case 'access_denied':
                            case 'popup_closed_by_user':
                                message = 'Google Sign-In was cancelled or access was denied.';
                                isInfo = true;
                                break;
                        }
                        
                        if (isInfo) {
                            toast.info(message);
                        } else {
                            toast.error(message);
                        }
                        
                        callback(false);
                        return;
                    }

                    if (tokenResponse && tokenResponse.access_token) {
                        gapi.client.setToken(tokenResponse);
                        localStorage.setItem('gcal_token', JSON.stringify(tokenResponse));
                        callback(true);
                    } else {
                        callback(false);
                    }
                },
                error_callback: (error: any) => {
                    console.error("Google Auth Initialization Error:", error);
                    toast.error("Google Authentication failed to initialize. See console for details.");
                    callback(false);
                }
            });
            console.log('gis client initialized');
            gisReady = true;
            if (gapiReady) checkToken(callback);
        } catch (error) {
            console.error("Error initializing Google Sign-In client:", error);
            toast.error("Could not set up Google Sign-In. Check Client ID.");
        }
    };
    document.body.appendChild(scriptGis);
};

const checkToken = (callback: (authorized: boolean) => void) => {
    if (!gapi || !gis) return; // Wait for both to be ready
    const storedToken = localStorage.getItem('gcal_token');
    if (storedToken) {
        const token = JSON.parse(storedToken);
        // A robust solution would check expiry time. This is a simplified check.
        if (token.access_token) {
            gapi.client.setToken(token);
            callback(true);
            return;
        }
    }
    callback(false);
}

export const handleAuthClick = () => {
    if (GOOGLE_API_KEY.startsWith("YOUR_") || GOOGLE_CLIENT_ID.startsWith("YOUR_")) {
        toast.error('Google Calendar is not configured. Please add your keys to services/calendarClient.ts');
        return;
    }

    if (tokenClient) {
        // This will trigger the GIS pop-up for the user to sign in.
        tokenClient.requestAccessToken({ prompt: '' });
    } else {
        console.error('Google Auth client not initialized. Have you configured your API keys?');
        toast.error('Google Calendar is not configured or failed to initialize.');
    }
};

export const handleSignoutClick = (callback: () => void) => {
    const token = gapi?.client.getToken();
    if (token !== null) {
        (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
            localStorage.removeItem('gcal_token');
            callback();
        });
    }
};

// Check if token is expired
const isTokenExpired = (token: any): boolean => {
    if (!token || !token.expires_at) return true;
    return Date.now() > token.expires_at;
};

// Refresh the access token using the refresh token
const refreshToken = async (): Promise<boolean> => {
    try {
        const token = gapi.client.getToken();
        if (!token?.refresh_token) return false;

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                refresh_token: token.refresh_token,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }

        const newToken = await response.json();
        const tokenData = {
            ...token,
            access_token: newToken.access_token,
            expires_in: newToken.expires_in,
            expires_at: Date.now() + (newToken.expires_in * 1000) - 60000, // 1 min buffer
            scope: newToken.scope || token.scope
        };

        gapi.client.setToken(tokenData);
        localStorage.setItem('gcal_token', JSON.stringify(tokenData));
        return true;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
};

// Helper function to ensure we have a valid token
const ensureToken = async (): Promise<boolean> => {
    try {
        // Try to get existing token
        let token = gapi?.client.getToken();
        
        // Check if we have a valid token that's not expired
        if (token && !isTokenExpired(token)) {
            return true;
        }
        
        // Try to refresh the token if it's expired but has a refresh token
        if (token?.refresh_token) {
            const refreshed = await refreshToken();
            if (refreshed) return true;
        }
        
        // If we get here, we need to get a new token
        return new Promise((resolve) => {
            if (!tokenClient) {
                console.error('Google token client not initialized');
                resolve(false);
                return;
            }
            
            // Request a new token with offline access to get a refresh token
            tokenClient.requestAccessToken({ prompt: 'consent' });
            
            // Set up a one-time listener for the token callback
            const originalCallback = tokenClient.callback;
            tokenClient.callback = (response: any) => {
                // Restore the original callback
                tokenClient.callback = originalCallback;
                
                if (response && !response.error) {
                    // Add expiration time (with 1 minute buffer)
                    const tokenData = {
                        ...response,
                        expires_at: Date.now() + ((response.expires_in || 3600) * 1000) - 60000
                    };
                    
                    gapi.client.setToken(tokenData);
                    localStorage.setItem('gcal_token', JSON.stringify(tokenData));
                    resolve(true);
                } else {
                    console.error('Failed to get access token:', response?.error);
                    // Clear any invalid token
                    gapi?.client.setToken(null);
                    localStorage.removeItem('gcal_token');
                    resolve(false);
                }
            };
        });
    } catch (error) {
        console.error('Error ensuring token:', error);
        return false;
    }
};

// Retry wrapper for API calls
const withRetry = async <T>(
    fn: () => Promise<T>,
    maxRetries = 2,
    delayMs = 1000
): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            
            // If it's an auth error and we have retries left, try to refresh the token
            if (error.status === 401 && attempt < maxRetries - 1) {
                console.log('Auth error, attempting to refresh token...');
                await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
                
                // Clear the invalid token
                gapi?.client.setToken(null);
                localStorage.removeItem('gcal_token');
                
                // Get a new token
                const refreshed = await ensureToken();
                if (!refreshed) {
                    throw new Error('Your Google Calendar session has expired. Please sign in again.');
                }
                continue;
            }
            
            // For other errors or if we're out of retries
            throw error;
        }
    }
    
    throw lastError;
};

export const createCalendarEvent = async (task: { title: string; description: string; dueDate: Date }) => {
    try {
        // Ensure we have a valid token with retry logic
        return await withRetry(async () => {
            const isAuthenticated = await ensureToken();
            if (!isAuthenticated) {
                throw new Error('Please connect to Google Calendar first.');
            }

        const event = {
            'summary': task.title,
            'description': task.description,
            'start': {
                'dateTime': task.dueDate.toISOString(),
                'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            'end': {
                'dateTime': new Date(task.dueDate.getTime() + 60 * 60 * 1000).toISOString(),
                'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
        };

        // Make sure gapi client is properly initialized
        if (!gapi?.client?.calendar) {
            await gapi.client.init({
                apiKey: GOOGLE_API_KEY,
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
            });
        }

            const response = await gapi.client.calendar.events.insert({
                'calendarId': 'primary',
                'resource': event,
            });

            console.log('Event created successfully:', response.result);
            return response.result;
        });
    } catch (error: any) {
        console.error('Error creating calendar event:', {
            error: error.toString(),
            details: error.details || error.result?.error || error,
            stack: error.stack
        });
        
        // Re-throw with a user-friendly message
        if (error.message.includes('expired') || error.status === 401) {
            throw new Error('Your Google Calendar session has expired. Please sign in again.');
        }
        
        throw new Error(`Failed to create Google Calendar event: ${error.message || 'Please try again later.'}`);
    }
};