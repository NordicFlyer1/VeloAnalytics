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
  
  return date.toISOString().split('T')[0];
}
