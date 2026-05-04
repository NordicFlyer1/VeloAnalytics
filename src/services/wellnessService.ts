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
 * Calculates a "Vibe Coded" experimental readiness score.
 * Uses a weighted balance modified by Garmin-style multiplicative inhibitors and deficit scalars.
 */
export function calculateVeloReadiness(
  sleep: SleepMetric | null,
  hrv: HRVMetric | null,
  sb: number, // Form/TSB
  sts: number, // Fatigue/ATL
  dailyMaxBikeScore: number = 0
): { score: number; contributors: Record<string, number>; penalties: string[] } {
  // 1. Inputs Normalization
  const sleepBasis = sleep?.score || 0;
  const durationHours = (sleep?.duration || 0) / 60;
  
  // HRV Component: Normalize overnight HRV to a 0-100 scale relative to baseline
  let hrvComponent = 50; 
  if (hrv && hrv.baselineMax > hrv.baselineMin) {
    const range = hrv.baselineMax - hrv.baselineMin;
    const offset = hrv.overnightHRV - hrv.baselineMin;
    // We want the score to be 100 if at the top of baseline, 70 in middle, 40 at bottom.
    // Above baseline is a bonus, below is a critical penalty.
    hrvComponent = Math.max(0, (offset / range) * 50 + 40); 
    if (hrv.overnightHRV > hrv.baselineMax) hrvComponent = Math.min(100, 90 + (hrv.overnightHRV - hrv.baselineMax) * 0.5);
  }

  // Load Component: ACWR Interpretation (Higher Load = Lower Readiness)
  // ACWR = Acute / Chronic. 
  // sts = Acute (7d), lts = Chronic (42d). sb = lts - sts => lts = sb + sts.
  const lts = sb + sts;
  const acwr = lts > 0 ? (sts / lts) : 1.0;
  
  let loadComponent = 100;
  if (acwr > 1.5) loadComponent = 10;
  else if (acwr > 1.3) loadComponent = 30;
  else if (acwr > 1.1) loadComponent = 60;
  else if (acwr < 0.8) loadComponent = 80; // Under-training is "Ready" but maybe not "Peaked"
  else loadComponent = 100; // Optimal (0.8 - 1.1)

  /**
   * RECOVERY ADJUSTMENT: Relative Intensity Spike Suppression
   * Rule: If a single session's BikeScore exceeds 5.0x your current CTL (lts),
   * the Load Pillar is force-dropped to "Red" (0).
   * Reason: For a recovering athlete, a spike represents acute inflammatory risk
   * regardless of other recovery markers.
   */
  const spikeLimit = lts > 0 ? lts * 5.0 : 0;
  const isSpikeTriggered = spikeLimit > 0 && dailyMaxBikeScore > spikeLimit;
  if (isSpikeTriggered) {
    loadComponent = 0;
  }

  // Recovery Component: Estimate from Fatigue (STS)
  // Higher fatigue = lower recovery score.
  const recoveryComponent = Math.max(0, Math.min(100, 100 - (sts * 1.1)));

  // 2. Base Calculation (Weighted Average)
  let baseScore = (sleepBasis * 0.35) + (recoveryComponent * 0.25) + (hrvComponent * 0.20) + (loadComponent * 0.20);
  
  const penalties: string[] = [];
  
  // 3. Garmin-Style "Pillar Suppression" Logic
  // The lowest pillar acts as a drag on the entire system.
  // Even if sleep is 100, if HRV is 30, the score is suppressed by that 0.3x ratio.
  const corePillars = [
    { name: 'Sleep', score: sleepBasis },
    { name: 'Recovery', score: recoveryComponent },
    { name: 'HRV', score: hrvComponent },
    { name: 'Load', score: loadComponent } // Load is now a core pillar for suppression
  ];
  
  const worstPillar = corePillars.reduce((prev, curr) => prev.score < curr.score ? prev : curr);
  const suppressionScalar = worstPillar.score / 100;
  
  // Apply suppression - this is "veto logic" where the worst pillar drags the score down.
  // We use a 30/70 mixed suppression model to prevent complete score bottom-out.
  let score = (baseScore * 0.30) + (baseScore * 0.70 * suppressionScalar);

  if (isSpikeTriggered) {
    penalties.push("Critical Load Spike (>5x CTL)");
  }
  
  if (suppressionScalar < 0.6 && !isSpikeTriggered) {
    penalties.push(`Suppressed by ${worstPillar.name} deficit (${worstPillar.score})`);
  }
  
  // 4. Conditional Multipliers & Penalties
  
  // A. HRV Status "Low" Multiplier (Already handled by suppression if it's the lowest pillar)
  if (hrv && hrv.overnightHRV < hrv.baselineMin) {
    penalties.push("Low HRV Status (Suppressed)");
  }

  // B. Sleep Debt Penalty
  if (durationHours > 0 && durationHours < 6) {
    score -= 15;
    penalties.push("Sleep Debt (<6h)");
  }

  // C. Recovery Time Hard Cap
  const estimatedRecoveryTime = sts > 45 ? (sts - 35) * 2 : 0;
  if (estimatedRecoveryTime > 48) {
    if (score > 30) {
      score = 25 + (score * 0.1); // Harsh compression toward floor
      penalties.push("Critical Recovery Needed (48h+ Cap)");
    }
  } else if (estimatedRecoveryTime > 24) {
    if (score > 55) {
      score = 55;
      penalties.push("Moderate Recovery needed (24h+ Cap)");
    }
  }

  // D. ACWR "Overreaching" Penalty
  if (acwr > 1.4 && score > 40) {
    score = 40;
    penalties.push("High ACWR Risk (Overreaching)");
  }

  // Final Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    contributors: {
      sleep: Math.round(sleepBasis),
      recovery: Math.round(recoveryComponent),
      hrv: Math.round(hrvComponent),
      load: Math.round(loadComponent)
    },
    penalties
  };
}

