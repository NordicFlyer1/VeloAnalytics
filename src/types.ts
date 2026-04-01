export interface CyclingDataPoint {
  timestamp: Date;
  power?: number;
  heartRate?: number;
  cadence?: number;
  speed?: number;
  distance?: number;
  altitude?: number;
  latitude?: number;
  longitude?: number;
  slope?: number;
  temperature?: number;
  leftRightBalance?: number;
}

export interface Lap {
  id: number;
  startTime: Date;
  duration: number; // seconds
  distance: number; // meters
  avgPower?: number;
  maxPower?: number;
  normalizedPower?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  maxCadence?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  totalAscent?: number;
  avgTemperature?: number;
}

export interface ZoneDefinition {
  name: string;
  percentMin: number;
  percentMax: number;
  color: string;
}

export interface Zone {
  name: string;
  min: number;
  max: number;
  color: string;
}

export interface ZoneDistribution {
  name: string;
  seconds: number;
  percentage: number;
  color: string;
}

export interface ActivitySummary {
  name: string;
  startTime: Date;
  duration: number; // seconds
  distance: number; // meters
  avgPower?: number;
  maxPower?: number;
  normalizedPower?: number;
  intensityFactor?: number;
  tss?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  maxCadence?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  totalAscent?: number;
  avgTemperature?: number;
  work?: number; // kJ
  laps?: Lap[];
  powerZones?: ZoneDistribution[];
  hrZones?: ZoneDistribution[];
}

export interface PowerMetrics {
  cp: number;
  wPrime: number;
}

export interface PMCDataPoint {
  date: string; // YYYY-MM-DD
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface HistoricalActivity {
  id: string;
  date: string;
  name: string;
  tss: number;
  duration: number;
  distance?: number;
  avgPower?: number;
  maxPower?: number;
  normalizedPower?: number;
  intensityFactor?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  avgSpeed?: number;
  totalAscent?: number;
  work?: number;
  ftp?: number;
  fullSummary?: ActivitySummary;
  fullData?: CyclingDataPoint[];
  originalFile?: File | Blob;
  originalFileName?: string;
}

export interface FileStatus {
  id: string;
  name: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  file: File;
  summary?: ActivitySummary;
  data?: CyclingDataPoint[];
  historyId?: string;
}
