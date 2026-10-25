import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export const GARMIN_API_BASE_URL = 'https://personal.connectapi.garmin.com';

/**
 * Detects whether the current JavaScript runtime is operating inside a Tauri native desktop window.
 */
export const isTauriEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
};

/**
 * Universal fetch client for Garmin API operations.
 * 
 * - In Tauri Desktop (Dev & Production):
 *   Uses Tauri's native Rust HTTP plugin (`tauri-plugin-http`). Because Rust handles the network
 *   socket directly via `reqwest`, Apple's WKWebView never generates an `OPTIONS` preflight,
 *   completely eliminating macOS CORS 403 errors.
 * 
 * - In Web Browser / Dev Fallback:
 *   Routes through the local Vite proxy (`/api/garmin`), where the Node/Vite server proxies
 *   the request server-to-server.
 */
export async function universalGarminFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const inTauri = isTauriEnvironment();

  // If running inside Tauri, prefer native Rust HTTP plugin
  if (inTauri) {
    try {
      // Ensure the URL is fully qualified with the Garmin API base for the native Rust client
      const fullUrl = input.startsWith('http') 
        ? input 
        : `${GARMIN_API_BASE_URL}${input.startsWith('/') ? input : `/${input}`}`;

      return await tauriFetch(fullUrl, init as any);
    } catch (pluginError: any) {
      console.warn(
        '[VeloAnalytics Garmin] Native Rust HTTP plugin threw or is not yet registered in src-tauri:',
        pluginError?.message || pluginError
      );

      // If running with local Vite dev server active (localhost), fallback to the dev proxy
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        const proxyUrl = input.startsWith('http')
          ? input.replace(GARMIN_API_BASE_URL, '/api/garmin')
          : (input.startsWith('/api/garmin') ? input : `/api/garmin${input.startsWith('/') ? input : `/${input}`}`);
        
        return window.fetch(proxyUrl, init);
      }
      
      throw pluginError;
    }
  }

  // Web Browser environment: route via the Vite proxy to avoid browser CORS
  const proxyUrl = input.startsWith('http')
    ? input.replace(GARMIN_API_BASE_URL, '/api/garmin')
    : (input.startsWith('/api/garmin') ? input : `/api/garmin${input.startsWith('/') ? input : `/${input}`}`);

  return window.fetch(proxyUrl, init);
}
