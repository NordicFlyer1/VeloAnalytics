import { unzipSync } from 'fflate';
import { garminGet, garminDownloadBinary, GarminApiError } from './garminClient';
import { getGarminSettings, saveGarminSettings } from './garminAuth';
import { GarminActivitySummary, GarminSyncProgress, GarminSyncResult } from './types';
import { HistoricalActivity } from '../../types';

/**
 * Checks whether an activity from Garmin Connect is a cycling activity.
 */
export function isCyclingActivity(activity: GarminActivitySummary): boolean {
  if (!activity || !activity.activityType) return false;
  const key = (activity.activityType.typeKey || '').toLowerCase();
  
  const cyclingTypeKeys = [
    'cycling',
    'road_biking',
    'gravel_cycling',
    'mountain_biking',
    'virtual_ride',
    'indoor_cycling',
    'cyclocross',
    'track_cycling',
    'bmx',
    'recumbent_cycling',
    'e_biking',
    'e_mountain_biking'
  ];

  if (cyclingTypeKeys.includes(key)) return true;
  return key.includes('cycl') || key.includes('bike') || key.includes('biking');
}

/**
 * Extracts a .FIT binary buffer from a raw ArrayBuffer.
 * Handles both direct raw .FIT files and ZIP archives (which Garmin often packages downloads in).
 */
export function extractFitBuffer(rawBuffer: ArrayBuffer): ArrayBuffer {
  if (!rawBuffer || rawBuffer.byteLength < 12) {
    throw new Error('Downloaded activity file is empty or too short.');
  }

  const bytes = new Uint8Array(rawBuffer);

  // Check if buffer is a ZIP archive (PK\x03\x04 signature at bytes 0-3)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    try {
      const unzipped = unzipSync(bytes);
      const fileNames = Object.keys(unzipped);
      
      // Look for a file ending with .fit
      const fitFileName = fileNames.find(f => f.toLowerCase().endsWith('.fit')) || fileNames[0];
      if (fitFileName && unzipped[fitFileName]) {
        const fileData = unzipped[fitFileName];
        // Create an independent ArrayBuffer clone for the fit file
        const fitBuffer = new ArrayBuffer(fileData.byteLength);
        new Uint8Array(fitBuffer).set(fileData);
        return fitBuffer;
      }
    } catch (unzipErr) {
      console.warn('[Garmin] Failed to unzip archive, attempting raw parse:', unzipErr);
    }
  }

  // Check for FIT magic signature at offset 8-11: '.FIT' (0x2E, 0x46, 0x49, 0x54)
  if (bytes.length >= 12 && bytes[8] === 0x2e && bytes[9] === 0x46 && bytes[10] === 0x49 && bytes[11] === 0x54) {
    return rawBuffer;
  }

  // Fallback: return rawBuffer directly
  return rawBuffer;
}

/**
 * Robust deduplication: checks whether a Garmin activity is already present in VeloAnalytics history.
 */
export function isActivityAlreadyImported(
  activity: GarminActivitySummary,
  history: HistoricalActivity[]
): boolean {
  if (!history || history.length === 0) return false;

  const targetId = activity.activityId;
  const targetIdStr = String(targetId);

  // 1. Direct O(1) matching on garminActivityId
  const matchById = history.some(h => h.garminActivityId === targetId);
  if (matchById) return true;

  // 2. Matching on originalFileName (e.g. Activity_14829104821.fit)
  const matchByName = history.some(h => 
    h.originalFileName && h.originalFileName.includes(targetIdStr)
  );
  if (matchByName) return true;

  // 3. Heuristic matching on start time & duration if filename differs
  const actStartTimeMs = new Date(activity.startTimeLocal || activity.startTimeGMT).getTime();
  if (Number.isFinite(actStartTimeMs)) {
    const actDuration = activity.duration || 0;
    
    const matchByTime = history.some(h => {
      const histDate = h.fullSummary?.startTime 
        ? new Date(h.fullSummary.startTime).getTime() 
        : new Date(h.date).getTime();
      
      if (!Number.isFinite(histDate)) return false;
      
      // Within 2 minutes of start time
      const timeDiff = Math.abs(histDate - actStartTimeMs);
      if (timeDiff <= 120000) {
        // If duration is recorded on both, verify within 15 seconds
        if (actDuration > 0 && h.duration > 0) {
          return Math.abs(h.duration - actDuration) <= 15;
        }
        return true;
      }
      return false;
    });

    if (matchByTime) return true;
  }

  return false;
}

/**
 * Queries Garmin Connect for recent activities and filters for cycling disciplines.
 */
export async function fetchRecentCyclingActivities(
  limit: number = 20,
  start: number = 0
): Promise<GarminActivitySummary[]> {
  const data = await garminGet<any>(
    `/activitylist-service/activities/search/activities?limit=${limit}&start=${start}`
  );

  let rawList: GarminActivitySummary[] = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && Array.isArray(data.activities)) {
    rawList = data.activities;
  } else if (data && Array.isArray(data.activityList)) {
    rawList = data.activityList;
  }

  return rawList.filter(isCyclingActivity);
}

