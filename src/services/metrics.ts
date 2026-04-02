import { CyclingDataPoint, ActivitySummary, Lap, Zone, ZoneDistribution, ZoneDefinition, PowerCurvePoint } from '../types';

/**
 * Calculates the best average power for various durations.
 */
export function calculatePowerCurve(data: CyclingDataPoint[]): PowerCurvePoint[] {
  const powers = data.map(d => d.power || 0);
  if (powers.length === 0) return [];

  const durations = [
    { s: 1, label: '1s' },
    { s: 2, label: '2s' },
    { s: 5, label: '5s' },
    { s: 10, label: '10s' },
    { s: 20, label: '20s' },
    { s: 30, label: '30s' },
    { s: 60, label: '1m' },
    { s: 120, label: '2m' },
    { s: 300, label: '5m' },
    { s: 600, label: '10m' },
    { s: 1200, label: '20m' },
    { s: 1800, label: '30m' },
    { s: 3600, label: '60m' },
  ];

  return durations
    .filter(d => powers.length >= d.s)
    .map(d => {
      let maxAvg = 0;
      let currentSum = 0;
      
      // Initial window
      for (let i = 0; i < d.s; i++) {
        currentSum += powers[i];
      }
      maxAvg = currentSum / d.s;
      
      // Sliding window
      for (let i = d.s; i < powers.length; i++) {
        currentSum = currentSum - powers[i - d.s] + powers[i];
        const avg = currentSum / d.s;
        if (avg > maxAvg) maxAvg = avg;
      }
      
      return { 
        duration: d.s, 
        power: Math.round(maxAvg), 
        label: d.label 
      };
    });
}

/**
 * Calculates W' balance over time using the Skiba model.
 */
export function calculateWPrimeBalance(data: CyclingDataPoint[], cp: number, wPrime: number): number[] {
  if (data.length === 0 || cp <= 0 || wPrime <= 0) return [];

  const wPrimeBal: number[] = new Array(data.length);
  wPrimeBal[0] = wPrime;

  for (let i = 1; i < data.length; i++) {
    const p = data[i].power || 0;
    const prevWBal = wPrimeBal[i - 1];
    
    // Calculate time difference
    let dt = 1;
    if (data[i].timestamp && data[i-1].timestamp) {
      dt = (data[i].timestamp.getTime() - data[i-1].timestamp.getTime()) / 1000;
    }
    if (dt <= 0) dt = 1;

    if (p > cp) {
      // Depletion
      wPrimeBal[i] = prevWBal - (p - cp) * dt;
    } else {
      // Recovery
      // Skiba (2012) recovery constant tau
      const tau = 546 * Math.exp(-0.01 * (cp - p)) + 316;
      wPrimeBal[i] = prevWBal + (wPrime - prevWBal) * (1 - Math.exp(-dt / tau));
    }

    // Clamp to [0, wPrime]
    if (wPrimeBal[i] < 0) wPrimeBal[i] = 0;
    if (wPrimeBal[i] > wPrime) wPrimeBal[i] = wPrime;
  }

  return wPrimeBal;
}

/**
 * Calculates time spent in each zone.
 */
export function calculateZones(values: number[], zones: Zone[]): ZoneDistribution[] {
  const distribution: Record<string, number> = {};
  zones.forEach(z => distribution[z.name] = 0);

  values.forEach(v => {
    const zone = zones.find(z => v >= z.min && v < z.max);
    if (zone) {
      distribution[zone.name]++;
    }
  });

  const total = values.length;
  return zones.map(z => ({
    name: z.name,
    seconds: distribution[z.name],
    percentage: total > 0 ? (distribution[z.name] / total) * 100 : 0,
    color: z.color
  }));
}

/**
 * Default Coggan-style power zones based on FTP.
 */
