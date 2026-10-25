export interface GarminTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

export interface GarminCachedToken {
  token: string;
  expiresAt: number; // Unix epoch ms
}

export interface GarminSettings {
  apiKey: string;
  syncActivities: boolean;
  syncSleep: boolean;
  syncHrv: boolean;
  syncHealth?: boolean;
  activityLimit?: number;
  healthDaysBack?: number;
  lastSyncTimestamp?: number;
  autoSyncOnLaunch?: boolean;
}

export interface GarminActivitySummary {
  activityId: number;
  activityName: string;
  startTimeLocal: string;
  startTimeGMT: string;
  activityType: {
    typeId: number;
    typeKey: string;
  };
  distance?: number; // meters
  duration?: number; // seconds
  elevationGain?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  averageHR?: number;
  maxHR?: number;
  averagePower?: number;
  maxPower?: number;
}

export interface GarminUserProfile {
  userName?: string;
  displayName?: string;
  userProfileId?: number;
}

export interface GarminConnectionStatus {
  isConnected: boolean;
  isTesting: boolean;
  error?: string | null;
  profile?: GarminUserProfile | null;
}

export interface GarminSyncProgress {
  phase: 'idle' | 'discovering' | 'downloading' | 'processing' | 'done' | 'error';
  current?: number;
  total?: number;
  activityName?: string;
  message: string;
}

export interface GarminSyncResult {
  activitiesSynced: number;
  activitiesSkipped: number;
  healthDaysSynced: number;
  errors: string[];
}

export interface GarminDailySleepDTO {
  calendarDate: string;
  sleepTimeSeconds?: number;
  napTimeSeconds?: number;
  sleepStartTimestampGMT?: number;
  sleepEndTimestampGMT?: number;
  deepSleepSeconds?: number;
  lightSleepSeconds?: number;
  remSleepSeconds?: number;
  awakeSleepSeconds?: number;
  restingHeartRate?: number;
  sleepScores?: {
    overall?: {
      value?: number;
      qualifierKey?: string;
    };
  };
  sleepScore?: number;
  averageSpO2Value?: number;
  averageRespirationValue?: number;
  averageOvernightHrv?: number;
  sleepNeed?: {
    type?: string;
    value?: number;
  } | number;
}

export interface GarminDailyHrvDTO {
  calendarDate: string;
  weeklyAvg?: number;
  lastNightAvg?: number;
  lastNight5MinHigh?: number;
  baseline?: {
    lowUpper?: number;
    balancedLow?: number;
    balancedUpper?: number;
  };
  status?: string;
}


