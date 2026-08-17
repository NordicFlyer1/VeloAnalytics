/**
 * Apple macOS & Siri Integration Bridge
 * 
 * Safely bridges VeloAnalytics metrics (Readiness, Form, AI Coach) to macOS Apple Intelligence,
 * Siri, Spotlight, and Apple Shortcuts.
 * 
 * Safe by design:
 * - If running in Browser / Web: Emits clipboard / URL actions safely with zero side effects.
 * - If running in Tauri Desktop on macOS: Writes snapshot to local file cache via Tauri IPC.
 */

export interface AppleSiriSnapshot {
  timestamp: string;
  readinessScore: number;
  readinessStatus: string;
  readinessModel: string;
  tsb: number;
  sts: number;
  lts: number;
  sleepScore?: number;
  sleepDurationHours?: number;
  hrvOvernight?: number;
  lastRideDate?: string;
  lastRideName?: string;
  lastRideNormalizedPower?: number;
  lastRideTSS?: number;
}

/**
 * Sync state with macOS Siri / Shortcuts cache.
 * Completely safe: will gracefully do nothing if not in a Tauri desktop environment.
 */
export async function syncAppleSiriSnapshot(snapshot: AppleSiriSnapshot): Promise<boolean> {
  try {
    // Check if running inside Tauri on macOS
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      const { invoke } = (window as any).__TAURI__.core || (window as any).__TAURI__;
      if (typeof invoke === 'function') {
        await invoke('sync_siri_snapshot', { snapshot });
        return true;
      }
    }
    
    // Also save in localStorage for web shortcut reader
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('velo_siri_snapshot', JSON.stringify(snapshot));
    }
    
    return true;
  } catch (err) {
    // Fail silently so it never breaks app execution
    console.debug('[AppleBridge] Snapshot sync skipped or failed:', err);
    return false;
  }
}

/**
 * Generates an Apple Shortcut JSON definition ready for download or import.
 */
export function generateAppleShortcutPayload(snapshot: AppleSiriSnapshot | null): string {
  const current = snapshot || {
    timestamp: new Date().toISOString(),
    readinessScore: 85,
    readinessStatus: "Optimal",
    readinessModel: "Standard (Garmin-aligned)",
    tsb: 4,
    sts: 58,
    lts: 54
  };

  return JSON.stringify({
    appName: "VeloAnalytics",
    version: "1.0",
    generatedAt: new Date().toISOString(),
    supportedQueries: [
      "What is my Velo Readiness?",
      "Check my training status in VeloAnalytics",
      "Ask Velo Coach if I should ride today"
    ],
    state: current,
    urlActions: {
      openApp: "https://veloanalytics.app/",
      openCoach: "https://veloanalytics.app/?action=coach",
      openReadiness: "https://veloanalytics.app/?action=readiness",
      openPmc: "https://veloanalytics.app/?action=pmc"
    }
  }, null, 2);
}
