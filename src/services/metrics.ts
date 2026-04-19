import { CyclingDataPoint, ActivitySummary, Lap, Zone, ZoneDistribution, ZoneDefinition, PowerCurvePoint, PMCDataPoint } from '../types';

export const DEFAULT_FALLBACK_CP = 125;
export const DEFAULT_FALLBACK_WPRIME = 15000; // 15kJ

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
 * Calculates W' balance over time using a fatigue-adjusted Skiba model.
 * The model accounts for the physiological reality that recovery slows and 
 * maximum anaerobic capacity (W') decreases as total work (kJ) accumulates during long rides.
 */
export function calculateWPrimeBalance(data: CyclingDataPoint[], cp: number, wPrime: number): number[] {
  if (data.length === 0 || cp <= 0 || wPrime <= 0) return [];

  const wPrimeBal: number[] = new Array(data.length);
  wPrimeBal[0] = wPrime;
  
  let cumulativeWorkKJ = 0;
  
  // Fatigue sensitivity coefficients
  // tauFactor: Increases tau (slowing recovery) by approx 15% per 1000kJ
  const TAU_FATIGUE_COEFF = 0.15;
  // capacityFactor: Decreases effective W' ceiling by approx 5% per 1000kJ
  const CAPACITY_FATIGUE_COEFF = 0.05;

  for (let i = 1; i < data.length; i++) {
    const p = data[i].power || 0;
    const prevWBal = wPrimeBal[i - 1];
    
    // Calculate time difference
    let dt = 1;
    if (data[i].timestamp && data[i-1].timestamp) {
      dt = (data[i].timestamp.getTime() - data[i-1].timestamp.getTime()) / 1000;
    }
    if (dt <= 0) dt = 1;

    // Accumulate total work in kJ
    cumulativeWorkKJ += (p * dt) / 1000;
    
    // Calculate fatigue factors based on current cumulative work
    const workInThousands = cumulativeWorkKJ / 1000;
    const tauMultiplier = 1 + (TAU_FATIGUE_COEFF * workInThousands);
    const capacityMultiplier = Math.max(0.5, 1 - (CAPACITY_FATIGUE_COEFF * workInThousands));
    
    const currentWPrimeCeiling = wPrime * capacityMultiplier;

    if (p > cp) {
      // Depletion
      wPrimeBal[i] = prevWBal - (p - cp) * dt;
    } else {
      // Recovery
      // Base Skiba (2012) recovery constant tau
      const baseTau = 546 * Math.exp(-0.01 * (cp - p)) + 316;
      
      // Apply fatigue factor to tau (recovery becomes slower as ride progresses)
      const adjustedTau = baseTau * tauMultiplier;
      
      // Recover toward the dynamic ceiling (which shrinks as ride progresses)
      wPrimeBal[i] = prevWBal + (currentWPrimeCeiling - prevWBal) * (1 - Math.exp(-dt / adjustedTau));
    }

    // Clamp to [0, currentWPrimeCeiling]
    if (wPrimeBal[i] < 0) wPrimeBal[i] = 0;
    if (wPrimeBal[i] > currentWPrimeCeiling) wPrimeBal[i] = currentWPrimeCeiling;
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
 * Default Coggan-style power zones based on Critical Power (CP).
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
 * Converts zone definitions (percentages) to absolute zones based on a threshold value (CP or MaxHR).
 */
export function getZonesFromDefinitions(definitions: ZoneDefinition[], threshold: number): Zone[] {
  const safeThreshold = isNaN(threshold) ? 0 : threshold;
  return definitions.map(d => ({
    name: d.name,
    min: (d.percentMin / 100) * safeThreshold,
    max: d.percentMax === 999 ? 9999 : (d.percentMax / 100) * safeThreshold,
    color: d.color
  }));
}

/**
 * Default Coggan-style power zones based on Critical Power (CP).
 */
export function getPowerZones(cp: number): Zone[] {
  return getZonesFromDefinitions(DEFAULT_POWER_ZONES, cp);
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
  const xPower = calculateXPower(points);
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
    xPower,
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
 * Calculates xPower (open-source alternative to NP)
 * xPower uses a 25s Exponentially Weighted Moving Average (EWMA)
 * xPower = 4th root of (average of (25s EWMA power values ^ 4))
 */
export function calculateXPower(data: CyclingDataPoint[]): number | undefined {
  const powers = data.map(d => d.power || 0);
  if (powers.length < 25) return undefined;

  const alpha = 1 / 25; // 25-second time constant
  let ema = powers[0];
  const emaValues: number[] = [Math.pow(ema, 4)];

  for (let i = 1; i < powers.length; i++) {
    ema = (powers[i] * alpha) + (ema * (1 - alpha));
    emaValues.push(Math.pow(ema, 4));
  }

  const avgOfQuads = emaValues.reduce((a, b) => a + b, 0) / emaValues.length;
  const result = Math.pow(avgOfQuads, 0.25);
  return isNaN(result) ? undefined : result;
}

/**
 * Calculates Relative Intensity (RI), an open-source alternative to Intensity Factor (IF).
 */
export function calculateRI(xPower: number, cp: number): number {
  if (cp <= 0) return 0;
  return xPower / cp;
}

/**
 * Calculates BikeScore, an open-source alternative to training stress metrics.
 */
export function calculateBikeScore(durationSec: number, xPower: number, ri: number, cp: number): number {
  if (cp <= 0) return 0;
  return (durationSec * xPower * ri) / (cp * 3600) * 100;
}

/**
 * Calculates the Performance Management Chart (PMC) metrics: LTS, STS, and SB.
 */
export function calculatePMC(history: { date: string, bikeScore: number }[]): PMCDataPoint[] {
  if (history.length === 0) return [];

  // Sort history by date
  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const pmc: PMCDataPoint[] = [];
  let currentLTS = 0;
  let currentSTS = 0;

  // Constants for exponentially weighted moving averages
  const ltsDays = 42;
  const stsDays = 7;
  const ltsLambda = 1 / ltsDays;
  const stsLambda = 1 / stsDays;

  // We need to fill in gaps between activities
  const firstDate = new Date(sortedHistory[0].date);
  const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
  const dayCount = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const dailyScores: Record<string, number> = {};
  sortedHistory.forEach(h => {
    dailyScores[h.date] = (dailyScores[h.date] || 0) + h.bikeScore;
  });

  for (let i = 0; i < dayCount; i++) {
    const currentDate = new Date(firstDate);
    currentDate.setDate(firstDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const todaysScore = dailyScores[dateStr] || 0;

    // LTS(today) = LTS(yesterday) + (Score(today) - LTS(yesterday)) * lambda
    currentLTS = currentLTS + (todaysScore - currentLTS) * ltsLambda;
    currentSTS = currentSTS + (todaysScore - currentSTS) * stsLambda;

    pmc.push({
      date: dateStr,
      bikeScore: todaysScore,
      lts: currentLTS,
      sts: currentSTS,
      sb: currentLTS - currentSTS
    });
  }

  return pmc;
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
 * Estimates CP as 95% of the best 20-minute power effort.
 */
export function estimateCP(data: CyclingDataPoint[]): number | null {
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

/**
 * Calculates Aerobic Decoupling (Pw:HR)
 * Compares the ratio of Power to Heart Rate in the first half vs the second half.
 * Decoupling % = ((Ratio1 - Ratio2) / Ratio1) * 100
 */
export function calculateAerobicDecoupling(data: CyclingDataPoint[]): number | undefined {
  const validPoints = data.filter(p => p.power !== undefined && p.heartRate !== undefined && p.heartRate > 0);
  if (validPoints.length < 600) return undefined; // Need at least 10 minutes of data

  const midIndex = Math.floor(validPoints.length / 2);
  const firstHalf = validPoints.slice(0, midIndex);
  const secondHalf = validPoints.slice(midIndex);

  const avgPower1 = firstHalf.reduce((a, b) => a + (b.power || 0), 0) / firstHalf.length;
  const avgHR1 = firstHalf.reduce((a, b) => a + (b.heartRate || 0), 0) / firstHalf.length;
  const ratio1 = avgPower1 / avgHR1;

  const avgPower2 = secondHalf.reduce((a, b) => a + (b.power || 0), 0) / secondHalf.length;
  const avgHR2 = secondHalf.reduce((a, b) => a + (b.heartRate || 0), 0) / secondHalf.length;
  const ratio2 = avgPower2 / avgHR2;

  if (ratio1 === 0) return 0;

  // Decoupling is typically expressed as (Ratio1 - Ratio2) / Ratio1
  // If Ratio2 is smaller (Power dropped or HR increased), decoupling is positive.
  return ((ratio1 - ratio2) / ratio1) * 100;
}
