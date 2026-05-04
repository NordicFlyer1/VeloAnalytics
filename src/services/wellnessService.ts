import { SleepMetric, HRVMetric } from '../types';
import { exportToCSV } from '../lib/csvExport';

/**
 * Parses Garmin Sleep CSV export
 */
export function parseSleepCSV(csv: string): SleepMetric[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const metrics: SleepMetric[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Use a regex that handles potential commas inside quotes if any (unlikely here but safe)
    const parts = line.split(',');
    if (parts.length < 12) continue;

    const [
      date, 
      score, 
      restingHR, 
      readiness, 
      pulseOx, 
      respiration, 
      hrvStatus, 
      quality, 
      durationStr, 
      sleepNeedStr, 
      bedtime, 
      wakeTime
    ] = parts;

    metrics.push({
      date: date.trim(), // Assuming YYYY-MM-DD
      score: parseInt(score) || 0,
      restingHeartRate: parseInt(restingHR) || 0,
      readinessScore: parseInt(readiness) || 0,
      pulseOx: parseFloat(pulseOx) || 0,
      respiration: parseFloat(respiration) || 0,
      hrvStatus: parseInt(hrvStatus) || 0,
      quality: quality.trim(),
      duration: parseDurationToMinutes(durationStr),
      sleepNeed: parseDurationToMinutes(sleepNeedStr),
      bedtime: bedtime.trim(),
      wakeTime: wakeTime.trim()
    });
  }

  return metrics;
}

/**
 * Exports Sleep metrics to CSV
 */
