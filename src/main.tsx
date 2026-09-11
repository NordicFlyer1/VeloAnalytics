import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept Google Maps RefererNotAllowedMapError to prevent unhandled host container crash reports
const rawConsoleError = console.error;
console.error = function (...args: any[]) {
  const combined = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
  if (
    combined.includes('Google Maps JavaScript API error') ||
    combined.includes('RefererNotAllowedMapError') ||
    combined.includes('gm_authFailure')
  ) {
    console.warn('[VeloAnalytics Maps Notice]: Google Maps API key has HTTP Referrer restrictions on this domain. Reverting to OpenStreetMap.', ...args);
    window.dispatchEvent(new CustomEvent('velo:google-maps-auth-error', {
      detail: { message: combined, url: window.location.origin }
    }));
    return;
  }
  rawConsoleError.apply(console, args);
};

// Global Google Maps auth failure callback
(window as any).gm_authFailure = function () {
  console.warn('[VeloAnalytics Maps Notice]: Google Maps authentication failed (gm_authFailure). Reverted to OpenStreetMap.');
  window.dispatchEvent(new CustomEvent('velo:google-maps-auth-error', {
    detail: { message: 'gm_authFailure', url: window.location.origin }
  }));
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
