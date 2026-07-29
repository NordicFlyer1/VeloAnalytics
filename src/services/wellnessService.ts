import { SleepMetric, HRVMetric } from '../types';
import { exportToCSV } from '../lib/csvExport';

/**
 * Clean UTF-8 BOM and split lines safely
 */
function cleanCSVLines(csv: string): string[] {
  const cleaned = csv.replace(/^\uFEFF/, '').trim();
  return cleaned.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
}

/**
 * Parses Garmin Sleep CSV export across 1-day, 7-day, 4-week, or custom date range views.
 * Dynamically detects column headers regardless of export metadata titles.
 */
export function parseSleepCSV(csv: string): SleepMetric[] {
  const lines = cleanCSVLines(csv);
  if (lines.length < 2) return [];

  // Find header line
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const cols = lines[i].split(',').map(c => c.trim().toLowerCase());
    if (cols.some(c => c.includes('score') || c.includes('resting') || c.includes('duration') || c.includes('sleep'))) {
      headerIndex = i;
      headers = cols;
      break;
    }
  }

  if (headerIndex === -1) {
    // Fallback to first line
    headerIndex = 0;
    headers = lines[0].split(',').map(c => c.trim().toLowerCase());
  }

  // Column index map
  const getIndex = (...keywords: string[]) => {
    return headers.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const idxDate = getIndex('date', 'sleep score', 'day');
  const idxScore = headers.findIndex((h, idx) => h === 'score' || (h.includes('score') && idx !== idxDate));
  const idxRestingHR = getIndex('resting');
  const idxReadiness = getIndex('training readiness', 'readiness');
  const idxBodyBattery = getIndex('body battery');
  const idxPulseOx = getIndex('pulse');
  const idxRespiration = getIndex('respiration');
  const idxHRVStatus = getIndex('hrv');
  const idxQuality = getIndex('quality');
  const idxDuration = getIndex('duration');
  const idxSleepNeed = getIndex('need');
  const idxBedtime = getIndex('bedtime');
  const idxWakeTime = getIndex('wake');

  const currentYear = new Date().getFullYear();
  const metrics: SleepMetric[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 3) continue;

    const dateStr = idxDate >= 0 ? parts[idxDate] : parts[0];
    const scoreVal = idxScore >= 0 ? parseInt(parts[idxScore]) || 0 : 0;
    const restingHRVal = idxRestingHR >= 0 ? parseInt(parts[idxRestingHR]) || 0 : 0;
    
    // Distinguish Readiness from Body Battery
    let readinessVal = 0;
    if (idxReadiness >= 0) {
      readinessVal = parseInt(parts[idxReadiness]) || 0;
    }

    const pulseOxVal = idxPulseOx >= 0 ? parseFloat(parts[idxPulseOx]) || 0 : 0;
    const respirationVal = idxRespiration >= 0 ? parseFloat(parts[idxRespiration]) || 0 : 0;
    const hrvStatusVal = idxHRVStatus >= 0 ? parseInt(parts[idxHRVStatus]) || 0 : 0;
    const qualityVal = idxQuality >= 0 ? parts[idxQuality] : '';
    const durationVal = idxDuration >= 0 ? parseDurationToMinutes(parts[idxDuration]) : 0;
    const sleepNeedVal = idxSleepNeed >= 0 ? parseDurationToMinutes(parts[idxSleepNeed]) : 0;
    const bedtimeVal = idxBedtime >= 0 ? parts[idxBedtime] : '';
    const wakeTimeVal = idxWakeTime >= 0 ? parts[idxWakeTime] : '';

    const formattedDate = parseGarminDate(dateStr, currentYear);

    metrics.push({
      date: formattedDate,
      score: scoreVal,
      restingHeartRate: restingHRVal,
      readinessScore: readinessVal,
      pulseOx: pulseOxVal,
      respiration: respirationVal,
      hrvStatus: hrvStatusVal,
      quality: qualityVal,
      duration: durationVal,
      sleepNeed: sleepNeedVal,
      bedtime: bedtimeVal,
      wakeTime: wakeTimeVal
    });
  }

  return metrics;
}