export function exportSleepToCSV(data: SleepMetric[]) {
  const exportData = data.map(d => ({
    Date: d.date,
    Score: d.score,
    RestingHR: d.restingHeartRate,
    ReadinessScore: d.readinessScore,
    PulseOx: d.pulseOx,
    Respiration: d.respiration,
    HRVStatus: d.hrvStatus,
    Quality: d.quality,
    DurationMinutes: d.duration,
    SleepNeedMinutes: d.sleepNeed,
    Bedtime: d.bedtime,
    WakeTime: d.wakeTime
  }));
  
  exportToCSV(exportData, `Velo_SleepTimeline_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Parses Garmin HRV Status CSV export
 * Note: Garmin's "Date" in this export is often "Apr 30". 
 * We try to infer the year from the current date.
 */
export function parseHRVCSV(csv: string): HRVMetric[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const metrics: HRVMetric[] = [];
  const currentYear = new Date().getFullYear();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length < 4) continue;

    const [dateStr, hrvStr, baselineStr, avgStr] = parts;

    // Parse Date (e.g., "Apr 30")
    const date = parseGarminDate(dateStr.trim(), currentYear);
    
    // Parse Baseline (e.g., "28ms - 35ms")
    const baselineParts = baselineStr.match(/(\d+)/g);
    const baselineMin = baselineParts ? parseInt(baselineParts[0]) : 0;
    const baselineMax = baselineParts ? parseInt(baselineParts[1]) : 0;

    metrics.push({
      date: date,
      overnightHRV: parseInt(hrvStr) || 0,
      baselineMin,
      baselineMax,
      sevenDayAvg: parseInt(avgStr) || 0
    });
  }

  return metrics;
}

/**
 * Exports HRV metrics to CSV
 */
export function exportHRVToCSV(data: HRVMetric[]) {
  const exportData = data.map(d => ({
    Date: d.date,
    OvernightHRV: d.overnightHRV,
    BaselineMin: d.baselineMin,
    BaselineMax: d.baselineMax,
    SevenDayAvg: d.sevenDayAvg
  }));

  exportToCSV(exportData, `Velo_HRVRecovery_${new Date().toISOString().split('T')[0]}.csv`);
}

function parseDurationToMinutes(duration: string): number {
  // Format: "5h 23min" or "9h 16min"
  const hMatch = duration.match(/(\d+)h/);
  const mMatch = duration.match(/(\d+)min/);
  
  const hours = hMatch ? parseInt(hMatch[1]) : 0;
  const minutes = mMatch ? parseInt(mMatch[1]) : 0;
  
  return (hours * 60) + minutes;
}

function parseGarminDate(dateStr: string, defaultYear: number): string {
  // Handle formats like "Apr 30" or "2026-04-30"
  if (dateStr.includes('-')) return dateStr;
  
  const date = new Date(`${dateStr} ${defaultYear}`);
  // If the parsed date is in the future, it might be from last year
  if (date > new Date()) {
    date.setFullYear(defaultYear - 1);
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates a "Velo-Coded" experimental readiness score.
 * Formula and methodology based on the "VeloAnalytics Design System" guidelines.
 */
export function calculateVeloReadiness(
  sleep: SleepMetric | null,
  hrv: HRVMetric | null,
  sb: number, // Form (LTS - STS)
  sts: number, // Fatigue (STS / ATL)
  dailyMaxBikeScore: number = 0
): { score: number; contributors: Record<string, number>; penalties: string[] } {
  // 1. Component Pillar Normalization (0-100)
  
  // Sleep Pillar: Direct from Garmin Sleep Score
  const sleepPillar = sleep?.score || 0;
  const durationHours = (sleep?.duration || 0) / 60;

  // Recovery Pillar: Estimated from Fatigue (STS)
  // Higher Fatigue = Lower Recovery. sts of 80 is considered near-empty.
  const recoveryPillar = Math.max(0, Math.min(100, 100 - (sts * 1.25)));

  // HRV Pillar: Normalized to baseline status
  let hrvPillar = 50; 
  if (hrv && hrv.baselineMax > hrv.baselineMin) {
    const range = hrv.baselineMax - hrv.baselineMin;
    const offset = hrv.overnightHRV - hrv.baselineMin;
    if (offset < 0) {
      // Below baseline: 0-40 range. Primary suppression danger zone.
      hrvPillar = Math.max(0, 40 + (offset / Math.max(1, hrv.baselineMin)) * 40);
    } else {
      // Within or above baseline: 40-100 range.
      hrvPillar = Math.min(100, 40 + (offset / range) * 60);
    }
  }

  // Load Pillar: ACWR Interpretation and Spike Suppression
  const lts = sb + sts;
  const acwr = lts > 0 ? (sts / lts) : 1.0;
  
  let loadPillar = 100;
  if (acwr > 1.5) loadPillar = 10;
  else if (acwr > 1.3) loadPillar = 40;
  else if (acwr > 1.1) loadPillar = 70;
  else if (acwr < 0.8) loadPillar = 85; // Under-training
  else loadPillar = 100; // Optimal

  // Relative Intensity Spike Suppression (Recovery Guard)
  // If a single session exceeds 5.0x current CTL, Load Pillar is force-dropped to 0 (Red)
  const spikeLimit = lts * 5.0;
  const isSpikeTriggered = lts > 0 && dailyMaxBikeScore > spikeLimit;
  if (isSpikeTriggered) {
    loadPillar = 0;
  }

  // 2. Weighted Base Calculation
  // (Sleep * 0.35) + (Recovery * 0.25) + (HRV * 0.20) + (Load * 0.20)
  const baseScore = (sleepPillar * 0.35) + (recoveryPillar * 0.25) + (hrvPillar * 0.20) + (loadPillar * 0.20);
  
  // 3. Pillar Suppression (Veto Logic - Non-Linear Mixed Model)
  // Final = (Base * 0.30) + (Base * 0.70 * (WorstPillar / 100))
  const pillars = [
    { name: 'Sleep', val: sleepPillar },
    { name: 'Recovery', val: recoveryPillar },
    { name: 'HRV', val: hrvPillar },
    { name: 'Load', val: loadPillar }
  ];
  const worstPillar = pillars.reduce((prev, curr) => prev.val < curr.val ? prev : curr);
  const suppressionRatio = worstPillar.val / 100;
  
  let finalScore = (baseScore * 0.30) + (baseScore * 0.70 * suppressionRatio);
  
  const penalties: string[] = [];
  
  // 4. Multiplicative Inhibitors & Suppressors
  
  // Sleep Debt Deduction (Flat -15 if < 6 hours)
  if (durationHours > 0 && durationHours < 6) {
    finalScore -= 15;
    penalties.push("Sleep Debt (<6h)");
  }

  // Recovery Hard Caps
  // Estimate recovery time from Fatigue (STS). Fatigue > 45 correlates with > 24-48h recovery.
  const estimatedRecoveryTime = sts > 35 ? (sts - 35) * 2 : 0;
  
  if (estimatedRecoveryTime > 48) {
    // Critical: Compressed towards floor of 25
    if (finalScore > 25) {
      finalScore = 25 + (finalScore - 25) * 0.15;
      penalties.push("Critical Recovery (48h+ Cap)");
    }
  } else if (estimatedRecoveryTime > 24) {
    // Moderate: Capped at 55
    if (finalScore > 55) {
      finalScore = 55;
      penalties.push("Moderate Recovery (24h+ Cap)");
    }
  }

  // ACWR Interpretation (Capped at 40 if ACWR > 1.4)
  if (acwr > 1.4 && finalScore > 40) {
    finalScore = 40;
    penalties.push("Injury Risk (ACWR > 1.4 Cap)");
  }

  // Spike Warning for penalties array
  if (isSpikeTriggered) {
    penalties.push("Recovery Guard (Intensity Spike)");
  }
  
  // Final Boundary Clamping
  finalScore = Math.max(0, Math.min(100, Math.round(finalScore)));

  return {
    score: finalScore,
    contributors: {
      sleep: Math.round(sleepPillar),
      recovery: Math.round(recoveryPillar),
      hrv: Math.round(hrvPillar),
      load: Math.round(loadPillar)
    },
    penalties
  };
}

