import { GarminCachedToken, GarminSettings, GarminTokenResponse, GarminUserProfile } from './types';
import { GARMIN_API_BASE_URL, universalGarminFetch } from './garminFetchWrapper';

export { GARMIN_API_BASE_URL };

export const DEFAULT_GARMIN_SETTINGS: GarminSettings = {
  apiKey: '',
  syncActivities: true,
  syncSleep: true,
  syncHrv: true,
  lastSyncTimestamp: undefined,
  autoSyncOnLaunch: false
};

const STORAGE_KEY_API_KEY = 'veloanalytics_garmin_api_key';
const STORAGE_KEY_SETTINGS = 'veloanalytics_garmin_settings';
const STORAGE_KEY_CACHED_TOKEN = 'veloanalytics_garmin_cached_token';

/**
 * Returns the effective base URL for Garmin API calls.
 * In a web browser environment, requests route through the Vite proxy `/api/garmin` to prevent CORS issues.
 * In Tauri desktop (or environments with native network access), it directly targets `https://personal.connectapi.garmin.com`.
 */
export const getGarminApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return GARMIN_API_BASE_URL;
  }
  return '/api/garmin';
};

export const getGarminApiKey = (): string => {
  return localStorage.getItem(STORAGE_KEY_API_KEY) || '';
};

export const setGarminApiKey = (key: string): void => {
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
    localStorage.removeItem(STORAGE_KEY_CACHED_TOKEN);
  }
};

export const getGarminSettings = (): GarminSettings => {
  const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (!saved) return { ...DEFAULT_GARMIN_SETTINGS, apiKey: getGarminApiKey() };
  try {
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_GARMIN_SETTINGS,
      ...parsed,
      apiKey: getGarminApiKey()
    };
  } catch {
    return { ...DEFAULT_GARMIN_SETTINGS, apiKey: getGarminApiKey() };
  }
};

export const saveGarminSettings = (updates: Partial<GarminSettings>): GarminSettings => {
  if (updates.apiKey !== undefined) {
    setGarminApiKey(updates.apiKey);
  }
  const current = getGarminSettings();
  const merged: GarminSettings = {
    ...current,
    ...updates,
    apiKey: updates.apiKey !== undefined ? updates.apiKey.trim() : current.apiKey
  };
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
  return merged;
};

/**
 * Retrieves a valid short-lived JWT token, exchanging the Personal API Key if no unexpired token exists.
 */
export const getValidGarminToken = async (overrideApiKey?: string): Promise<string> => {
  const apiKey = (overrideApiKey || getGarminApiKey()).trim();
  if (!apiKey) {
    throw new Error('Garmin Personal API Key is not configured. Please enter your key in Settings.');
  }

  // Check cached token
  const cachedJson = localStorage.getItem(STORAGE_KEY_CACHED_TOKEN);
  if (cachedJson && !overrideApiKey) {
    try {
      const cached: GarminCachedToken = JSON.parse(cachedJson);
      // Require at least 60 seconds of validity remaining
      if (cached.expiresAt > Date.now() + 60_000 && cached.token) {
        return cached.token;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY_CACHED_TOKEN);
    }
  }

  const baseUrl = getGarminApiBaseUrl();
  const tokenUrl = `${baseUrl}/personalapitoken-service/personal-api/personal-api-key/token`;

  let response: Response;
  try {
    response = await universalGarminFetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${apiKey}`,
        'Accept': 'text/plain, application/json, */*'
      }
    });
  } catch (err: any) {
    throw new Error(`Unable to reach Garmin Connect server: ${err?.message || 'Network error'}. Verify network connectivity.`);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid or expired Garmin Personal API Key. Please verify the key generated in Garmin Connect Web.');
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Garmin token request failed (${response.status}): ${errorText || response.statusText}`);
  }

  // The Garmin Personal API returns the JWT token directly as a raw plain-text string,
  // not as a JSON object. Calling response.json() on a raw JWT string causes WebKit/Safari
  // to throw "SyntaxError: The string did not match the expected pattern."
  const rawBody = (await response.text()).trim();
  let accessToken = '';

  if (rawBody.startsWith('{')) {
    try {
      const data = JSON.parse(rawBody);
      accessToken = data.accessToken || data.access_token || data.token || '';
    } catch {
      accessToken = rawBody;
    }
  } else {
    // Strip wrapping quotes if the server returned a quoted string e.g. "eyJ..."
    accessToken = rawBody.replace(/^["']|["']$/g, '').trim();
  }

  if (!accessToken) {
    throw new Error('Garmin server did not return a valid access token in response.');
  }

  // Compute token expiration: extract from JWT exp claim or default to 24 hours (Garmin default)
  let expiresInMs = 24 * 60 * 60 * 1000;
  try {
    const parts = accessToken.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = atob(base64);
      const parsed = JSON.parse(jsonPayload);
      if (parsed.exp && typeof parsed.exp === 'number') {
        const remaining = (parsed.exp * 1000) - Date.now();
        if (remaining > 60_000) {
          expiresInMs = remaining;
        }
      }
    }
  } catch {
    // If decoding fails, fall back to standard 24h expiration
  }

  const cached: GarminCachedToken = {
    token: accessToken,
    expiresAt: Date.now() + expiresInMs
  };
  localStorage.setItem(STORAGE_KEY_CACHED_TOKEN, JSON.stringify(cached));

  return accessToken;
};

/**
 * Validates connection to Garmin Connect by verifying token generation and requesting recent activity metadata.
 */
export const testGarminConnection = async (
  apiKeyToTest?: string
): Promise<{ success: boolean; message: string; profile?: GarminUserProfile }> => {
  try {
    const token = await getValidGarminToken(apiKeyToTest);
    const baseUrl = getGarminApiBaseUrl();

    // Query 1 activity or user profile to confirm token works against data services
    const testUrl = `${baseUrl}/activitylist-service/activities/search/activities?limit=1`;
    const res = await universalGarminFetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { success: false, message: 'Garmin accepted the key for token exchange, but access to data services was denied.' };
      }
      return { success: false, message: `Connected to Garmin auth, but activity test query returned HTTP ${res.status}.` };
    }

    return {
      success: true,
      message: 'Successfully authenticated with Garmin Connect Personal API!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to authenticate with Garmin Connect.'
    };
  }
};
