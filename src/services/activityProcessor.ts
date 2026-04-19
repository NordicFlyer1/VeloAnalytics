import { 
  calculateSlope, 
  calculateXPower, 
  calculateRI, 
  calculateBikeScore, 
  calculateLapSummary, 
  calculateZones, 
  getZonesFromDefinitions, 
  calculateAerobicDecoupling,
  DEFAULT_FALLBACK_CP,
  DEFAULT_FALLBACK_WPRIME
} from './metrics';
import { CyclingDataPoint, ActivitySummary, Lap, ZoneDefinition } from '../types';

export interface ProcessingContext {
  cp: number;
  maxHR: number;
  manualCP: number | null;
  manualWPrime: number | null;
  cpMode: 'manual' | 'estimated';
  powerZoneDefinitions: ZoneDefinition[];
  hrZoneDefinitions: ZoneDefinition[];
  workerCalculatePowerCurve: (points: CyclingDataPoint[]) => Promise<any>;
  workerEstimateCPWPrime: (points: CyclingDataPoint[]) => Promise<any>;
  workerCalculateWPrimeBalance: (points: CyclingDataPoint[], cp: number, wPrime: number) => Promise<number[]>;
}

export async function processActivityData(
  points: CyclingDataPoint[], 
  fileName: string, 
  ctx: ProcessingContext,
  lapData?: any[]
): Promise<{ summary: ActivitySummary; cpWPrimeResult: any }> {
  if (points.length === 0) throw new Error("No data points");

  // Calculate slope for each point
  for (let i = 1; i < points.length; i++) {
    points[i].slope = calculateSlope(points[i - 1], points[i]);
  }

  const powers = points.map(p => p.power || 0);
  const cadences = points.map(p => p.cadence || 0).filter(c => c > 0);
  const speeds = points.map(p => p.speed || 0);
  const heartRates = points.map(p => p.heartRate || 0).filter(h => h > 0);
  const temperatures = points.map(p => p.temperature || 0).filter(t => t !== 0);
  
  const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
  const maxPower = Math.max(...powers);
  const xPower = calculateXPower(points);
  const duration = (points[points.length - 1].timestamp.getTime() - points[0].timestamp.getTime()) / 1000;
  const distance = points[points.length - 1].distance || 0;
  
  const relativeIntensity = xPower ? calculateRI(xPower, ctx.cp) : undefined;
  const bikeScore = (xPower && relativeIntensity) ? calculateBikeScore(duration, xPower, relativeIntensity, ctx.cp) : undefined;
  const work = (avgPower * duration) / 1000;

  // Total ascent calculation
  let totalAscent = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].altitude !== undefined && points[i - 1].altitude !== undefined) {
      const diff = points[i].altitude! - points[i - 1].altitude!;
      if (diff > 0) totalAscent += diff;
    }
  }

  // Process Laps
  let laps: Lap[] = [];
  if (lapData && lapData.length > 0) {
    laps = lapData.map((l, idx) => {
      const lapStartTime = l.start_time instanceof Date ? l.start_time : new Date(l.start_time);
      const lapEndTime = new Date(lapStartTime.getTime() + (l.total_elapsed_time || 0) * 1000);
      
      const lapPoints = points.filter(p => 
        p.timestamp >= lapStartTime && 
        p.timestamp <= lapEndTime
      );
      if (lapPoints.length > 0) {
        return calculateLapSummary(lapPoints, idx + 1);
      }
      return {
        id: idx + 1,
        startTime: new Date(l.start_time),
        duration: l.total_elapsed_time,
        distance: l.total_distance,
        avgPower: l.avg_power,
        maxPower: l.max_power,
        avgHeartRate: l.avg_heart_rate,
        avgCadence: l.avg_cadence,
        avgSpeed: l.avg_speed,
        totalAscent: l.total_ascent
      };
    });
  } else {
    // Default single lap if no lap data provided
    laps = [calculateLapSummary(points, 1)];
  }

  // Zone Calculations
  const pZones = calculateZones(powers, getZonesFromDefinitions(ctx.powerZoneDefinitions, ctx.cp));
  const hZones = heartRates.length > 0 ? calculateZones(heartRates, getZonesFromDefinitions(ctx.hrZoneDefinitions, ctx.maxHR)) : undefined;
  
  // Heavy calculations moved to worker
  const powerCurve = await ctx.workerCalculatePowerCurve(points);

  // Calculate W' Balance
  const cpWPrimeResult = await ctx.workerEstimateCPWPrime(points);
  
  // Logic Guard: Respect cpMode, Fallback if Manual is missing/0
  let effectiveCP: number;
  let effectiveWPrime: number;

  if (ctx.cpMode === 'manual') {
    effectiveCP = (ctx.manualCP && ctx.manualCP > 0) ? ctx.manualCP : (cpWPrimeResult?.cp || DEFAULT_FALLBACK_CP);
    effectiveWPrime = (ctx.manualWPrime && ctx.manualWPrime > 0) ? ctx.manualWPrime : (cpWPrimeResult?.wPrime || DEFAULT_FALLBACK_WPRIME);
  } else {
    effectiveCP = cpWPrimeResult?.cp || DEFAULT_FALLBACK_CP;
    effectiveWPrime = cpWPrimeResult?.wPrime || DEFAULT_FALLBACK_WPRIME;
  }
  
  if (effectiveCP > 0 && effectiveWPrime > 0) {
    const wBal = await ctx.workerCalculateWPrimeBalance(points, effectiveCP, effectiveWPrime);
    points.forEach((p, i) => {
      p.wPrimeBalance = wBal[i];
    });
  }

  const summary: ActivitySummary = {
    name: fileName.replace(/\.[^/.]+$/, ""),
    startTime: points[0].timestamp,
    duration,
    distance,
    avgPower,
    maxPower,
    xPower,
    relativeIntensity,
    bikeScore,
    avgHeartRate: heartRates.length > 0 ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : undefined,
    maxHeartRate: heartRates.length > 0 ? Math.max(...heartRates) : undefined,
    avgCadence: cadences.length > 0 ? cadences.reduce((a, b) => a + b, 0) / cadences.length : undefined,
    maxCadence: cadences.length > 0 ? Math.max(...cadences) : undefined,
    avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : undefined,
    maxSpeed: speeds.length > 0 ? Math.max(...speeds) : undefined,
    totalAscent,
    avgTemperature: temperatures.length > 0 ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length : undefined,
    work,
    laps,
    powerZones: pZones,
    hrZones: hZones,
    powerCurve,
    aerobicDecoupling: calculateAerobicDecoupling(points),
  };

  return { summary, cpWPrimeResult };
}