export const DEFAULT_POWER_ZONES: ZoneDefinition[] = [
  { name: 'Z1 Active Recovery', percentMin: 0, percentMax: 55, color: '#94a3b8' },
  { name: 'Z2 Endurance', percentMin: 55, percentMax: 75, color: '#22c55e' },
  { name: 'Z3 Tempo', percentMin: 75, percentMax: 90, color: '#eab308' },
  { name: 'Z4 Lactate Threshold', percentMin: 90, percentMax: 105, color: '#f97316' },
  { name: 'Z5 VO2 Max', percentMin: 105, percentMax: 120, color: '#ef4444' },
  { name: 'Z6 Anaerobic Capacity', percentMin: 120, percentMax: 150, color: '#a855f7' },
  { name: 'Z7 Neuromuscular Power', percentMin: 150, percentMax: 999, color: '#ec4899' },
];

/**
 * Default HR zones based on Max HR.
 */
export const DEFAULT_HR_ZONES: ZoneDefinition[] = [
  { name: 'Z1 Recovery', percentMin: 0, percentMax: 60, color: '#94a3b8' },
  { name: 'Z2 Aerobic', percentMin: 60, percentMax: 70, color: '#22c55e' },
  { name: 'Z3 Tempo', percentMin: 70, percentMax: 80, color: '#eab308' },
  { name: 'Z4 Threshold', percentMin: 80, percentMax: 90, color: '#f97316' },
  { name: 'Z5 Anaerobic', percentMin: 90, percentMax: 100, color: '#ef4444' },
];

/**
 * Converts zone definitions (percentages) to absolute zones based on a threshold value (FTP or MaxHR).
 */
export function getZonesFromDefinitions(definitions: ZoneDefinition[], threshold: number): Zone[] {
  return definitions.map(d => ({
    name: d.name,
    min: (d.percentMin / 100) * threshold,
    max: d.percentMax === 999 ? 9999 : (d.percentMax / 100) * threshold,
    color: d.color
  }));
}

/**
 * Default Coggan-style power zones based on FTP.
 */
export function getPowerZones(ftp: number): Zone[] {
  return getZonesFromDefinitions(DEFAULT_POWER_ZONES, ftp);
}

/**
 * Default HR zones based on Max HR.
 */
export function getHRZones(maxHR: number): Zone[] {
  return getZonesFromDefinitions(DEFAULT_HR_ZONES, maxHR);
}

/**
 * Calculates summary metrics for a specific segment of data (a lap).
 */
export function calculateLapSummary(points: CyclingDataPoint[], lapId: number): Lap {
  const powers = points.map(p => p.power || 0);
  const cadences = points.map(p => p.cadence || 0).filter(c => c > 0);
  const speeds = points.map(p => p.speed || 0);
  const heartRates = points.map(p => p.heartRate || 0).filter(h => h > 0);
  const temperatures = points.map(p => p.temperature || 0).filter(t => t !== 0);
  
  const avgPower = powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : 0;
  const maxPower = powers.length > 0 ? Math.max(...powers) : 0;
  const np = calculateNP(points);
  const duration = (points[points.length - 1].timestamp.getTime() - points[0].timestamp.getTime()) / 1000;
  const distance = (points[points.length - 1].distance || 0) - (points[0].distance || 0);
  
  let totalAscent = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].altitude !== undefined && points[i - 1].altitude !== undefined) {
      const diff = points[i].altitude! - points[i - 1].altitude!;
      if (diff > 0) totalAscent += diff;
    }
  }

  return {
    id: lapId,
    startTime: points[0].timestamp,
    duration,
    distance,
    avgPower,
    maxPower,
    normalizedPower: np,
    avgHeartRate: heartRates.length > 0 ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : undefined,
    maxHeartRate: heartRates.length > 0 ? Math.max(...heartRates) : undefined,
    avgCadence: cadences.length > 0 ? cadences.reduce((a, b) => a + b, 0) / cadences.length : undefined,
    maxCadence: cadences.length > 0 ? Math.max(...cadences) : undefined,
    avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : undefined,
    maxSpeed: speeds.length > 0 ? Math.max(...speeds) : undefined,
    totalAscent,
    avgTemperature: temperatures.length > 0 ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length : undefined,
  };
}

