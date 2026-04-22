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
  DEFAULT_FALLBACK_WPRIME,
  calculateVirtualPower,
  CDA_VALUES,
  CRR_VALUES
} from './metrics';
import { CyclingDataPoint, ActivitySummary, Lap, ZoneDefinition, RidingPosition, SurfaceType } from '../types';

export interface ProcessingContext {
  cp: number;
  maxHR: number;
  manualCP: number | null;
  manualWPrime: number | null;
  cpMode: 'manual' | 'estimated';
  userWeight: number | null;
  weightUnit: 'kg' | 'lbs';
  bikeWeight: number;
  enableVirtualPower: boolean;
  ridingPosition: RidingPosition;
  surfaceType: SurfaceType;
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

  // Inject Virtual Power if enabled and data is missing
  // This must happen BEFORE other power-based metrics are calculated
  if (ctx.enableVirtualPower) {
    const hasExistingPower = points.some(p => (p.power || 0) > 0);
    
    // Only calculate if the file doesn't already have power data
    if (!hasExistingPower) {
      // WEIGHT CONVERSION: Physics formula requires KG
      let riderWeight = ctx.userWeight || 75; 
      if (ctx.weightUnit === 'lbs') {
        riderWeight = riderWeight / 2.20462;
      }
      const totalWeight = riderWeight + ctx.bikeWeight;
      const cda = CDA_VALUES[ctx.ridingPosition];
      const crr = CRR_VALUES[ctx.surfaceType];

      // Slope smoothing: Use a 5-point moving average for grade calculation to prevent spikes from GPS noise
      const windowSize = 5;
      for (let i = 0; i < points.length; i++) {
        let sumSlope = 0;
        let count = 0;
        for (let j = Math.max(0, i - windowSize); j <= i; j++) {
          sumSlope += points[j].slope || 0;
          count++;
        }
        const smoothedSlope = sumSlope / count;
        
        // Clamp grade to reasonable physics limits (+/- 25%)
        const gradeFraction = Math.max(-0.25, Math.min(0.25, smoothedSlope / 100));
        
        const speedMS = points[i].speed || 0;
        points[i].power = calculateVirtualPower(speedMS, gradeFraction, totalWeight, cda, crr);
      }
      
      // Ensure first point has something if speed exists
      if (points.length > 0 && points[0].power === undefined) {
        points[0].power = 0;
      }
    }
  }

  const powers = points.map(p => p.power || 0);
  const cadences = points.map(p => p.cadence || 0).filter(c => c > 0);
  const speeds = points.map(p => p.speed || 0);
  const heartRates = points.map(p => p.heartRate || 0).filter(h => h > 0);
  const temperatures = points.map(p => p.temperature || 0).filter(t => t !== 0);
  
  const avgPower = powers.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / powers.length;
  const maxPower = Math.max(...powers.filter(p => Number.isFinite(p)));
  const xPower = calculateXPower(points);
  
  const startTime = points[0].timestamp.getTime();
  const endTime = points[points.length - 1].timestamp.getTime();
  const durationCount = (endTime - startTime) / 1000;
  const safeDuration = Number.isFinite(durationCount) ? durationCount : 0;
  const distance = points[points.length - 1].distance || 0;
  
  const safeCP = (ctx.cp && ctx.cp > 0) ? ctx.cp : 125;
  const relativeIntensity = xPower !== undefined ? calculateRI(xPower, safeCP) : undefined;
  const bikeScore = (xPower !== undefined && relativeIntensity !== undefined) ? calculateBikeScore(safeDuration, xPower, relativeIntensity, safeCP) : undefined;
  const work = (avgPower * safeDuration) / 1000;

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
    duration: safeDuration,
    distance,
    avgPower,
    maxPower,
    xPower,
    relativeIntensity,
    bikeScore,
    avgHeartRate: heartRates.length > 0 ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : undefined,
    maxHeartRate: heartRates.length > 0 ? Math.max(...heartRates) : undefined,
    avgCadence: cadences.length > 0 ? cadences.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / cadences.length : undefined,
    maxCadence: cadences.length > 0 ? Math.max(...cadences.filter(c => Number.isFinite(c))) : undefined,
    avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / speeds.length : undefined,
    maxSpeed: speeds.length > 0 ? Math.max(...speeds.filter(s => Number.isFinite(s))) : undefined,
    totalAscent,
    avgTemperature: temperatures.length > 0 ? temperatures.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / temperatures.length : undefined,
    work,
    laps,
    powerZones: pZones,
    hrZones: hZones,
    powerCurve,
    aerobicDecoupling: calculateAerobicDecoupling(points),
  };

  return { summary, cpWPrimeResult };
}
