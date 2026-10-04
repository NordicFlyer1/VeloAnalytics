import { CyclingDataPoint } from '../types';

/**
 * Normalizes circular degree angle into [0, 360)
 */
export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Computes the circular mean of an array of angles (in degrees 0-360)
 * Uses vector sum (mean of sines and cosines) to handle wrap-around across 0°/360° (TDC).
 */
export function circularMean(angles: number[]): number {
  if (angles.length === 0) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const a of angles) {
    const rad = (a * Math.PI) / 180.0;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  if (sinSum === 0 && cosSum === 0) return 0;
  const meanRad = Math.atan2(sinSum, cosSum);
  const meanDeg = (meanRad * 180.0) / Math.PI;
  return Math.round(normalizeAngle(meanDeg) * 10) / 10;
}

/**
 * Splits a CSV line respecting quotes (e.g. "58,right" or "10,204")
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

/**
 * Parses Garmin SDK directional balance string ("58,right" or "48,left") or plain number into % Left (0-100)
 */
function parseBalanceValue(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === '' || trimmed === 'NaN' || trimmed === 'null') return undefined;

  // Match "58,right" or "46,left"
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*,\s*(right|left)$/i);
  if (match) {
    const num = Number(match[1]);
    const side = match[2].toLowerCase();
    if (Number.isFinite(num) && num >= 0 && num <= 100) {
      return side === 'right' ? Math.round((100 - num) * 10) / 10 : Math.round(num * 10) / 10;
    }
  }

  const n = Number(trimmed);
  if (Number.isFinite(n) && n >= 0 && n <= 100) {
    return Math.round(n * 10) / 10;
  }
  return undefined;
}

/**
 * Parses Garmin SDK combined power phase string ("10,204") or peak power phase ("66,124")
 */
function parseAnglePair(val: string | undefined): [number | undefined, number | undefined] {
  if (!val) return [undefined, undefined];
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === '' || trimmed === 'NaN' || trimmed === 'null') return [undefined, undefined];
  const parts = trimmed.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    return [
      Number.isFinite(a) ? normalizeAngle(a) : undefined,
      Number.isFinite(b) ? normalizeAngle(b) : undefined
    ];
  }
  return [undefined, undefined];
}

/**
 * Parses Garmin SDK and GoldenCheetah CSV exports into CyclingDataPoint array
 * Compatible with CSV headers:
 * secs, cad, hr, km, kph, nm, watts, alt, lon, lat, headwind, slope, temp, interval,
 * lrbalance, lte, rte, lps, rps, lpco, rpco, lppb, rppb, lppe, rppe, lpppb, rpppb, lpppe, rpppe, position_at_value
 * AND Garmin FIT SDK CSV columns:
 * timestamp, heart_rate, cadence, distance, power, left_right_balance, left_pco, right_pco,
 * left_power_phase, left_power_phase_peak, right_power_phase, right_power_phase_peak, enhanced_speed, enhanced_altitude, enhanced_respiration_rate, stamina
 */
