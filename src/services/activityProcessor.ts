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
import { circularMean } from '../lib/csvParser';

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
        
        const speedKMH = points[i].speed || 0;
        const speedMS = speedKMH / 3.6;
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
  
  const safeCP = (ctx.cp && ctx.cp > 0) ? ctx.cp : 250;
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

  // Calculate Cycling Dynamics aggregates if present
  let cyclingDynamics = undefined;
  const pedalingPoints = points.filter(p => (p.cadence !== undefined && p.cadence > 0) || (p.power !== undefined && p.power > 0));
  const activePoints = pedalingPoints.length > 0 ? pedalingPoints : points;

  const pointsWithBalance = activePoints.filter(p => typeof p.leftRightBalance === 'number' && Number.isFinite(p.leftRightBalance) && p.leftRightBalance >= 0 && p.leftRightBalance <= 100);
  const pointsWithPco = activePoints.filter(p => typeof p.leftPco === 'number' || typeof p.rightPco === 'number');
  const pointsWithPowerPhase = activePoints.filter(p => typeof p.leftPowerPhaseStart === 'number' || typeof p.rightPowerPhaseStart === 'number');
  const pointsWithTe = activePoints.filter(p => typeof p.leftTorqueEffectiveness === 'number' || typeof p.rightTorqueEffectiveness === 'number');
  const pointsWithPosition = points.filter(p => p.riderPosition !== undefined);

  const hasDynamics = pointsWithBalance.length > 0 || pointsWithPco.length > 0 || pointsWithPowerPhase.length > 0 || pointsWithTe.length > 0 || pointsWithPosition.length > 0;

  if (hasDynamics) {
    const avgLeftBal = pointsWithBalance.length > 0 
      ? pointsWithBalance.reduce((acc, p) => acc + (p.leftRightBalance || 50), 0) / pointsWithBalance.length 
      : undefined;
    const avgRightBal = avgLeftBal !== undefined ? 100 - avgLeftBal : undefined;

    const leftPcos = activePoints.map(p => p.leftPco).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const rightPcos = activePoints.map(p => p.rightPco).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const avgLeftPco = leftPcos.length > 0 ? leftPcos.reduce((a, b) => a + b, 0) / leftPcos.length : undefined;
    const avgRightPco = rightPcos.length > 0 ? rightPcos.reduce((a, b) => a + b, 0) / rightPcos.length : undefined;

    // Helper to calculate circular mean for pedal angles (vector sum across TDC)
    const avgAngles = (starts: (number | undefined)[], ends: (number | undefined)[]) => {
      const validPairs = starts.map((s, idx) => ({ s, e: ends[idx] })).filter((pair): pair is { s: number; e: number } => 
        typeof pair.s === 'number' && Number.isFinite(pair.s) && typeof pair.e === 'number' && Number.isFinite(pair.e)
      );
      if (validPairs.length === 0) return { start: 0, end: 0 };
      const avgS = circularMean(validPairs.map(p => p.s));
      const avgE = circularMean(validPairs.map(p => p.e));
      return { start: Math.round(avgS * 10) / 10, end: Math.round(avgE * 10) / 10 };
    };

    const leftPP = avgAngles(activePoints.map(p => p.leftPowerPhaseStart), activePoints.map(p => p.leftPowerPhaseEnd));
    const leftPPP = avgAngles(activePoints.map(p => p.leftPowerPhasePeakStart), activePoints.map(p => p.leftPowerPhasePeakEnd));
    const rightPP = avgAngles(activePoints.map(p => p.rightPowerPhaseStart), activePoints.map(p => p.rightPowerPhaseEnd));
    const rightPPP = avgAngles(activePoints.map(p => p.rightPowerPhasePeakStart), activePoints.map(p => p.rightPowerPhasePeakEnd));

    const leftTE = activePoints.map(p => p.leftTorqueEffectiveness).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const rightTE = activePoints.map(p => p.rightTorqueEffectiveness).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const leftPS = activePoints.map(p => p.leftPedalSmoothness).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const rightPS = activePoints.map(p => p.rightPedalSmoothness).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    // Seated vs Standing breakdown
    const seatedPts = points.filter(p => p.riderPosition === 'seated');
    const standingPts = points.filter(p => p.riderPosition === 'standing');
    const seatedPower = seatedPts.map(p => p.power || 0);
    const standingPower = standingPts.map(p => p.power || 0);

    cyclingDynamics = {
      hasDynamics: true,
      hasPco: pointsWithPco.length > 0,
      hasPowerPhase: pointsWithPowerPhase.length > 0,
      avgLeftBalance: avgLeftBal !== undefined ? Math.round(avgLeftBal * 10) / 10 : undefined,
      avgRightBalance: avgRightBal !== undefined ? Math.round(avgRightBal * 10) / 10 : undefined,
      avgLeftPco: avgLeftPco !== undefined ? Math.round(avgLeftPco * 10) / 10 : undefined,
      avgRightPco: avgRightPco !== undefined ? Math.round(avgRightPco * 10) / 10 : undefined,
      avgLeftPowerPhase: pointsWithPowerPhase.length > 0 ? { start: leftPP.start, end: leftPP.end, peakStart: leftPPP.start, peakEnd: leftPPP.end } : undefined,
      avgRightPowerPhase: pointsWithPowerPhase.length > 0 ? { start: rightPP.start, end: rightPP.end, peakStart: rightPPP.start, peakEnd: rightPPP.end } : undefined,
      avgLeftTorqueEffectiveness: leftTE.length > 0 ? Math.round(leftTE.reduce((a, b) => a + b, 0) / leftTE.length) : undefined,
      avgRightTorqueEffectiveness: rightTE.length > 0 ? Math.round(rightTE.reduce((a, b) => a + b, 0) / rightTE.length) : undefined,
      avgLeftPedalSmoothness: leftPS.length > 0 ? Math.round(leftPS.reduce((a, b) => a + b, 0) / leftPS.length) : undefined,
      avgRightPedalSmoothness: rightPS.length > 0 ? Math.round(rightPS.reduce((a, b) => a + b, 0) / rightPS.length) : undefined,
      seatedSeconds: seatedPts.length > 0 ? seatedPts.length : undefined,
      standingSeconds: standingPts.length > 0 ? standingPts.length : undefined,
      seatedAvgPower: seatedPower.length > 0 ? Math.round(seatedPower.reduce((a, b) => a + b, 0) / seatedPower.length) : undefined,
      standingAvgPower: standingPower.length > 0 ? Math.round(standingPower.reduce((a, b) => a + b, 0) / standingPower.length) : undefined,
    };
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
    cyclingDynamics,
  };

  return { summary, cpWPrimeResult };
}
