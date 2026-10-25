import { garminGet, GarminApiError } from './garminClient';
import { GarminDailySleepDTO, GarminDailyHrvDTO, GarminSyncProgress } from './types';
import { SleepMetric, HRVMetric } from '../../types';

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generate a list of YYYY-MM-DD dates from (today - daysBack) to today (chronological order)
 */
export function generateDateList(daysBack: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = daysBack; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(formatDateIso(d));
  }
  return dates;
}

/**
 * Formats epoch timestamp (ms) to a human-readable "h:mm a" time
 */
function formatTimestampToTime(tsMs?: number): string {
  if (!tsMs || !Number.isFinite(tsMs)) return '--:--';
  const d = new Date(tsMs);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Checks whether a sleep metric contains meaningful physiological or sleep data
 */
export function isSleepRecordValid(metric: SleepMetric): boolean {
  if (!metric || !metric.date) return false;
  return (
    metric.duration > 0 ||
    metric.score > 0 ||
    metric.restingHeartRate > 0 ||
    metric.pulseOx > 0 ||
    metric.respiration > 0
  );
}

/**
 * Safely extracts resting heart rate (bpm) from any Garmin payload item or envelope.
 * Strictly verifies physiological validity (28-220 bpm).
 */
export function extractRestingHeartRate(item: any): number {
  if (!item || typeof item !== 'object') return 0;

  const candidate = 
    item.heartRate?.restingValue ??
    item.heartRate?.restingHeartRate ??
    item.restingHeartRate ??
    item.restingHeartRateValue ??
    item.restingHeartRateInBeatsPerMinute ??
    item.rhr ??
    item.allDay?.restingHeartRate ??
    item.userSummary?.restingHeartRate ??
    item.wellness?.restingHeartRate ??
    item.sleepHeartRate?.restingValue ??
    item.dailySleepDTO?.restingHeartRate ??
    item.minHeartRate ??
    0;

  const num = Number(candidate);
  if (Number.isFinite(num) && num >= 28 && num <= 220) {
    return Math.round(num);
  }
  return 0;
}

/**
 * Safely extracts canonical date string (YYYY-MM-DD) from Garmin items or timestamps
 */
export function extractDateFromItem(item: any): string {
  if (!item || typeof item !== 'object') return '';
  const d = item.calendarDate || item.date || item.startDate || item.day || '';
  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{10,13}$/.test(trimmed)) {
      const dt = new Date(Number(trimmed));
      if (!isNaN(dt.getTime())) return formatDateIso(dt);
    }
  } else if (typeof d === 'number') {
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) return formatDateIso(dt);
  }
  return '';
}

/**
 * Transforms any Garmin Sleep DTO / summary item into VeloAnalytics SleepMetric schema
 */
