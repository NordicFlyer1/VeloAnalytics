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