/**
 * Calculates Normalized Power (NP)
 * NP = 4th root of (average of (30s rolling average power values ^ 4))
 */
export function calculateNP(data: CyclingDataPoint[]): number | undefined {
  const powers = data.map(d => d.power || 0);
  if (powers.length < 30) return undefined;

  const rollingAverages: number[] = [];
  for (let i = 29; i < powers.length; i++) {
    const window = powers.slice(i - 29, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / 30;
    rollingAverages.push(Math.pow(avg, 4));
  }

  const avgOfQuads = rollingAverages.reduce((a, b) => a + b, 0) / rollingAverages.length;
  return Math.pow(avgOfQuads, 0.25);
}

export function calculateIF(np: number, ftp: number): number {
  return np / ftp;
}

export function calculateTSS(durationSec: number, np: number, ifFactor: number, ftp: number): number {
  return (durationSec * np * ifFactor) / (ftp * 36) ; // Simplified from (s * NP * IF) / (FTP * 3600) * 100
}

/**
 * Calculates slope (gradient) between two points as a percentage.
 */
export function calculateSlope(point1: CyclingDataPoint, point2: CyclingDataPoint): number {
  if (point1.altitude === undefined || point2.altitude === undefined) return 0;
  if (point1.distance === undefined || point2.distance === undefined) return 0;
  
  const distDiff = point2.distance - point1.distance;
  if (distDiff <= 0) return 0;
  
  const altDiff = point2.altitude - point1.altitude;
  return (altDiff / distDiff) * 100;
}

/**
 * Estimates CP and W' using the 2-parameter linear model: Work = CP * t + W'
 * We use the best efforts for various durations to fit the line.
 */
export function estimateCPWPrime(data: CyclingDataPoint[]): { cp: number; wPrime: number } | null {
  const powers = data.map(d => d.power || 0);
  if (powers.length === 0) return null;

  // Durations to check (in seconds)
  const durations = [60, 180, 300, 600, 1200]; 
  const bestEfforts: { t: number; w: number }[] = [];

  durations.forEach(t => {
    if (powers.length < t) return;
    let maxAvg = 0;
    for (let i = t; i < powers.length; i++) {
      const avg = powers.slice(i - t, i).reduce((a, b) => a + b, 0) / t;
      if (avg > maxAvg) maxAvg = avg;
    }
    if (maxAvg > 0) {
      bestEfforts.push({ t, w: maxAvg * t }); // Work = Power * Time
    }
  });

  if (bestEfforts.length < 2) return null;

  // Simple linear regression: W = CP * t + W'
  // y = mx + b where y = W, x = t, m = CP, b = W'
  const n = bestEfforts.length;
  const sumX = bestEfforts.reduce((acc, val) => acc + val.t, 0);
  const sumY = bestEfforts.reduce((acc, val) => acc + val.w, 0);
  const sumXY = bestEfforts.reduce((acc, val) => acc + val.t * val.w, 0);
  const sumX2 = bestEfforts.reduce((acc, val) => acc + val.t * val.t, 0);

  const cp = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const wPrime = (sumY - cp * sumX) / n;

  return { cp: Math.max(0, cp), wPrime: Math.max(0, wPrime) };
}

/**
 * Estimates FTP as 95% of the best 20-minute power effort.
 */
export function estimateFTP(data: CyclingDataPoint[]): number | null {
  const powers = data.map(d => d.power || 0);
  const duration = 1200; // 20 minutes in seconds
  
  if (powers.length < duration) return null;
  
  let maxAvg = 0;
  let currentSum = 0;
  
  // Initial window
  for (let i = 0; i < duration; i++) {
    currentSum += powers[i];
  }
  maxAvg = currentSum / duration;
  
  // Sliding window
  for (let i = duration; i < powers.length; i++) {
    currentSum = currentSum - powers[i - duration] + powers[i];
    const avg = currentSum / duration;
    if (avg > maxAvg) maxAvg = avg;
  }
  
  return Math.round(maxAvg * 0.95);
}