export function transformGarminSleep(dto: GarminDailySleepDTO | any): SleepMetric {
  const rawAny = dto || {};
  
  // Sleep Score
  const overallScore = rawAny.sleepScores?.overall?.value 
    ?? rawAny.overallSleepScore?.value 
    ?? rawAny.sleepScore 
    ?? rawAny.score 
    ?? rawAny.sleepScoreValue
    ?? 0;

  // Duration in seconds (handling confirmed, unconfirmed, or staged breakdowns)
  let rawSeconds = rawAny.sleepTimeSeconds 
    ?? rawAny.totalSleepSeconds 
    ?? rawAny.durationInSeconds 
    ?? rawAny.sleepDurationInSeconds 
    ?? rawAny.unconfirmedSleepSeconds
    ?? 0;

  if (rawSeconds === 0) {
    const deep = rawAny.deepSleepSeconds || 0;
    const light = rawAny.lightSleepSeconds || 0;
    const rem = rawAny.remSleepSeconds || 0;
    const awake = rawAny.awakeSleepSeconds || 0;
    if (deep > 0 || light > 0 || rem > 0) {
      rawSeconds = deep + light + rem + awake;
    }
  }

  const durationMinutes = Math.round(rawSeconds / 60);

  // Sleep Need
  let needMinutes = 480; // default 8h
  if (typeof rawAny.sleepNeed === 'object' && rawAny.sleepNeed?.value) {
    needMinutes = Math.round(rawAny.sleepNeed.value);
  } else if (typeof rawAny.sleepNeed === 'object' && rawAny.sleepNeed?.plannedNeedMinutes) {
    needMinutes = Math.round(rawAny.sleepNeed.plannedNeedMinutes);
  } else if (typeof rawAny.sleepNeed === 'number' && rawAny.sleepNeed > 0) {
    needMinutes = Math.round(rawAny.sleepNeed);
  } else if (typeof rawAny.sleepNeedMinutes === 'number' && rawAny.sleepNeedMinutes > 0) {
    needMinutes = Math.round(rawAny.sleepNeedMinutes);
  }

  // Quality qualifier
  let quality = rawAny.sleepScores?.overall?.qualifierKey 
    || rawAny.overallSleepScore?.qualifierKey 
    || rawAny.quality;
  if (!quality) {
    if (overallScore >= 80) quality = 'EXCELLENT';
    else if (overallScore >= 70) quality = 'GOOD';
    else if (overallScore >= 60) quality = 'FAIR';
    else if (overallScore > 0) quality = 'POOR';
    else quality = '';
  }

  // Pulse OX / SpO2
  const pulseOxValue = rawAny.averageSpO2Value 
    ?? rawAny.avgSpO2 
    ?? rawAny.avgSpO2Value
    ?? rawAny.spO2 
    ?? rawAny.spo2 
    ?? rawAny.averageSpO2 
    ?? rawAny.lowestSpO2Value
    ?? 0;

  // Respiration Rate (brpm)
  const respirationValue = rawAny.averageRespirationValue 
    ?? rawAny.avgRespirationValue 
    ?? rawAny.averageRespiration 
    ?? rawAny.respiration 
    ?? rawAny.avgRespiration
    ?? rawAny.lowestRespirationValue
    ?? 0;

  // Overnight HRV Status (ms)
  const overnightHrvValue = rawAny.averageOvernightHrv 
    ?? rawAny.avgOvernightHrv 
    ?? rawAny.overnightHrv 
    ?? 0;

  // Resting Heart Rate (bpm)
  const rhrValue = extractRestingHeartRate(rawAny);

  // Timestamps
  const startTimestamp = rawAny.sleepStartTimestampGMT 
    ?? rawAny.sleepStartTimestampLocal 
    ?? rawAny.startTimeGMT
    ?? rawAny.startTimestampGMT;
  const endTimestamp = rawAny.sleepEndTimestampGMT 
    ?? rawAny.sleepEndTimestampLocal 
    ?? rawAny.endTimeGMT
    ?? rawAny.endTimestampGMT;

  const calendarDate = rawAny.calendarDate || rawAny.date || rawAny.startDate || '';

  return {
    date: calendarDate,
    score: overallScore,
    restingHeartRate: rhrValue,
    readinessScore: overallScore,
    pulseOx: pulseOxValue ? Math.round(pulseOxValue) : 0,
    respiration: respirationValue ? Math.round(respirationValue) : 0,
    hrvStatus: overnightHrvValue ? Math.round(overnightHrvValue) : 0,
    quality: String(quality).toUpperCase(),
    duration: durationMinutes,
    sleepNeed: needMinutes,
    bedtime: formatTimestampToTime(startTimestamp),
    wakeTime: formatTimestampToTime(endTimestamp)
  };
}

/**
 * Transforms a Garmin HRV DTO into VeloAnalytics HRVMetric schema
 */
