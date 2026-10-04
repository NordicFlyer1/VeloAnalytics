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
  leftRightBalance?: number; // % Left (e.g. 48 means 48% Left / 52% Right)
  wPrimeBalance?: number;
  // Cycling Dynamics
  leftPco?: number; // Platform Center Offset in mm (-30 to +30)
  rightPco?: number; // Platform Center Offset in mm (-30 to +30)
  leftPowerPhaseStart?: number; // degrees 0-360
  leftPowerPhaseEnd?: number; // degrees 0-360
  leftPowerPhasePeakStart?: number; // degrees 0-360
  leftPowerPhasePeakEnd?: number; // degrees 0-360
  rightPowerPhaseStart?: number; // degrees 0-360
  rightPowerPhaseEnd?: number; // degrees 0-360
  rightPowerPhasePeakStart?: number; // degrees 0-360
  rightPowerPhasePeakEnd?: number; // degrees 0-360
  leftTorqueEffectiveness?: number; // %
  rightTorqueEffectiveness?: number; // %
  leftPedalSmoothness?: number; // %
  rightPedalSmoothness?: number; // %
  riderPosition?: 'seated' | 'standing'; // Rider position if recorded
  respirationRate?: number; // Breaths per minute
  stamina?: number; // Real-time stamina %
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

export interface CyclingDynamicsSummary {
  hasDynamics: boolean;
  hasPco: boolean;
  hasPowerPhase: boolean;
  avgLeftBalance?: number; // % Left (e.g. 49.2)
  avgRightBalance?: number; // % Right (e.g. 50.8)
  avgLeftPco?: number; // mm
  avgRightPco?: number; // mm
  avgLeftPowerPhase?: { start: number; end: number; peakStart: number; peakEnd: number };
  avgRightPowerPhase?: { start: number; end: number; peakStart: number; peakEnd: number };
  avgLeftTorqueEffectiveness?: number; // %
  avgRightTorqueEffectiveness?: number; // %
  avgLeftPedalSmoothness?: number; // %
  avgRightPedalSmoothness?: number; // %
  seatedSeconds?: number;
  standingSeconds?: number;
  seatedAvgPower?: number;
  standingAvgPower?: number;
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
  cyclingDynamics?: CyclingDynamicsSummary;
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
  isPredictive?: boolean;
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
  bikeId?: string; // Reference to equipment used
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

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'ollama' | 'lm-studio';

export interface AISettings {
  provider: AIProvider;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  groqApiKey: string;
  groqModel: string;
  ollamaUrl: string;
  ollamaModel: string;
  lmStudioUrl: string;
  lmStudioModel: string;
  systemPrompt: string;
  wellnessContextDays?: number;
  useExperimentalReadiness?: boolean;
  googleMapsApiKey?: string;
  openWeatherMapApiKey?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface SleepMetric {
  date: string; // YYYY-MM-DD
  score: number;
  restingHeartRate: number;
  readinessScore: number;
  pulseOx: number;
  respiration: number;
  hrvStatus: number;
  quality: string;
  duration: number; // minutes
  sleepNeed: number; // minutes
  bedtime: string;
  wakeTime: string;
}

export interface HRVMetric {
  date: string; // YYYY-MM-DD (canonical format)
  overnightHRV: number;
  baselineMin: number;
  baselineMax: number;
  sevenDayAvg: number;
}

export interface Equipment {
  id: string;
  name: string;
  bikeWeight: number;
  startingMileage: number; // in meters (stored)
  ridingPosition: RidingPosition;
  surfaceType: SurfaceType;
  isDefault: boolean;
  color?: string; // Visual tag
}
