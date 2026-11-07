import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h > 0 ? `${h}H ` : ''}${m}M ${s}S`;
};

export const formatNumericalDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Formats a Date object or date-string to YYYY-MM-DD in local time
 */
export const formatLocalDate = (date: Date | string): string => {
  if (!date) return '';
  
  if (typeof date === 'string') {
    // If it's already YYYY-MM-DD, just return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    
    // If it has a T but no Z, it's already localish
    // If it has a Z, it's UTC.
    // We want to convert to local Date object first if it's a string
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Safely formats any date string/Date object for display in history cards (e.g. 'Aug 12')
 */
export const formatHistoryDisplayDate = (date: Date | string | undefined | null): string => {
  if (!date) return 'Activity';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      if (typeof date === 'string') return date.split('T')[0];
      return 'Activity';
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  } catch {
    return 'Activity';
  }
};

/**
 * Generates a fast, lightweight fingerprint for binary data / Uint8Array to detect identical files.
 */
export const getBufferFingerprint = (bytes: Uint8Array): string => {
  const len = bytes.length;
  if (len === 0) return 'empty_0';
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(len / 64));
  for (let i = 0; i < len; i += step) {
    h = (h ^ bytes[i]) * 0x01000193;
  }
  return `${len}_${(h >>> 0).toString(16)}`;
};

/**
 * Computes a standardized physiological/session signature for an activity to prevent duplicate entries.
 * Compares start timestamp (bucketed to 5s), duration (seconds), and distance (meters).
 */
export const getActivitySignature = (activity: {
  startTime?: string | Date;
  fullSummary?: any;
  date?: string;
  duration?: number;
  distance?: number;
  avgPower?: number;
  garminActivityId?: number;
  originalFileName?: string;
}): string => {
  if (activity.garminActivityId) {
    return `garmin_${activity.garminActivityId}`;
  }

  const rawStart = activity.startTime || activity.fullSummary?.startTime;
  const startTime = rawStart ? new Date(rawStart).getTime() : null;
  const durationSec = Math.round((activity.duration || activity.fullSummary?.duration || 0) / 1000);
  const distanceM = Math.round(activity.distance || activity.fullSummary?.distance || 0);
  const powerW = Math.round(activity.avgPower || activity.fullSummary?.avgPower || 0);

  if (startTime && !isNaN(startTime)) {
    // 5-second bucket to account for potential 1-2s parser start time differences
    const roundedTime = Math.round(startTime / 5000) * 5000;
    return `st_${roundedTime}_${durationSec}_${distanceM}`;
  }

  if (activity.date) {
    return `date_${activity.date}_${durationSec}_${distanceM}_${powerW}`;
  }

  return `name_${activity.originalFileName || ''}_${durationSec}_${distanceM}`;
};