export function transformGarminHrv(dto: GarminDailyHrvDTO | any): HRVMetric {
  const rawAny = dto || {};
  const overnight = rawAny.lastNightAvg 
    ?? rawAny.lastNight 
    ?? rawAny.overnightAvg 
    ?? rawAny.weeklyAvg 
    ?? 0;
  const sevenDay = rawAny.weeklyAvg 
    ?? rawAny.sevenDayAvg 
    ?? overnight 
    ?? 0;
  const min = rawAny.baseline?.balancedLow 
    ?? rawAny.baseline?.lowUpper 
    ?? rawAny.baselineMin 
    ?? 45;
  const max = rawAny.baseline?.balancedUpper 
    ?? rawAny.baselineMax 
    ?? 65;

  return {
    date: rawAny.calendarDate || rawAny.date || '',
    overnightHRV: Math.round(overnight),
    baselineMin: Math.round(min),
    baselineMax: Math.round(max),
    sevenDayAvg: Math.round(sevenDay)
  };
}

/**
 * Extracts an array of items from diverse Garmin API response envelope wrappers
 */
function extractListFromPayload(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.dailySleepDTOList)) return raw.dailySleepDTOList;
  if (Array.isArray(raw.sleepSummaries)) return raw.sleepSummaries;
  if (Array.isArray(raw.dailySleepList)) return raw.dailySleepList;
  if (Array.isArray(raw.hrvSummaries)) return raw.hrvSummaries;
  if (Array.isArray(raw.dailyHrvList)) return raw.dailyHrvList;
  if (Array.isArray(raw.dailySummaries)) return raw.dailySummaries;
  if (Array.isArray(raw.userDailySummaries)) return raw.userDailySummaries;
  if (Array.isArray(raw.allDayHeartRateSummaries)) return raw.allDayHeartRateSummaries;
  if (Array.isArray(raw.dailyHeartRateDTOList)) return raw.dailyHeartRateDTOList;
  if (Array.isArray(raw.summaries)) return raw.summaries;
  if (Array.isArray(raw.data)) return raw.data;
  if (raw.dailySleepDTO) return [raw.dailySleepDTO];
  if (raw.dailySleep) return [raw.dailySleep];
  if (raw.hrvSummary) return [raw.hrvSummary];
  if (raw.dailyHrvDTO) return [raw.dailyHrvDTO];
  if (raw.userDailySummary) return [raw.userDailySummary];
  if (raw.dailySummary) return [raw.dailySummary];
  if (raw.heartRateSummary) return [raw.heartRateSummary];
  return [];
}

/**
 * Fetches sleep metrics across a date range using Garmin Personal API batch range endpoints.
 * This is the official personal API path (e.g. /sleep-service/sleep/dailySleepSummariesByDate).
 */
