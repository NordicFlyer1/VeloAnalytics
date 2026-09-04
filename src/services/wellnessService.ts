import { SleepMetric, HRVMetric } from '../types';
import { exportToCSV } from '../lib/csvExport';
import { format } from 'date-fns';

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

/**
 * Clean UTF-8 BOM and split lines safely
 */
function cleanCSVLines(csv: string): string[] {
  const cleaned = csv.replace(/^\uFEFF/, '').trim();
  return cleaned.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
}

/**
 * Parses any date string into canonical YYYY-MM-DD format deterministically.
 */
export function parseDateToISO(dateStr: string, defaultYear: number = new Date().getFullYear()): string {
  if (!dateStr) return '';
  const cleanStr = dateStr.trim();

  // 1. ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    return cleanStr;
  }

  // 2. MM/DD/YYYY or M/D/YYYY
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

  // 3. Extract 4-digit year if present
  let year = defaultYear;
  const yearMatch = cleanStr.match(/\b(20\d\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  }

  // 4. Month name and day (e.g., "Sep 4", "August 31", "Sep 4, 2026")
  const monthMatch = cleanStr.match(/([a-zA-Z]+)/);
  if (monthMatch && MONTH_MAP[monthMatch[1].toLowerCase()]) {
    const monthNum = MONTH_MAP[monthMatch[1].toLowerCase()];
    const dayMatch = cleanStr.match(/\b(\d{1,2})\b/);
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1]);
      return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    }
  }

  // 5. Fallback via Date object
  const parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return cleanStr;
}

/**
 * Parses Garmin weekly date ranges (e.g. "Aug 29 - Sep 4", "Aug 22-28", "Dec 27, 2025 - Jan 2, 2026")
 * Anchors to the end date of the week.
 */
export function parseGarminDateRange(dateRangeStr: string, currentYear: number = new Date().getFullYear()): string {
  if (!dateRangeStr) return '';
  const cleanStr = dateRangeStr.trim();

  // If already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    return cleanStr;
  }

  // Determine year (check for explicit year in the string, taking the last 4-digit year for the end date)
  let year = currentYear;
  const yearMatches = cleanStr.match(/\b(20\d\d)\b/g);
  if (yearMatches && yearMatches.length > 0) {
    year = parseInt(yearMatches[yearMatches.length - 1]);
  }

  // Split on range separator: hyphen, en-dash, or em-dash
  const parts = cleanStr.split(/\s*[-–—]\s*/);
  if (parts.length >= 2) {
    const startPart = parts[0].trim();
    const endPart = parts[parts.length - 1].trim();

    // Check if endPart has month letters (e.g. "Sep 4", "Jan 2, 2026")
    const endMonthLetters = endPart.match(/([a-zA-Z]+)/);
    let monthNum = 0;
    let dayNum = 0;

    if (endMonthLetters && MONTH_MAP[endMonthLetters[1].toLowerCase()]) {
      monthNum = MONTH_MAP[endMonthLetters[1].toLowerCase()];
      const dayMatch = endPart.match(/\b(\d{1,2})\b/);
      if (dayMatch) dayNum = parseInt(dayMatch[1]);
    } else {
      // Month is in startPart (e.g., "Aug 22-28")
      const startMonthLetters = startPart.match(/([a-zA-Z]+)/);
      if (startMonthLetters && MONTH_MAP[startMonthLetters[1].toLowerCase()]) {
        monthNum = MONTH_MAP[startMonthLetters[1].toLowerCase()];
      }
      const dayMatch = endPart.match(/\b(\d{1,2})\b/);
      if (dayMatch) dayNum = parseInt(dayMatch[1]);
    }

    if (monthNum > 0 && dayNum > 0) {
      return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    }
  }

  return parseDateToISO(cleanStr, year);
}

/**
 * Defensive date formatter for charts - guarantees never throwing RangeError.
 */
export function safeFormatDate(dateStr: string, pattern: string = 'MMM dd'): string {
  if (!dateStr) return '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (!isNaN(dateObj.getTime())) {
        return format(dateObj, pattern);
      }
    }
    const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, pattern);
    }
  } catch {
    // Fallback safely to original string
  }
  return dateStr;
}

/**
 * Parses duration strings like "8h 18min", "8h 18m", "55m", "7h", "07:04" into total minutes.
 */
