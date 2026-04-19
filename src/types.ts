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
  wPrimeBalance?: number;
}

export interface Lap {
  id: number;
  startTime: Date;
  duration: number; // seconds
  distance: number; // meters
  avgPower?: number;
  maxPower?: number;
  xPower?: number;
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

export interface PowerCurvePoint {
  duration: number; // seconds
  power: number; // watts
  label: string; // e.g., "5s", "1m"
}

export interface ActivitySummary {
  name: string;
  startTime: Date;
  duration: number; // seconds
  distance: number; // meters
  avgPower?: number;
  maxPower?: number;
  xPower?: number;
  relativeIntensity?: number;
  bikeScore?: number;
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
  powerCurve?: PowerCurvePoint[];
  aerobicDecoupling?: number;
}

export interface PowerMetrics {
  cp: number;
  wPrime: number;
}

export interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  locationName: string;
}

export interface PMCDataPoint {
  date: string; // YYYY-MM-DD
  bikeScore: number;
  lts: number;
  sts: number;
  sb: number;
}

export interface HistoricalActivity {
  id: string;
  date: string;
  name: string;
  bikeScore: number;
  duration: number;
  distance?: number;
  avgPower?: number;
  maxPower?: number;
  xPower?: number;
  relativeIntensity?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  maxCadence?: number;
  avgSpeed?: number;
  totalAscent?: number;
  work?: number;
  aerobicDecoupling?: number;
  cp?: number;
  powerCurve?: PowerCurvePoint[];
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

export type RidingPosition = 'tops' | 'hoods' | 'drops';
export type SurfaceType = 'road' | 'gravel' | 'mtb';
