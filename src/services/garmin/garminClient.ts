import { getGarminApiBaseUrl, getValidGarminToken } from './garminAuth';
import { universalGarminFetch } from './garminFetchWrapper';

export interface GarminRequestOptions extends RequestInit {
  responseType?: 'json' | 'arraybuffer' | 'blob' | 'text';
  skipAuth?: boolean;
}

export class GarminApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'GarminApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Universal Garmin API client handling cross-platform URL resolution,
 * automatic JWT bearer authentication, token refresh on 401, and error normalization.
 */
export async function garminFetch<T = any>(
  path: string,
  options: GarminRequestOptions = {}
): Promise<T> {
  const { responseType = 'json', skipAuth = false, headers: customHeaders, ...fetchOptions } = options;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getGarminApiBaseUrl();
  const fullUrl = `${baseUrl}${normalizedPath}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(customHeaders as Record<string, string> || {})
  };

  if (!skipAuth) {
    const token = await getValidGarminToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await universalGarminFetch(fullUrl, {
      ...fetchOptions,
      headers
    });
  } catch (err: any) {
    throw new GarminApiError(
      `Network error communicating with Garmin Connect: ${err?.message || 'Check your internet connection'}.`
    );
  }

  // Handle token expiration/invalidation (401) with a single automatic retry
  if (response.status === 401 && !skipAuth) {
    // Evict cached token and request a fresh one
    localStorage.removeItem('veloanalytics_garmin_cached_token');
    try {
      const freshToken = await getValidGarminToken();
      headers['Authorization'] = `Bearer ${freshToken}`;
      response = await universalGarminFetch(fullUrl, {
        ...fetchOptions,
        headers
      });
    } catch {
      // If token refresh also fails, proceed to standard error handling
    }
  }

  if (!response.ok) {
    const rawErrorText = await response.text().catch(() => '');
    let errorDetail = rawErrorText;
    try {
      const errorJson = JSON.parse(rawErrorText);
      errorDetail = errorJson.message || errorJson.errorMessage || JSON.stringify(errorJson);
    } catch {
      // Keep raw string if non-JSON
    }

    if (response.status === 401 || response.status === 403) {
      throw new GarminApiError(
        'Garmin Connect authentication rejected or token expired. Please verify your Personal API Key in Settings.',
        response.status,
        errorDetail
      );
    }

    if (response.status === 429) {
      throw new GarminApiError(
        'Garmin Connect rate limit reached. Please wait a few moments before trying again.',
        response.status,
        errorDetail
      );
    }

    if (response.status === 400) {
      throw new GarminApiError(
        `Invalid request parameter to Garmin (${response.status}): ${errorDetail || 'Check requested date range.'}`,
        response.status,
        errorDetail
      );
    }

    if (response.status >= 500) {
      throw new GarminApiError(
        `Garmin Connect servers encountered a temporary issue (${response.status}). Please try again shortly.`,
        response.status,
        errorDetail
      );
    }

    throw new GarminApiError(
      `Garmin API request failed (${response.status}): ${errorDetail || response.statusText}`,
      response.status,
      errorDetail
    );
  }

  // Format return based on requested responseType
  if (responseType === 'arraybuffer') {
    return (await response.arrayBuffer()) as unknown as T;
  }
  if (responseType === 'blob') {
    return (await response.blob()) as unknown as T;
  }
  if (responseType === 'text') {
    return (await response.text()) as unknown as T;
  }

  // Default: json (read as text first to guard against Safari DOMException when response is not strict JSON)
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/**
 * Convenience method for GET JSON requests
 */
export async function garminGet<T = any>(
  path: string,
  options?: Omit<GarminRequestOptions, 'method'>
): Promise<T> {
  return garminFetch<T>(path, { ...options, method: 'GET' });
}

/**
 * Convenience method for downloading raw binary files (e.g. .FIT activity files)
 */
export async function garminDownloadBinary(
  path: string,
  options?: Omit<GarminRequestOptions, 'method' | 'responseType'>
): Promise<ArrayBuffer> {
  return garminFetch<ArrayBuffer>(path, {
    ...options,
    method: 'GET',
    responseType: 'arraybuffer',
    headers: {
      'Accept': 'application/octet-stream, application/zip, */*',
      ...(options?.headers as Record<string, string> || {})
    }
  });
}