function parseDurationToMinutes(duration: string): number {
  if (!duration || duration === '--') return 0;

  const hMatch = duration.match(/(\d+)\s*h/i);
  const mMatch = duration.match(/(\d+)\s*m(?:in)?/i);
  
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

/**
 * Parses Garmin 1-Day vertical key-value sleep export.
 */
function parseVerticalSleepCSV(lines: string[]): SleepMetric[] {
  const kv: Record<string, string> = {};
  for (const line of lines) {
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;
    const key = line.slice(0, commaIdx).trim().toLowerCase();
    const val = line.slice(commaIdx + 1).trim();
    if (key && val) {
      kv[key] = val;
    }
  }

  const dateRaw = kv['date'] || '';
  if (!dateRaw) return [];
  const date = parseDateToISO(dateRaw);

  const score = parseInt(kv['sleep score'] || kv['score'] || '0') || 0;
  const quality = kv['quality'] || '';
  const duration = parseDurationToMinutes(kv['sleep duration'] || kv['duration'] || '');
  const sleepNeed = parseDurationToMinutes(kv['sleep need'] || kv['avg sleep need'] || '');

  // Resting heart rate (e.g. "59 bpm")
  const rhrMatch = (kv['resting heart rate'] || kv['resting hr'] || '').match(/\d+/);
  const restingHeartRate = rhrMatch ? parseInt(rhrMatch[0]) : 0;

  // Pulse Ox / SpO2 (e.g. "Avg SpO₂,91%" or "Avg SpO2,91%")
  const spo2Key = Object.keys(kv).find(k => k.includes('spo') || k.includes('pulse'));
  const spo2Raw = spo2Key ? kv[spo2Key] : '';
  const spo2Match = spo2Raw.match(/[\d.]+/);
  const pulseOx = spo2Match ? parseFloat(spo2Match[0]) : 0;

  // Respiration (e.g. "Avg Respiration,16 brpm")
  const respKey = Object.keys(kv).find(k => k.includes('respiration'));
  const respRaw = respKey ? kv[respKey] : '';
  const respMatch = respRaw.match(/[\d.]+/);
  const respiration = respMatch ? parseFloat(respMatch[0]) : 0;

  // Overnight HRV (e.g. "Avg Overnight HRV,31 ms")
  const hrvKey = Object.keys(kv).find(k => k.includes('hrv') && !k.includes('7d'));
  const hrvRaw = hrvKey ? kv[hrvKey] : '';
  const hrvMatch = hrvRaw.match(/\d+/);
  const hrvStatus = hrvMatch ? parseInt(hrvMatch[0]) : 0;

  return [{
    date,
    score,
    restingHeartRate,
    readinessScore: 0,
    pulseOx,
    respiration,
    hrvStatus,
    quality,
    duration,
    sleepNeed,
    bedtime: kv['bedtime'] || '',
    wakeTime: kv['wake time'] || kv['waketime'] || ''
  }];
}

/**
 * Parses Garmin 1-Year weekly aggregate sleep export.
 */
function parse1YearSleepCSV(lines: string[]): SleepMetric[] {
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('avg score') || l.includes('avg duration') || l.startsWith('date,')) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) headerIndex = 0;

  const metrics: SleepMetric[] = [];
  let trackingYear = new Date().getFullYear();
  let prevMonth = 12;

  // Check top rows for any explicit 4-digit year
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const match = lines[i].match(/\b(20\d\d)\b/);
    if (match) {
      const foundYear = parseInt(match[1]);
      if (foundYear >= trackingYear) {
        trackingYear = foundYear;
      }
      break;
    }
  }

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 7) continue;

    // The last 6 tokens are: Avg Score, Avg Quality, Avg Duration, Avg Sleep Need, Avg Bedtime, Avg Wake Time
    const values = parts.slice(-6);
    const dateRangeStr = parts.slice(0, -6).join(',').trim();

    const score = parseInt(values[0]) || 0;
    const quality = values[1] === '--' ? '' : values[1];
    const duration = parseDurationToMinutes(values[2]);
    const sleepNeed = parseDurationToMinutes(values[3]);
    const bedtime = values[4] === '--' ? '' : values[4];
    const wakeTime = values[5] === '--' ? '' : values[5];

    // Filter empty rows (e.g. "--,--,--,--,--,--")
    if (score === 0 && duration === 0 && (values[0] === '--' || values[0] === '')) {
      continue;
    }

    const explicitYearMatch = dateRangeStr.match(/\b(20\d\d)\b/);
    if (explicitYearMatch) {
      trackingYear = parseInt(explicitYearMatch[1]);
    }

    let formattedDate = parseGarminDateRange(dateRangeStr, trackingYear);
    if (!formattedDate) continue;

    // Detect reverse-chronological month wraps (e.g. Jan -> Dec)
    const monthPart = parseInt(formattedDate.split('-')[1]);
    if (monthPart > prevMonth && !explicitYearMatch) {
      trackingYear -= 1;
      formattedDate = parseGarminDateRange(dateRangeStr, trackingYear);
    }
    prevMonth = monthPart;

    metrics.push({
      date: formattedDate,
      score,
      restingHeartRate: 0,
      readinessScore: 0,
      pulseOx: 0,
      respiration: 0,
      hrvStatus: 0,
      quality,
      duration,
      sleepNeed,
      bedtime,
      wakeTime
    });
  }

  return metrics;
}