export async function fetchSleepRange(startDate: string, endDate: string): Promise<SleepMetric[]> {
  const rangeUrls = [
    `/sleep-service/sleep/dailySleepSummariesByDate?startDate=${startDate}&endDate=${endDate}`,
    `/sleep-service/sleep/dailySleep?startDate=${startDate}&endDate=${endDate}`,
    `/sleep-service/sleep/dailySleepData?startDate=${startDate}&endDate=${endDate}`,
    `/wellness-service/wellness/dailySleepData?startDate=${startDate}&endDate=${endDate}`
  ];

  for (const url of rangeUrls) {
    try {
      const raw = await garminGet<any>(url);
      if (!raw) continue;

      const items = extractListFromPayload(raw);
      if (items.length > 0) {
        const parsed = items
          .map(item => transformGarminSleep(item))
          .filter(isSleepRecordValid);

        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err: any) {
      if (err instanceof GarminApiError && (err.status === 404 || err.status === 400 || err.status === 204)) {
        continue;
      }
      console.warn(`[Garmin] Sleep range query ${url} notice:`, err?.message || err);
    }
  }

  return [];
}

/**
 * Fetches sleep metrics for a single date using Garmin Connect Personal API endpoints.
 * Used as a granular fallback if the batch range endpoint returns no data.
 */
export async function fetchSleepForDate(dateStr: string): Promise<SleepMetric | null> {
  const candidateUrls = [
    `/sleep-service/sleep/dailySleepSummariesByDate?startDate=${dateStr}&endDate=${dateStr}`,
    `/sleep-service/sleep/dailySleep?date=${dateStr}`,
    `/sleep-service/sleep/dailySleepData?date=${dateStr}`,
    `/sleep-service/sleep/dailySleepData?calendarDate=${dateStr}`,
    `/sleep-service/sleep/dailySleep/${dateStr}`,
    `/sleep-service/sleep/daily/${dateStr}`,
    `/wellness-service/wellness/dailySleepData?date=${dateStr}`
  ];

  for (const url of candidateUrls) {
    try {
      const raw = await garminGet<any>(url);
      if (!raw) continue;

      let dto: any = null;
      const items = extractListFromPayload(raw);
      if (items.length > 0) {
        dto = items[0];
      } else {
        dto = raw.dailySleepDTO || raw.dailySleep || raw.sleepData || raw;
      }

      if (!dto) continue;

      const calendarDate = dto.calendarDate || dto.date || dto.startDate || dateStr;
      const transformed = transformGarminSleep({ ...dto, calendarDate });

      if (isSleepRecordValid(transformed)) {
        return transformed;
      }
    } catch (err: any) {
      if (err instanceof GarminApiError && (err.status === 404 || err.status === 204 || err.status === 400)) {
        continue;
      }
      console.warn(`[Garmin] Sleep query ${url} notice:`, err?.message || err);
    }
  }

  return null;
}

/**
 * Attempts to fetch overnight HRV metrics across a date range.
 */
export async function fetchHrvRange(startDate: string, endDate: string): Promise<HRVMetric[]> {
  const rangeUrls = [
    `/hrv-service/hrv/dailyHrvSummariesByDate?startDate=${startDate}&endDate=${endDate}`,
    `/hrv-service/hrv/dailyHrv?startDate=${startDate}&endDate=${endDate}`,
    `/hrv-service/hrv?startDate=${startDate}&endDate=${endDate}`
  ];

  for (const url of rangeUrls) {
    try {
      const raw = await garminGet<any>(url);
      if (!raw) continue;

      const items = extractListFromPayload(raw);
      if (items.length > 0) {
        const parsed = items
          .map(item => transformGarminHrv(item))
          .filter(h => h && h.date && (h.overnightHRV > 0 || h.sevenDayAvg > 0));

        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err: any) {
      if (err instanceof GarminApiError && (err.status === 404 || err.status === 400 || err.status === 204)) {
        continue;
      }
      // Silently fall through to daily fetch
    }
  }

  return [];
}

/**
 * Fetches overnight HRV metrics for a single date.
 * Tries the primary Garmin endpoint (/hrv-service/hrv/YYYY-MM-DD) and fallback.
 */
export async function fetchHrvForDate(dateStr: string): Promise<HRVMetric | null> {
  const candidateUrls = [
    `/hrv-service/hrv/${dateStr}`,
    `/hrv-service/hrv/daily/${dateStr}`
  ];

  for (const url of candidateUrls) {
    try {
      const raw = await garminGet<any>(url);
      if (!raw) continue;

      const dto: GarminDailyHrvDTO = raw.hrvSummary || raw.dailyHrvDTO || raw.hrvData || raw;
      if (!dto) continue;

      const calendarDate = dto.calendarDate || (dto as any).date || dateStr;
      const overnight = dto.lastNightAvg ?? (dto as any).lastNight ?? (dto as any).overnightAvg ?? dto.weeklyAvg ?? 0;
      const weekly = dto.weeklyAvg ?? overnight ?? 0;

      if (overnight > 0 || weekly > 0) {
        return transformGarminHrv({ ...dto, calendarDate });
      }
    } catch (err: any) {
      if (err instanceof GarminApiError && (err.status === 404 || err.status === 204)) {
        continue;
      }
      console.warn(`[Garmin] HRV query ${url} error:`, err?.message || err);
    }
  }

  return null;
}

/**
 * Fetches daily user summaries across a date range to extract resting heart rate.
 * Uses Garmin Connect user summary range endpoints.
 */
export async function fetchDailyRhrRange(startDate: string, endDate: string): Promise<Map<string, number>> {
  const rhrMap = new Map<string, number>();

  const rangeUrls = [
    `/usersummary-service/v2/dailysummaries?startDate=${startDate}&endDate=${endDate}`,
    `/usersummary-service/usersummary/daily?startDate=${startDate}&endDate=${endDate}`,
    `/wellness-service/wellness/dailyHeartRate?startDate=${startDate}&endDate=${endDate}`,
    `/wellness-service/wellness/dailySummary?startDate=${startDate}&endDate=${endDate}`
  ];

  for (const url of rangeUrls) {
    try {
      const raw = await garminGet<any>(url);
      if (!raw) continue;

      const items = extractListFromPayload(raw);
      if (items.length > 0) {
        for (const item of items) {
          const dateStr = extractDateFromItem(item);
          const rhr = extractRestingHeartRate(item);
          if (dateStr && rhr > 0) {
            rhrMap.set(dateStr, rhr);
          }
        }

        if (rhrMap.size > 0) {
          return rhrMap;
        }
      }
    } catch (err: any) {
      if (err instanceof GarminApiError && (err.status === 404 || err.status === 400 || err.status === 204)) {
        continue;
      }
      console.warn(`[Garmin] Daily summary range query ${url} notice:`, err?.message || err);
    }
  }

  return rhrMap;
}

/**
 * Fetches resting heart rate for a single calendar date using granular daily endpoints.
 */
export async function fetchDailyRhrForDate(dateStr: string): Promise<number> {
  const candidateUrls = [
    `/usersummary-service/usersummary/daily/${dateStr}`,
    `/wellness-service/wellness/dailyHeartRate/${dateStr}`,
    `/usersummary-service/usersummary/daily?date=${dateStr}`,
    `/wellness-service/wellness/dailyHeartRate?date=${dateStr}`,
    `/wellness-service/wellness/dailySummary/${dateStr}`
  ];

  for (const url of candidateUrls) {
    try {
      const raw = await garminGet<any>(url);
      if (!raw) continue;

      const items = extractListFromPayload(raw);
      const targetObj = items.length > 0 ? items[0] : (raw.userDailySummary || raw.dailySummary || raw);
      const rhr = extractRestingHeartRate(targetObj);
      if (rhr > 0) {
        return rhr;
      }
    } catch (err: any) {
      if (err instanceof GarminApiError && (err.status === 404 || err.status === 400 || err.status === 204)) {
        continue;
      }
    }
  }

  return 0;
}

/**
 * Merges incoming sleep metrics with existing records.
 * Non-destructive: preserves existing manual CSV values if incoming values are zero,
 * resolves duplicates by date, and maintains reverse-chronological order (newest first).
 */
export function mergeSleepMetrics(
  existing: SleepMetric[],
  incoming: SleepMetric[]
): SleepMetric[] {
  const map = new Map<string, SleepMetric>();
  
  // Seed with existing records (e.g. manual CSV imports)
  for (const item of existing) {
    if (item && item.date) {
      map.set(item.date, item);
    }
  }

  // Merge incoming records non-destructively
  for (const item of incoming) {
    if (item && item.date) {
      const prev = map.get(item.date);
      if (prev) {
        map.set(item.date, {
          ...prev,
          ...item,
          score: item.score || prev.score,
          restingHeartRate: item.restingHeartRate || prev.restingHeartRate,
          readinessScore: item.readinessScore || prev.readinessScore,
          pulseOx: item.pulseOx || prev.pulseOx,
          respiration: item.respiration || prev.respiration,
          hrvStatus: item.hrvStatus || prev.hrvStatus,
          quality: item.quality || prev.quality,
          duration: item.duration || prev.duration,
          sleepNeed: item.sleepNeed || prev.sleepNeed,
          bedtime: (item.bedtime && item.bedtime !== '--:--') ? item.bedtime : prev.bedtime,
          wakeTime: (item.wakeTime && item.wakeTime !== '--:--') ? item.wakeTime : prev.wakeTime
        });
      } else {
        map.set(item.date, item);
      }
    }
  }

  // Sort reverse-chronologically (newest date first)
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Merges incoming HRV metrics with existing records.
 * Non-destructive: preserves existing manual CSV records, resolves duplicates by date,
 * and maintains reverse-chronological order (newest first).
 */
export function mergeHrvMetrics(
  existing: HRVMetric[],
  incoming: HRVMetric[]
): HRVMetric[] {
  const map = new Map<string, HRVMetric>();
  
  // Seed with existing records
  for (const item of existing) {
    if (item && item.date) {
      map.set(item.date, item);
    }
  }

  // Merge incoming records non-destructively
  for (const item of incoming) {
    if (item && item.date) {
      const prev = map.get(item.date);
      if (prev) {
        map.set(item.date, {
          ...prev,
          ...item,
          overnightHRV: item.overnightHRV || prev.overnightHRV,
          baselineMin: item.baselineMin || prev.baselineMin,
          baselineMax: item.baselineMax || prev.baselineMax,
          sevenDayAvg: item.sevenDayAvg || prev.sevenDayAvg
        });
      } else {
        map.set(item.date, item);
      }
    }
  }

  // Sort reverse-chronologically (newest date first)
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export interface SyncHealthOptions {
  daysBack?: number;
  existingSleep: SleepMetric[];
  existingHrv: HRVMetric[];
  syncSleep?: boolean;
  syncHrv?: boolean;
  onProgress?: (progress: GarminSyncProgress) => void;
}

/**
 * High-level Health & Recovery sync orchestrator.
 * Queries Sleep, HRV, and daily Resting Heart Rate metrics across a recent date window (default 14 days),
 * normalizes data, and returns merged lists sorted reverse-chronologically.
 */
export async function syncGarminHealth(
  options: SyncHealthOptions
): Promise<{
  sleepRecordsSynced: number;
  hrvRecordsSynced: number;
  mergedSleep: SleepMetric[];
  mergedHrv: HRVMetric[];
}> {
  const {
    daysBack = 14,
    existingSleep,
    existingHrv,
    syncSleep = true,
    syncHrv = true,
    onProgress
  } = options;

  const dates = generateDateList(daysBack);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  let fetchedSleep: SleepMetric[] = [];
  let fetchedHrv: HRVMetric[] = [];
  let rhrMap = new Map<string, number>();

  // 1. Fetch Sleep Data
  if (syncSleep) {
    onProgress?.({
      phase: 'downloading',
      message: `Fetching Garmin sleep & wellness telemetry (${startDate} to ${endDate})...`
    });

    // Primary: Try official Garmin Personal API range endpoint
    fetchedSleep = await fetchSleepRange(startDate, endDate);

    // Secondary: If range returned empty or unsupported, gracefully iterate individual dates
    if (fetchedSleep.length === 0) {
      const totalSteps = dates.length;
      for (let i = 0; i < totalSteps; i++) {
        const dateStr = dates[i];
        onProgress?.({
          phase: 'downloading',
          current: i + 1,
          total: totalSteps,
          message: `Querying sleep metrics (${i + 1}/${totalSteps}): ${dateStr}`
        });

        const daySleep = await fetchSleepForDate(dateStr);
        if (daySleep) {
          fetchedSleep.push(daySleep);
        }

        // Micro-pause to yield thread for smooth UI updates
        await new Promise(r => setTimeout(r, 25));
      }
    }

    // 1b. Fetch Daily Resting Heart Rate (RHR) from User Summary telemetry
    onProgress?.({
      phase: 'downloading',
      message: `Fetching Garmin daily resting heart rate telemetry...`
    });

    rhrMap = new Map<string, number>();
    try {
      rhrMap = await fetchDailyRhrRange(startDate, endDate);

      // If range query returned no data or incomplete, query missing dates directly
      const missingDates = dates.filter(d => !rhrMap.has(d));
      if (rhrMap.size === 0 || (missingDates.length > 0 && rhrMap.size < 3)) {
        for (let i = 0; i < dates.length; i++) {
          const dateStr = dates[i];
          if (rhrMap.has(dateStr)) continue;

          const dayRhr = await fetchDailyRhrForDate(dateStr);
          if (dayRhr > 0) {
            rhrMap.set(dateStr, dayRhr);
          }
          await new Promise(r => setTimeout(r, 20));
        }
      }
    } catch (err) {
      console.warn('[Garmin] Daily RHR fetch notice:', err);
    }

    // Populate RHR into matched sleep records
    for (const metric of fetchedSleep) {
      const rhr = rhrMap.get(metric.date);
      if (rhr && rhr > 0) {
        metric.restingHeartRate = rhr;
      }
    }

    // For any dates where we have valid RHR but no sleep record was created
    for (const [dateStr, rhrVal] of rhrMap.entries()) {
      if (rhrVal > 0 && !fetchedSleep.some(s => s.date === dateStr)) {
        fetchedSleep.push({
          date: dateStr,
          score: 0,
          restingHeartRate: rhrVal,
          readinessScore: 0,
          pulseOx: 0,
          respiration: 0,
          hrvStatus: 0,
          quality: '',
          duration: 0,
          sleepNeed: 480,
          bedtime: '--:--',
          wakeTime: '--:--'
        });
      }
    }
  }

  // 2. Fetch Overnight HRV Data
  if (syncHrv) {
    onProgress?.({
      phase: 'downloading',
      message: `Fetching Garmin overnight HRV telemetry...`
    });

    // Attempt range first
    fetchedHrv = await fetchHrvRange(startDate, endDate);

    // Fall back to proven daily fetch loop if range was empty
    if (fetchedHrv.length === 0) {
      const totalSteps = dates.length;
      for (let i = 0; i < totalSteps; i++) {
        const dateStr = dates[i];
        onProgress?.({
          phase: 'downloading',
          current: i + 1,
          total: totalSteps,
          message: `Querying overnight HRV (${i + 1}/${totalSteps}): ${dateStr}`
        });

        const dayHrv = await fetchHrvForDate(dateStr);
        if (dayHrv) {
          fetchedHrv.push(dayHrv);
        }

        await new Promise(r => setTimeout(r, 25));
      }
    }
  }

  // 3. Cross-pollination: if sleep records contain overnight HRV data but HRV stream missed that date, bridge it
  for (const s of fetchedSleep) {
    if (s.hrvStatus > 0 && !fetchedHrv.some(h => h.date === s.date)) {
      fetchedHrv.push({
        date: s.date,
        overnightHRV: s.hrvStatus,
        baselineMin: 45,
        baselineMax: 65,
        sevenDayAvg: s.hrvStatus
      });
    }
  }

  // 4. Non-destructive merge: preserves any user CSV imports while updating new Garmin values
  const mergedSleep = syncSleep ? mergeSleepMetrics(existingSleep, fetchedSleep) : existingSleep;
  if (syncSleep && rhrMap.size > 0) {
    for (const item of mergedSleep) {
      if ((!item.restingHeartRate || item.restingHeartRate === 0) && rhrMap.has(item.date)) {
        item.restingHeartRate = rhrMap.get(item.date)!;
      }
    }
  }
  const mergedHrv = syncHrv ? mergeHrvMetrics(existingHrv, fetchedHrv) : existingHrv;

  // Persist directly to localStorage
  try {
    if (syncSleep) {
      localStorage.setItem('veloanalytics_sleep_history', JSON.stringify(mergedSleep));
    }
    if (syncHrv) {
      localStorage.setItem('veloanalytics_hrv_history', JSON.stringify(mergedHrv));
    }
  } catch (err) {
    console.error('[Garmin] Failed to persist merged health data to localStorage:', err);
  }

  return {
    sleepRecordsSynced: fetchedSleep.length,
    hrvRecordsSynced: fetchedHrv.length,
    mergedSleep,
    mergedHrv
  };
}
