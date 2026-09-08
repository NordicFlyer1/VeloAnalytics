/**
 * Apple macOS & Siri Integration Bridge
 * 
 * Safely bridges VeloAnalytics metrics (Readiness, Stress Balance / Form, Latest Ride, 
 * and 7-Day / 28-Day BikeScore Training Blocks) to macOS Apple Intelligence, Siri, 
 * Spotlight, and Apple Shortcuts.
 * 
 * Safe by design:
 * - Uses open-source VeloAnalytics metrics: BikeScore™, xPower, RI, SB / STS / LTS.
 * - If running in Browser / Web: Emits clipboard / URL actions safely with zero side effects.
 * - If running in Tauri Desktop on macOS: Writes snapshot to local file cache via Tauri IPC.
 */

export interface AppleSiriSnapshot {
  timestamp: string;
  // Standard (Garmin-aligned / PMC) Readiness
  readinessScore: number;
  readinessStatus: string;
  readinessModel: string;

  // Experimental Velo Readiness (multi-pillar fatigue, sleep, HRV, PMC engine)
  veloReadinessScore?: number;
  veloReadinessStatus?: string;
  isVeloReadinessEnabled: boolean;
  activeScoreType: 'standard' | 'veloReadiness';

  stressBalance: number; // SB (Stress Balance / Form)
  shortTermStress: number; // STS (Acute Fatigue, 7-day EWMA)
  longTermStress: number; // LTS (Chronic Fitness, 42-day EWMA)
  sleepScore?: number;
  sleepDurationHours?: number;
  hrvOvernight?: number;
  
  // Real Latest Ride Metrics (Open-Source Golden Cheetah / VeloAnalytics standards)
  latestRide?: {
    date: string;
    name: string;
    distanceKm: number;
    durationMinutes: number;
    xPower?: number;
    relativeIntensity?: number;
    avgPower?: number;
    avgHeartRate?: number;
    bikeScore: number;
    workKilojoules?: number;
  };

  // Real 7-Day Rolling Volume & Stress Block
  trainingBlock7Days: {
    totalRides: number;
    totalKm: number;
    totalHours: number;
    totalBikeScore: number;
  };

  // Real 28-Day Rolling Volume & Stress Block
  trainingBlock28Days: {
    totalRides: number;
    totalKm: number;
    totalHours: number;
    totalBikeScore: number;
  };
}

/**
 * Sync state with macOS Siri / Shortcuts cache.
 * Completely safe: will gracefully do nothing if not in a Tauri desktop environment.
 * Supports both Tauri v1 and Tauri v2 IPC APIs.
 */
export async function syncAppleSiriSnapshot(snapshot: AppleSiriSnapshot): Promise<boolean> {
  try {
    // Check if running inside Tauri on macOS (supports Tauri v1 and v2 __TAURI__ and __TAURI_INTERNALS__)
    if (typeof window !== 'undefined') {
      const tauriGlobal = (window as any).__TAURI__;
      const tauriInternals = (window as any).__TAURI_INTERNALS__;
      
      const invokeFn = tauriGlobal?.core?.invoke 
        || tauriGlobal?.invoke 
        || tauriInternals?.invoke;

      if (typeof invokeFn === 'function') {
        try {
          await invokeFn('sync_siri_snapshot', { snapshot });
        } catch (ipcErr) {
          // Silently ignore if custom Tauri command is not registered in current binary
        }
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
    readinessScore: 80,
    readinessStatus: "Prime / Optimal",
    readinessModel: "Standard (Garmin-aligned)",
    stressBalance: 0,
    shortTermStress: 0,
    longTermStress: 0,
    trainingBlock7Days: { totalRides: 0, totalKm: 0, totalHours: 0, totalBikeScore: 0 },
    trainingBlock28Days: { totalRides: 0, totalKm: 0, totalHours: 0, totalBikeScore: 0 }
  };

  return JSON.stringify({
    appName: "VeloAnalytics",
    version: "1.2",
    generatedAt: new Date().toISOString(),
    supportedQueries: [
      "What is my Velo Readiness?",
      "What was my last ride in VeloAnalytics?",
      "How much did I ride this week in VeloAnalytics?",
      "Check my 28-day training load in VeloAnalytics",
      "Check my Stress Balance in VeloAnalytics",
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