/**
 * Exports Sleep metrics to CSV
 */
export async function exportSleepToCSV(data: SleepMetric[]) {
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
  
  await exportToCSV(exportData, `Velo_SleepTimeline_${new Date().toISOString().split('T')[0]}.csv`);
}

/**
 * Parses Garmin HRV Status CSV export across 1-day, 7-day, 4-week or custom ranges.
 * Dynamically detects column headers.
 */
export function parseHRVCSV(csv: string): HRVMetric[] {
  const lines = cleanCSVLines(csv);
  if (lines.length < 2) return [];

  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const cols = lines[i].split(',').map(c => c.trim().toLowerCase());
    if (cols.some(c => c.includes('hrv') || c.includes('baseline') || c.includes('avg') || c.includes('overnight'))) {
      headerIndex = i;
      headers = cols;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
    headers = lines[0].split(',').map(c => c.trim().toLowerCase());
  }

  const getIndex = (...keywords: string[]) => {
    return headers.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const idxDate = getIndex('date', 'hrv status', 'day');
  const idxOvernight = getIndex('overnight', 'hrv');
  const idxBaseline = getIndex('baseline');
  const idxAvg = getIndex('7d', 'avg', 'average');

  const metrics: HRVMetric[] = [];
  const currentYear = new Date().getFullYear();
  
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 2) continue;

    const dateStr = idxDate >= 0 ? parts[idxDate] : parts[0];
    const hrvStr = idxOvernight >= 0 ? parts[idxOvernight] : parts[1] || '0';
    const baselineStr = idxBaseline >= 0 ? parts[idxBaseline] : parts[2] || '';
    const avgStr = idxAvg >= 0 ? parts[idxAvg] : parts[3] || '0';

    const date = parseGarminDate(dateStr, currentYear);
    
    // Parse Baseline (e.g., "28ms - 35ms" or "30 - 36")
    const baselineParts = baselineStr.match(/(\d+)/g);
    const baselineMin = baselineParts ? parseInt(baselineParts[0]) : 0;
    const baselineMax = baselineParts ? parseInt(baselineParts[1]) : 0;

    metrics.push({
      date,
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
export async function exportHRVToCSV(data: HRVMetric[]) {
  const exportData = data.map(d => ({
    Date: d.date,
    OvernightHRV: d.overnightHRV,
    BaselineMin: d.baselineMin,
    BaselineMax: d.baselineMax,
    SevenDayAvg: d.sevenDayAvg
  }));

  await exportToCSV(exportData, `Velo_HRVRecovery_${new Date().toISOString().split('T')[0]}.csv`);
}

function parseDurationToMinutes(duration: string): number {
  if (!duration) return 0;

  // Handle format "7h 4min", "7h 4m", "7h", "30min"
  const hMatch = duration.match(/(\d+)\s*h/i);
  const mMatch = duration.match(/(\d+)\s*m/i);
  
  let hours = hMatch ? parseInt(hMatch[1]) : 0;
  let minutes = mMatch ? parseInt(mMatch[1]) : 0;
  
  // If hh:mm format (e.g., "07:04")
  if (!hMatch && !mMatch && duration.includes(':')) {
    const [h, m] = duration.split(':').map(Number);
    hours = h || 0;
    minutes = m || 0;
  }

  return (hours * 60) + minutes;
}

function parseGarminDate(dateStr: string, defaultYear: number): string {
  if (!dateStr) return '';
  const cleanStr = dateStr.trim();

  // Standard ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    return cleanStr;
  }

  // Handle MM/DD/YYYY or M/D/YYYY
  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
      const m = String(parseInt(parts[0])).padStart(2, '0');
      const d = String(parseInt(parts[1])).padStart(2, '0');
      let y = parseInt(parts[2]);
      if (y < 100) y += 2000;
      return `${y}-${m}-${d}`;
    }
  }

  // Handle formats like "Jul 29" or "July 29"
  const date = new Date(`${cleanStr} ${defaultYear}`);
  if (!isNaN(date.getTime())) {
    if (date > new Date()) {
      date.setFullYear(defaultYear - 1);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return cleanStr;
}

/**
 * Calculates Standard Readiness Score.
 * Aligns closely with Garmin's Training Readiness model using a 5-pillar composite weighting:
 * - Sleep Score (30%)
 * - HRV Status relative to baseline (25%)
 * - Sleep Duration vs Sleep Need (15%)
 * - Resting Heart Rate relative to baseline (15%)
 * - Training Stress Balance / Form (15%)
 */
export function calculateStandardReadiness(
  sleep: SleepMetric | null,
  hrv: HRVMetric | null,
  sb: number = 0,
  baselineRHR: number = 58
): number {
  if (!sleep) return 0;

  // 1. Sleep Score Component (0 - 100)
  const sleepPillar = sleep.score > 0 ? sleep.score : 70;

  // 2. HRV Status Component (0 - 100)
  let hrvPillar = 80; // Neutral default
  if (hrv && hrv.baselineMax > hrv.baselineMin && hrv.overnightHRV > 0) {
    if (hrv.overnightHRV >= hrv.baselineMin && hrv.overnightHRV <= hrv.baselineMax) {
      // Balanced HRV within baseline: 85 - 100 pts
      const mid = (hrv.baselineMin + hrv.baselineMax) / 2;
      const spread = (hrv.baselineMax - hrv.baselineMin) / 2;
      const offset = Math.abs(hrv.overnightHRV - mid);
      hrvPillar = Math.round(100 - (offset / (spread || 1)) * 15);
    } else if (hrv.overnightHRV < hrv.baselineMin) {
      // Below baseline (Suppressed): 30 - 75 pts
      const drop = hrv.baselineMin - hrv.overnightHRV;
      hrvPillar = Math.max(20, Math.round(75 - (drop / Math.max(1, hrv.baselineMin)) * 150));
    } else {
      // Above baseline: 80 - 95 pts
      hrvPillar = 90;
    }
  } else if (sleep.hrvStatus > 0) {
    hrvPillar = Math.min(100, Math.max(30, sleep.hrvStatus * 2.5));
  }

  // 3. Sleep Duration vs Sleep Need Component (0 - 100)
  let durationPillar = 80;
  if (sleep.duration > 0) {
    const target = sleep.sleepNeed > 0 ? sleep.sleepNeed : 450; // 7.5 hours default
    const ratio = sleep.duration / target;
    if (ratio >= 1.0) {
      durationPillar = Math.min(100, Math.round(85 + (ratio - 1.0) * 30));
    } else {
      durationPillar = Math.max(30, Math.round(85 * ratio));
    }
  }

  // 4. Resting Heart Rate Component (0 - 100)
  let rhrPillar = 85;
  if (sleep.restingHeartRate > 0) {
    const diff = sleep.restingHeartRate - baselineRHR;
    if (diff <= 0) {
      rhrPillar = Math.min(100, 90 + Math.abs(diff) * 2);
    } else if (diff <= 3) {
      rhrPillar = Math.max(70, 90 - diff * 6);
    } else {
      rhrPillar = Math.max(30, 72 - (diff - 3) * 8);
    }
  }

  // 5. Form / Training Stress Balance (SB) Component (0 - 100)
  let loadPillar = 80;
  if (sb >= 10) loadPillar = 95;
  else if (sb >= 0) loadPillar = 88;
  else if (sb >= -15) loadPillar = 75;
  else if (sb >= -30) loadPillar = 58;
  else loadPillar = 40;

  // Composite Calculation
  const composite = (sleepPillar * 0.30) + 
                    (hrvPillar * 0.25) + 
                    (durationPillar * 0.15) + 
                    (rhrPillar * 0.15) + 
                    (loadPillar * 0.15);

  return Math.max(0, Math.min(100, Math.round(composite)));
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