/**
 * Downloads a binary FIT file from Garmin Connect download-service and unzips if needed.
 */
export async function downloadActivityFit(
  activityId: number
): Promise<{ buffer: ArrayBuffer; activityId: number }> {
  const rawBuffer = await garminDownloadBinary(
    `/download-service/files/activity/${activityId}`
  );
  const fitBuffer = extractFitBuffer(rawBuffer);
  return { buffer: fitBuffer, activityId };
}

/**
 * Converts a downloaded activity buffer and metadata into a standard DOM File object.
 */
export function createFitFileFromGarmin(
  activity: GarminActivitySummary,
  buffer: ArrayBuffer
): File {
  const cleanName = (activity.activityName || 'Garmin_Ride')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_');
  
  const fileName = `${cleanName}_${activity.activityId}.fit`;
  const timeMs = new Date(activity.startTimeLocal || activity.startTimeGMT).getTime();

  const file = new File([buffer], fileName, {
    type: 'application/octet-stream',
    lastModified: Number.isFinite(timeMs) ? timeMs : Date.now()
  });
  (file as any).garminActivityId = activity.activityId;
  return file;
}

export interface SyncActivitiesOptions {
  limit?: number;
  existingHistory: HistoricalActivity[];
  onProgress?: (progress: GarminSyncProgress) => void;
  onFilesReady: (files: File[]) => Promise<void> | void;
}

/**
 * High-level cycling activity sync orchestrator.
 * 1. Fetches recent cycling activities from Garmin Connect
 * 2. Compares against existing local history to deduplicate
 * 3. Downloads missing .FIT files
 * 4. Passes standard File objects to the application's processing queue
 */
export async function syncGarminActivities(
  options: SyncActivitiesOptions
): Promise<GarminSyncResult> {
  const { limit = 20, existingHistory, onProgress, onFilesReady } = options;
  const result: GarminSyncResult = {
    activitiesSynced: 0,
    activitiesSkipped: 0,
    healthDaysSynced: 0,
    errors: []
  };

  try {
    onProgress?.({
      phase: 'discovering',
      message: 'Checking Garmin Connect for recent cycling activities...'
    });

    const cyclingActivities = await fetchRecentCyclingActivities(limit);
    
    if (cyclingActivities.length === 0) {
      onProgress?.({
        phase: 'done',
        message: 'No recent cycling activities found in Garmin Connect.'
      });
      return result;
    }

    // Filter out rides that already exist locally
    const toDownload = cyclingActivities.filter(act => {
      const exists = isActivityAlreadyImported(act, existingHistory);
      if (exists) {
        result.activitiesSkipped++;
      }
      return !exists;
    });

    if (toDownload.length === 0) {
      onProgress?.({
        phase: 'done',
        message: `All ${cyclingActivities.length} recent activities are already synchronized.`
      });
      return result;
    }

    const downloadedFiles: File[] = [];
    const totalToDownload = toDownload.length;

    for (let i = 0; i < totalToDownload; i++) {
      const act = toDownload[i];
      const actTitle = act.activityName || `Activity ${act.activityId}`;

      onProgress?.({
        phase: 'downloading',
        current: i + 1,
        total: totalToDownload,
        activityName: actTitle,
        message: `Downloading (${i + 1}/${totalToDownload}): ${actTitle}`
      });

      try {
        const { buffer } = await downloadActivityFit(act.activityId);
        const file = createFitFileFromGarmin(act, buffer);
        downloadedFiles.push(file);
        result.activitiesSynced++;
      } catch (err: any) {
        const msg = `Failed to download activity ${act.activityId} (${actTitle}): ${err?.message || 'Error'}`;
        console.error(msg, err);
        result.errors.push(msg);
      }
    }

    if (downloadedFiles.length > 0) {
      onProgress?.({
        phase: 'processing',
        message: `Processing ${downloadedFiles.length} new activity ${downloadedFiles.length === 1 ? 'file' : 'files'}...`
      });

      // Yield frame so UI renders status before heavy batch processing starts
      await new Promise(r => setTimeout(r, 60));

      await onFilesReady(downloadedFiles);
    }

    // Update settings with lastSyncTimestamp
    const currentSettings = getGarminSettings();
    saveGarminSettings({
      ...currentSettings,
      lastSyncTimestamp: Date.now()
    });

    onProgress?.({
      phase: 'done',
      message: `Sync complete! Synced ${result.activitiesSynced} new ${result.activitiesSynced === 1 ? 'ride' : 'rides'} (${result.activitiesSkipped} already up to date).`
    });

    return result;
  } catch (err: any) {
    const errorMsg = err instanceof GarminApiError ? err.message : (err?.message || 'Activity sync failed.');
    result.errors.push(errorMsg);
    onProgress?.({
      phase: 'error',
      message: errorMsg
    });
    throw err;
  }
}