export function parseCyclingCsv(csvText: string, baseDate = new Date()): CyclingDataPoint[] {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().trim());

  const getColIdx = (names: string[]): number => {
    for (const name of names) {
      const idx = headers.indexOf(name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const secsIdx = getColIdx(['secs', 'time', 'sec', 'seconds', 'timestamp']);
  const cadIdx = getColIdx(['cad', 'cadence', 'rpm']);
  const hrIdx = getColIdx(['hr', 'heartrate', 'heart_rate', 'bpm']);
  const kmIdx = getColIdx(['km', 'distance_km']);
  const distIdx = getColIdx(['distance', 'dist', 'meters', 'm']);
  const kphIdx = getColIdx(['kph', 'speed_kph']);
  const speedIdx = getColIdx(['speed', 'speed_mps', 'enhanced_speed']);
  const wattsIdx = getColIdx(['watts', 'power', 'pwr']);
  const altIdx = getColIdx(['alt', 'altitude', 'elevation', 'enhanced_altitude']);
  const lonIdx = getColIdx(['lon', 'longitude', 'position_long']);
  const latIdx = getColIdx(['lat', 'latitude', 'position_lat']);
  const slopeIdx = getColIdx(['slope', 'grade', 'incline']);
  const tempIdx = getColIdx(['temp', 'temperature']);

  // Dynamics columns
  const lrBalanceIdx = getColIdx(['lrbalance', 'left_right_balance', 'lr_balance', 'balance']);
  const lteIdx = getColIdx(['lte', 'left_torque_effectiveness']);
  const rteIdx = getColIdx(['rte', 'right_torque_effectiveness']);
  const lpsIdx = getColIdx(['lps', 'left_pedal_smoothness']);
  const rpsIdx = getColIdx(['rps', 'right_pedal_smoothness']);
  const lpcoIdx = getColIdx(['lpco', 'left_pco', 'left_platform_center_offset']);
  const rpcoIdx = getColIdx(['rpco', 'right_pco', 'right_platform_center_offset']);

  // Power Phase - paired Garmin SDK format ("10,204")
  const lppColIdx = getColIdx(['left_power_phase', 'left_power_phase_degrees', 'lpp']);
  const rppColIdx = getColIdx(['right_power_phase', 'right_power_phase_degrees', 'rpp']);
  const lpppColIdx = getColIdx(['left_power_phase_peak', 'left_power_phase_peak_degrees', 'lppp']);
  const rpppColIdx = getColIdx(['right_power_phase_peak', 'right_power_phase_peak_degrees', 'rppp']);

  // Power Phase - separate columns (GoldenCheetah format)
  const lppbIdx = getColIdx(['lppb', 'left_power_phase_begin', 'left_power_phase_start', 'left_pp_start']);
  const rppbIdx = getColIdx(['rppb', 'right_power_phase_begin', 'right_power_phase_start', 'right_pp_start']);
  const lppeIdx = getColIdx(['lppe', 'left_power_phase_end', 'left_power_phase_finish', 'left_pp_end']);
  const rppeIdx = getColIdx(['rppe', 'right_power_phase_end', 'right_power_phase_finish', 'right_pp_end']);

  // Peak Power Phase - separate columns
  const lpppbIdx = getColIdx(['lpppb', 'left_power_phase_peak_begin', 'left_power_phase_peak_start', 'left_ppp_start']);
  const rpppbIdx = getColIdx(['rpppb', 'right_power_phase_peak_begin', 'right_power_phase_peak_start', 'right_ppp_start']);
  const lpppeIdx = getColIdx(['lpppe', 'left_power_phase_peak_end', 'left_power_phase_peak_finish', 'left_ppp_end']);
  const rpppeIdx = getColIdx(['rpppe', 'right_power_phase_peak_end', 'right_power_phase_peak_finish', 'right_ppp_end']);

  // Respiration Rate & Stamina
  const respIdx = getColIdx(['enhanced_respiration_rate', 'respiration_rate', 'respiration']);
  const staminaIdx = getColIdx(['stamina']);

  // Rider position
  const posIdx = getColIdx(['position_at_value', 'position', 'rider_position', 'pos']);

  const points: CyclingDataPoint[] = [];
  const startTimeMs = baseDate.getTime();

  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitCsvLine(lines[i]);
    if (rawCols.length < 3) continue;

    const parseNum = (idx: number): number | undefined => {
      if (idx === -1 || idx >= rawCols.length) return undefined;
      const v = rawCols[idx].trim();
      if (!v || v === '' || v === 'NaN' || v === 'null') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    // Parse timestamp (ISO string or relative seconds)
    let timestamp: Date;
    const rawSec = rawCols[secsIdx]?.trim();
    if (rawSec && rawSec.includes('T')) {
      const parsedDate = new Date(rawSec);
      timestamp = !isNaN(parsedDate.getTime()) ? parsedDate : new Date(startTimeMs + (i - 1) * 1000);
    } else {
      const secVal = parseNum(secsIdx) ?? (i - 1);
      timestamp = new Date(startTimeMs + secVal * 1000);
    }

    const power = parseNum(wattsIdx);
    const cadence = parseNum(cadIdx);
    const heartRate = parseNum(hrIdx);
    
    let speed = parseNum(kphIdx);
    if (speed === undefined && speedIdx !== -1) {
      const s = parseNum(speedIdx);
      if (s !== undefined) speed = s * 3.6; // m/s to kph
    }

    let distance = parseNum(distIdx);
    if (distance === undefined && kmIdx !== -1) {
      const km = parseNum(kmIdx);
      if (km !== undefined) distance = km * 1000;
    }

    const altitude = parseNum(altIdx);
    const latitude = parseNum(latIdx);
    const longitude = parseNum(lonIdx);
    const slope = parseNum(slopeIdx);
    const temperature = parseNum(tempIdx);

    // Left/Right balance: handles "58,right", "46,left", or raw numbers
    let leftRightBalance: number | undefined = undefined;
    if (lrBalanceIdx !== -1 && lrBalanceIdx < rawCols.length) {
      leftRightBalance = parseBalanceValue(rawCols[lrBalanceIdx]);
    }

    // PCO
    const leftPco = parseNum(lpcoIdx);
    const rightPco = parseNum(rpcoIdx);

    // Power Phase angles
    // 1. First check paired Garmin SDK strings ("10,204")
    let leftPowerPhaseStart: number | undefined = undefined;
    let leftPowerPhaseEnd: number | undefined = undefined;
    if (lppColIdx !== -1 && lppColIdx < rawCols.length) {
      const [s, e] = parseAnglePair(rawCols[lppColIdx]);
      leftPowerPhaseStart = s;
      leftPowerPhaseEnd = e;
    }
    // Fallback to separate columns if paired string not present
    if (leftPowerPhaseStart === undefined && lppbIdx !== -1) leftPowerPhaseStart = parseNum(lppbIdx) !== undefined ? normalizeAngle(parseNum(lppbIdx)!) : undefined;
    if (leftPowerPhaseEnd === undefined && lppeIdx !== -1) leftPowerPhaseEnd = parseNum(lppeIdx) !== undefined ? normalizeAngle(parseNum(lppeIdx)!) : undefined;

    // Peak Power Phase - Left
    let leftPowerPhasePeakStart: number | undefined = undefined;
    let leftPowerPhasePeakEnd: number | undefined = undefined;
    if (lpppColIdx !== -1 && lpppColIdx < rawCols.length) {
      const [s, e] = parseAnglePair(rawCols[lpppColIdx]);
      leftPowerPhasePeakStart = s;
      leftPowerPhasePeakEnd = e;
    }
    if (leftPowerPhasePeakStart === undefined && lpppbIdx !== -1) leftPowerPhasePeakStart = parseNum(lpppbIdx) !== undefined ? normalizeAngle(parseNum(lpppbIdx)!) : undefined;
    if (leftPowerPhasePeakEnd === undefined && lpppeIdx !== -1) leftPowerPhasePeakEnd = parseNum(lpppeIdx) !== undefined ? normalizeAngle(parseNum(lpppeIdx)!) : undefined;

    // Right Power Phase
    let rightPowerPhaseStart: number | undefined = undefined;
    let rightPowerPhaseEnd: number | undefined = undefined;
    if (rppColIdx !== -1 && rppColIdx < rawCols.length) {
      const [s, e] = parseAnglePair(rawCols[rppColIdx]);
      rightPowerPhaseStart = s;
      rightPowerPhaseEnd = e;
    }
    if (rightPowerPhaseStart === undefined && rppbIdx !== -1) rightPowerPhaseStart = parseNum(rppbIdx) !== undefined ? normalizeAngle(parseNum(rppbIdx)!) : undefined;
    if (rightPowerPhaseEnd === undefined && rppeIdx !== -1) rightPowerPhaseEnd = parseNum(rppeIdx) !== undefined ? normalizeAngle(parseNum(rppeIdx)!) : undefined;

    // Peak Power Phase - Right
    let rightPowerPhasePeakStart: number | undefined = undefined;
    let rightPowerPhasePeakEnd: number | undefined = undefined;
    if (rpppColIdx !== -1 && rpppColIdx < rawCols.length) {
      const [s, e] = parseAnglePair(rawCols[rpppColIdx]);
      rightPowerPhasePeakStart = s;
      rightPowerPhasePeakEnd = e;
    }
    if (rightPowerPhasePeakStart === undefined && rpppbIdx !== -1) rightPowerPhasePeakStart = parseNum(rpppbIdx) !== undefined ? normalizeAngle(parseNum(rpppbIdx)!) : undefined;
    if (rightPowerPhasePeakEnd === undefined && rpppeIdx !== -1) rightPowerPhasePeakEnd = parseNum(rpppeIdx) !== undefined ? normalizeAngle(parseNum(rpppeIdx)!) : undefined;

    const leftTorqueEffectiveness = parseNum(lteIdx);
    const rightTorqueEffectiveness = parseNum(rteIdx);
    const leftPedalSmoothness = parseNum(lpsIdx);
    const rightPedalSmoothness = parseNum(rpsIdx);
    const respirationRate = parseNum(respIdx);
    const stamina = parseNum(staminaIdx);

    // Rider position
    let riderPosition: 'seated' | 'standing' | undefined = undefined;
    if (posIdx !== -1 && posIdx < rawCols.length) {
      const pRaw = rawCols[posIdx].trim().toLowerCase();
      if (pRaw === '1' || pRaw === 'standing' || pRaw === 'stand') {
        riderPosition = 'standing';
      } else if (pRaw === '0' || pRaw === 'seated' || pRaw === 'seat') {
        riderPosition = 'seated';
      }
    }

    points.push({
      timestamp,
      power,
      heartRate,
      cadence,
      speed,
      distance,
      altitude,
      latitude,
      longitude,
      slope,
      temperature,
      leftRightBalance,
      leftPco,
      rightPco,
      leftPowerPhaseStart,
      leftPowerPhaseEnd,
      leftPowerPhasePeakStart,
      leftPowerPhasePeakEnd,
      rightPowerPhaseStart,
      rightPowerPhaseEnd,
      rightPowerPhasePeakStart,
      rightPowerPhasePeakEnd,
      leftTorqueEffectiveness: (leftTorqueEffectiveness && leftTorqueEffectiveness > 0) ? leftTorqueEffectiveness : undefined,
      rightTorqueEffectiveness: (rightTorqueEffectiveness && rightTorqueEffectiveness > 0) ? rightTorqueEffectiveness : undefined,
      leftPedalSmoothness: (leftPedalSmoothness && leftPedalSmoothness > 0) ? leftPedalSmoothness : undefined,
      rightPedalSmoothness: (rightPedalSmoothness && rightPedalSmoothness > 0) ? rightPedalSmoothness : undefined,
      respirationRate,
      stamina,
      riderPosition
    });
  }

  return points;
}