/**
 * Parses Garmin 7-Day, 4-Week, and tabular Sleep CSV exports.
 */
function parseTabularSleepCSV(lines: string[]): SleepMetric[] {
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
    headerIndex = 0;
    headers = lines[0].split(',').map(c => c.trim().toLowerCase());
  }

  const getIndex = (...keywords: string[]) => {
    return headers.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const idxDate = getIndex('date', 'sleep score', 'day');
  const idxScore = headers.findIndex((h, idx) => h === 'score' || (h.includes('score') && idx !== idxDate));
  const idxRestingHR = getIndex('resting');
  const idxReadiness = getIndex('training readiness', 'readiness');
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

    // Check if the whole row is empty/placeholders
    const isAllDashes = parts.slice(1).every(p => p === '--' || p === '');
    if (isAllDashes) continue;

    const dateStr = idxDate >= 0 ? parts[idxDate] : parts[0];
    const scoreVal = idxScore >= 0 ? parseInt(parts[idxScore]) || 0 : 0;
    const restingHRVal = idxRestingHR >= 0 ? parseInt(parts[idxRestingHR]) || 0 : 0;
    
    let readinessVal = 0;
    if (idxReadiness >= 0) {
      readinessVal = parseInt(parts[idxReadiness]) || 0;
    }

    const pulseOxVal = idxPulseOx >= 0 ? parseFloat(parts[idxPulseOx]) || 0 : 0;
    const respirationVal = idxRespiration >= 0 ? parseFloat(parts[idxRespiration]) || 0 : 0;
    const hrvStatusVal = idxHRVStatus >= 0 ? parseInt(parts[idxHRVStatus]) || 0 : 0;
    const qualityVal = idxQuality >= 0 && parts[idxQuality] !== '--' ? parts[idxQuality] : '';
    const durationVal = idxDuration >= 0 ? parseDurationToMinutes(parts[idxDuration]) : 0;
    const sleepNeedVal = idxSleepNeed >= 0 ? parseDurationToMinutes(parts[idxSleepNeed]) : 0;
    const bedtimeVal = idxBedtime >= 0 && parts[idxBedtime] !== '--' ? parts[idxBedtime] : '';
    const wakeTimeVal = idxWakeTime >= 0 && parts[idxWakeTime] !== '--' ? parts[idxWakeTime] : '';

    if (scoreVal === 0 && durationVal === 0 && restingHRVal === 0) {
      continue;
    }

    const formattedDate = parseDateToISO(dateStr, currentYear);
    if (!formattedDate) continue;

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
 * Universal Garmin Sleep CSV parser handling 1-Day, 7-Day, 4-Week, and 1-Year formats.
 */
export function parseSleepCSV(csv: string): SleepMetric[] {
  const lines = cleanCSVLines(csv);
  if (lines.length < 2) return [];

  const firstLine = lines[0].toLowerCase();
  const secondLine = lines[1] ? lines[1].toLowerCase() : '';

  // 1. Check for 1-Day vertical key-value export
  if (firstLine.includes('1 day') || secondLine.startsWith('date,') || lines.some(l => l.toLowerCase().startsWith('sleep score factors'))) {
    return parseVerticalSleepCSV(lines);
  }

  // 2. Check for 1-Year weekly aggregate export
  if (firstLine.includes('avg score') || firstLine.includes('avg duration') || firstLine.includes('avg bedtime')) {
    return parse1YearSleepCSV(lines);
  }

  // 3. Standard 7-Day, 4-Week, or custom tabular export
  return parseTabularSleepCSV(lines);
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
 * Parses Garmin 1-Day vertical key-value HRV export.
 */
function parseVerticalHRV(lines: string[]): HRVMetric[] {
  const kv: Record<string, string> = {};
  for (const line of lines) {
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;
    const key = line.slice(0, commaIdx).trim().toLowerCase();
    const val = line.slice(commaIdx + 1).trim();
    if (key && val) {
      kv[key] = val;
    }
  }

  const dateRaw = kv['date'] || '';
  if (!dateRaw) return [];
  const date = parseDateToISO(dateRaw);

  const hrvStr = kv['overnight hrv'] || kv['hrv'] || '0';
  const baselineStr = kv['baseline'] || '';
  const avgStr = kv['7d avg'] || kv['avg'] || '0';

  const overnightHRV = parseInt(hrvStr) || 0;
  const sevenDayAvg = parseInt(avgStr) || 0;

  const baselineParts = baselineStr.match(/(\d+)/g);
  const baselineMin = baselineParts ? parseInt(baselineParts[0]) : 0;
  const baselineMax = baselineParts && baselineParts.length > 1 ? parseInt(baselineParts[1]) : 0;

  return [{
    date,
    overnightHRV,
    baselineMin,
    baselineMax,
    sevenDayAvg
  }];
}

/**
 * Parses Garmin 7-Day, 4-Week, and tabular HRV exports.
 */
function parseTabularHRV(lines: string[]): HRVMetric[] {
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
  let trackingYear = new Date().getFullYear();
  let prevMonth = 12;

  // Check top rows for explicit 4-digit year
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const match = lines[i].match(/\b(20\d\d)\b/);
    if (match) {
      const foundYear = parseInt(match[1]);
      if (foundYear >= trackingYear) {
        trackingYear = foundYear;
      }
      break;
    }
  }

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 2) continue;

    const dateStr = idxDate >= 0 ? parts[idxDate] : parts[0];
    const hrvStr = idxOvernight >= 0 ? parts[idxOvernight] : parts[1] || '0';
    const baselineStr = idxBaseline >= 0 ? parts[idxBaseline] : parts[2] || '';
    const avgStr = idxAvg >= 0 ? parts[idxAvg] : parts[3] || '0';

    const overnightHRV = parseInt(hrvStr) || 0;
    const sevenDayAvg = parseInt(avgStr) || 0;

    // If both are missing/placeholders, skip empty row
    if (hrvStr === '--' && (avgStr === '--' || avgStr === '0')) continue;

    const baselineParts = baselineStr.match(/(\d+)/g);
    const baselineMin = baselineParts ? parseInt(baselineParts[0]) : 0;
    const baselineMax = baselineParts && baselineParts.length > 1 ? parseInt(baselineParts[1]) : 0;

    const explicitYearMatch = dateStr.match(/\b(20\d\d)\b/);
    if (explicitYearMatch) {
      trackingYear = parseInt(explicitYearMatch[1]);
    }

    let formattedDate = parseDateToISO(dateStr, trackingYear);
    if (!formattedDate) continue;

    // Detect reverse-chronological month wraps (e.g. Jan -> Dec)
    const monthPart = parseInt(formattedDate.split('-')[1]);
    if (monthPart > prevMonth && !explicitYearMatch) {
      trackingYear -= 1;
      formattedDate = parseDateToISO(dateStr, trackingYear);
    }
    prevMonth = monthPart;

    metrics.push({
      date: formattedDate,
      overnightHRV,
      baselineMin,
      baselineMax,
      sevenDayAvg
    });
  }

  return metrics;
}

/**
 * Universal Garmin HRV Status CSV parser handling 1-Day, 7-Day, 4-Week, and tabular formats.
 */
export function parseHRVCSV(csv: string): HRVMetric[] {
  const lines = cleanCSVLines(csv);
  if (lines.length < 2) return [];

  const firstLine = lines[0].toLowerCase();
  const secondLine = lines[1] ? lines[1].toLowerCase() : '';

  // 1. Check for 1-Day vertical key-value format
  if (firstLine.includes('1 day') || secondLine.startsWith('date,')) {
    return parseVerticalHRV(lines);
  }

  // 2. Tabular format (7 Days / 4 Weeks / Custom)
  return parseTabularHRV(lines);
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


