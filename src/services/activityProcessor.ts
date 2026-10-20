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
import { circularMean, normalizeAngle } from '../lib/csvParser';

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

/**
 * Binary search lower bound: finds first index where point.timestamp >= targetTimeMs
 */
function findLowerBound(pts: CyclingDataPoint[], targetTimeMs: number): number {
  let low = 0;
  let high = pts.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (pts[mid].timestamp.getTime() < targetTimeMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

/**
 * Binary search upper bound: finds first index where point.timestamp > targetTimeMs
 */
function findUpperBound(pts: CyclingDataPoint[], targetTimeMs: number): number {
  let low = 0;
  let high = pts.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (pts[mid].timestamp.getTime() <= targetTimeMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
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

  // Process Laps with binary search slicing (O(laps * log N) instead of O(laps * N))
  let laps: Lap[] = [];
  if (lapData && lapData.length > 0) {
    const isChronological = points.length > 1 && points[0].timestamp.getTime() <= points[points.length - 1].timestamp.getTime();

    laps = lapData.map((l, idx) => {
      const lapStartTime = l.start_time instanceof Date ? l.start_time : new Date(l.start_time);
      const lapEndTime = new Date(lapStartTime.getTime() + (l.total_elapsed_time || 0) * 1000);
      const lapStartTimeMs = lapStartTime.getTime();
      const lapEndTimeMs = lapEndTime.getTime();

      let lapPoints: CyclingDataPoint[] = [];
      if (isChronological && !isNaN(lapStartTimeMs) && !isNaN(lapEndTimeMs)) {
        const startIdx = findLowerBound(points, lapStartTimeMs);
        const endIdx = findUpperBound(points, lapEndTimeMs);
        if (startIdx < endIdx) {
          lapPoints = points.slice(startIdx, endIdx);
        }
      } else {
        // Fallback for non-chronological points
        lapPoints = points.filter(p => 
          p.timestamp >= lapStartTime && 
          p.timestamp <= lapEndTime
        );
      }

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

  // Calculate Cycling Dynamics aggregates using a single-pass accumulator (Zero temporary array allocations)
  let cyclingDynamics = undefined;

  let hasPedaling = false;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if ((p.cadence !== undefined && p.cadence > 0) || (p.power !== undefined && p.power > 0)) {
      hasPedaling = true;
      break;
    }
  }

  // Accumulator variables
  let sumLeftBalance = 0;
  let countBalance = 0;

  let sumLeftPco = 0;
  let countLeftPco = 0;
  let sumRightPco = 0;
  let countRightPco = 0;

  let sumLeftTE = 0;
  let countLeftTE = 0;
  let sumRightTE = 0;
  let countRightTE = 0;

  let sumLeftPS = 0;
  let countLeftPS = 0;
  let sumRightPS = 0;
  let countRightPS = 0;

  // Power phase circular accumulators (start and end pairs)
  type AnglePairAcc = { sinStart: number; cosStart: number; sinEnd: number; cosEnd: number; count: number };
  const leftPPAcc: AnglePairAcc = { sinStart: 0, cosStart: 0, sinEnd: 0, cosEnd: 0, count: 0 };
  const leftPPPAcc: AnglePairAcc = { sinStart: 0, cosStart: 0, sinEnd: 0, cosEnd: 0, count: 0 };
  const rightPPAcc: AnglePairAcc = { sinStart: 0, cosStart: 0, sinEnd: 0, cosEnd: 0, count: 0 };
  const rightPPPAcc: AnglePairAcc = { sinStart: 0, cosStart: 0, sinEnd: 0, cosEnd: 0, count: 0 };

  const accumulateAnglePair = (
    s: number | undefined, 
    e: number | undefined, 
    acc: AnglePairAcc
  ) => {
    if (typeof s === 'number' && Number.isFinite(s) && typeof e === 'number' && Number.isFinite(e)) {
      const radS = (s * Math.PI) / 180.0;
      const radE = (e * Math.PI) / 180.0;
      acc.sinStart += Math.sin(radS);
      acc.cosStart += Math.cos(radS);
      acc.sinEnd += Math.sin(radE);
      acc.cosEnd += Math.cos(radE);
      acc.count++;
    }
  };

  // Seated vs standing
  let seatedCount = 0;
  let standingCount = 0;
  let seatedPowerSum = 0;
  let standingPowerSum = 0;
  let hasPosition = false;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];

    // Seated vs standing applies to all points
    if (p.riderPosition !== undefined) {
      hasPosition = true;
      if (p.riderPosition === 'seated') {
        seatedCount++;
        seatedPowerSum += (p.power || 0);
      } else if (p.riderPosition === 'standing') {
        standingCount++;
        standingPowerSum += (p.power || 0);
      }
    }

    // Pedaling filter: only accumulate pedal dynamics during active pedaling (if any pedaling exists)
    const isActive = !hasPedaling || (p.cadence !== undefined && p.cadence > 0) || (p.power !== undefined && p.power > 0);
    if (!isActive) continue;

    if (typeof p.leftRightBalance === 'number' && Number.isFinite(p.leftRightBalance) && p.leftRightBalance >= 0 && p.leftRightBalance <= 100) {
      sumLeftBalance += p.leftRightBalance;
      countBalance++;
    }

    if (typeof p.leftPco === 'number' && Number.isFinite(p.leftPco)) {
      sumLeftPco += p.leftPco;
      countLeftPco++;
    }
    if (typeof p.rightPco === 'number' && Number.isFinite(p.rightPco)) {
      sumRightPco += p.rightPco;
      countRightPco++;
    }

    accumulateAnglePair(p.leftPowerPhaseStart, p.leftPowerPhaseEnd, leftPPAcc);
    accumulateAnglePair(p.leftPowerPhasePeakStart, p.leftPowerPhasePeakEnd, leftPPPAcc);
    accumulateAnglePair(p.rightPowerPhaseStart, p.rightPowerPhaseEnd, rightPPAcc);
    accumulateAnglePair(p.rightPowerPhasePeakStart, p.rightPowerPhasePeakEnd, rightPPPAcc);

    if (typeof p.leftTorqueEffectiveness === 'number' && Number.isFinite(p.leftTorqueEffectiveness)) {
      sumLeftTE += p.leftTorqueEffectiveness;
      countLeftTE++;
    }
    if (typeof p.rightTorqueEffectiveness === 'number' && Number.isFinite(p.rightTorqueEffectiveness)) {
      sumRightTE += p.rightTorqueEffectiveness;
      countRightTE++;
    }

    if (typeof p.leftPedalSmoothness === 'number' && Number.isFinite(p.leftPedalSmoothness)) {
      sumLeftPS += p.leftPedalSmoothness;
      countLeftPS++;
    }
    if (typeof p.rightPedalSmoothness === 'number' && Number.isFinite(p.rightPedalSmoothness)) {
      sumRightPS += p.rightPedalSmoothness;
      countRightPS++;
    }
  }

  const hasPco = countLeftPco > 0 || countRightPco > 0;
  const hasPowerPhase = leftPPAcc.count > 0 || rightPPAcc.count > 0;
  const hasDynamics = countBalance > 0 || hasPco || hasPowerPhase || countLeftTE > 0 || countRightTE > 0 || hasPosition;

  if (hasDynamics) {
    const avgLeftBal = countBalance > 0 ? sumLeftBalance / countBalance : undefined;
    const avgRightBal = avgLeftBal !== undefined ? 100 - avgLeftBal : undefined;

    const avgLeftPco = countLeftPco > 0 ? sumLeftPco / countLeftPco : undefined;
    const avgRightPco = countRightPco > 0 ? sumRightPco / countRightPco : undefined;

    const finalizePair = (acc: AnglePairAcc) => {
      if (acc.count === 0) return { start: 0, end: 0 };
      const avgS = (acc.sinStart === 0 && acc.cosStart === 0) ? 0 : Math.round(normalizeAngle((Math.atan2(acc.sinStart, acc.cosStart) * 180.0) / Math.PI) * 10) / 10;
      const avgE = (acc.sinEnd === 0 && acc.cosEnd === 0) ? 0 : Math.round(normalizeAngle((Math.atan2(acc.sinEnd, acc.cosEnd) * 180.0) / Math.PI) * 10) / 10;
      return { start: Math.round(avgS * 10) / 10, end: Math.round(avgE * 10) / 10 };
    };

    const leftPP = finalizePair(leftPPAcc);
    const leftPPP = finalizePair(leftPPPAcc);
    const rightPP = finalizePair(rightPPAcc);
    const rightPPP = finalizePair(rightPPPAcc);

    cyclingDynamics = {
      hasDynamics: true,
      hasPco,
      hasPowerPhase,
      avgLeftBalance: avgLeftBal !== undefined ? Math.round(avgLeftBal * 10) / 10 : undefined,
      avgRightBalance: avgRightBal !== undefined ? Math.round(avgRightBal * 10) / 10 : undefined,
      avgLeftPco: avgLeftPco !== undefined ? Math.round(avgLeftPco * 10) / 10 : undefined,
      avgRightPco: avgRightPco !== undefined ? Math.round(avgRightPco * 10) / 10 : undefined,
      avgLeftPowerPhase: hasPowerPhase ? { start: leftPP.start, end: leftPP.end, peakStart: leftPPP.start, peakEnd: leftPPP.end } : undefined,
      avgRightPowerPhase: hasPowerPhase ? { start: rightPP.start, end: rightPP.end, peakStart: rightPPP.start, peakEnd: rightPPP.end } : undefined,
      avgLeftTorqueEffectiveness: countLeftTE > 0 ? Math.round(sumLeftTE / countLeftTE) : undefined,
      avgRightTorqueEffectiveness: countRightTE > 0 ? Math.round(sumRightTE / countRightTE) : undefined,
      avgLeftPedalSmoothness: countLeftPS > 0 ? Math.round(sumLeftPS / countLeftPS) : undefined,
      avgRightPedalSmoothness: countRightPS > 0 ? Math.round(sumRightPS / countRightPS) : undefined,
      seatedSeconds: seatedCount > 0 ? seatedCount : undefined,
      standingSeconds: standingCount > 0 ? standingCount : undefined,
      seatedAvgPower: seatedCount > 0 ? Math.round(seatedPowerSum / seatedCount) : undefined,
      standingAvgPower: standingCount > 0 ? Math.round(standingPowerSum / standingCount) : undefined,
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
