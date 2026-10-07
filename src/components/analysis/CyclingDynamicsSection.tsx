import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCw, 
  MoveHorizontal, 
  Image,
  FileSpreadsheet
} from 'lucide-react';
import { SectionHeader, ExportAction } from '../ui/SectionHeader';
import { ActivitySummary, CyclingDataPoint } from '../../types';
import { exportComponentAsImage } from '../../lib/chartExport';
import { exportToCSV } from '../../lib/csvExport';
import { cn } from '../../lib/utils';
import seatedSvg from '../../assets/images/seated_cyclist.svg';
import standingSvg from '../../assets/images/standing_cyclist.svg';
import { circularMean } from '../../lib/csvParser';

interface CyclingDynamicsSectionProps {
  summary: ActivitySummary;
  data: CyclingDataPoint[];
  activePoint: number | null;
  setActivePoint: (index: number | null) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

type MaxAvgPowerWindow = 'none' | '5s' | '1m' | '5m' | '20m' | '60m';

/**
 * Visualizer for 360-degree Crank Power Phase Dial (Garmin-style pedal clock)
 */
const PedalClock: React.FC<{
  side: 'Left' | 'Right';
  balance: number;
  hasBalanceData?: boolean;
  powerPhaseStart: number;
  powerPhaseEnd: number;
  peakPowerStart: number;
  peakPowerEnd: number;
  habitualStart?: number;
  habitualEnd?: number;
}> = ({
  side,
  balance,
  hasBalanceData = true,
  powerPhaseStart,
  powerPhaseEnd,
  peakPowerStart,
  peakPowerEnd,
  habitualStart,
  habitualEnd
}) => {
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngleDeg: number, endAngleDeg: number) => {
    let sweep = endAngleDeg - startAngleDeg;
    if (sweep < 0) sweep += 360;
    if (sweep >= 360) sweep = 359.99;

    const start = polarToCartesian(x, y, radius, startAngleDeg);
    const end = polarToCartesian(x, y, radius, startAngleDeg + sweep);
    const largeArcFlag = sweep <= 180 ? '0' : '1';

    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y
    ].join(' ');
  };

  const cx = 180;
  const cy = 180;
  // Significantly enlarged radius: 240px interior circle gives massive open space for center text
  const radius = 120;
  const peakRadius = 120;

  const isLeft = side === 'Left';
  const phaseColor = isLeft ? '#86efac' : '#7dd3fc';
  const peakColor = isLeft ? '#22c55e' : '#0284c7';

  const powerPhasePath = describeArc(cx, cy, radius, powerPhaseStart, powerPhaseEnd);
  const peakPhasePath = describeArc(cx, cy, peakRadius, peakPowerStart, peakPowerEnd);
  const habitualPath = (habitualStart !== undefined && habitualEnd !== undefined)
    ? describeArc(cx, cy, radius, habitualStart, habitualEnd)
    : null;

  // Compute power phase total arc length (accounting for crossing TDC)
  let arcLength = powerPhaseEnd - powerPhaseStart;
  if (arcLength < 0) arcLength += 360;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-app-bg/30 border border-app-border/40 rounded-3xl w-full max-w-[440px] relative">
      {/* Top Header Row: Side Label & Peak Power Angle Badge */}
      <div className="flex items-center justify-between w-full px-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: phaseColor }} />
          <span className="text-sm font-bold uppercase tracking-wider text-app-text">{side} Pedal</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-app-card border border-app-border text-[10px] font-mono shadow-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: peakColor }} />
          <span className="text-app-muted font-bold">Peak Range:</span>
          <span className="text-app-text font-bold">{Math.round(peakPowerStart)}°–{Math.round(peakPowerEnd)}°</span>
        </div>
      </div>

      {/* Drive Start Callout */}
      <div className="flex items-center justify-center mb-1">
        <span className="text-xs font-semibold text-app-muted tracking-wide flex items-center gap-1.5">
          <span className="italic">Drive Start:</span>
          <span className="font-mono text-app-text font-bold">{Math.round(powerPhaseStart)}°</span>
        </span>
      </div>

      {/* Significantly Enlarged 360° Pedal Clock SVG */}
      <div className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-92 md:h-92 flex items-center justify-center">
        <svg viewBox="0 0 360 360" className="w-full h-full">
          {/* Base dial track */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--app-border)" strokeWidth="11" opacity="0.3" />

          {/* Faint Habitual / Average Arc Baseline (when comparing against a live stroke) */}
          {habitualPath && (
            <path
              d={habitualPath}
              fill="none"
              stroke="var(--app-muted)"
              strokeWidth="11"
              strokeDasharray="4 4"
              opacity="0.35"
              strokeLinecap="round"
            />
          )}

          {/* Clock Face Cardinal Labels positioned with massive 25px+ clearance outside the circle */}
          <text x={cx} y={26} textAnchor="middle" fill="var(--app-muted)" fontSize="10" fontWeight="bold">12 (TDC 0°)</text>
          <text x={328} y={184} textAnchor="start" fill="var(--app-muted)" fontSize="10" fontWeight="bold">3 (90°)</text>
          <text x={cx} y={340} textAnchor="middle" fill="var(--app-muted)" fontSize="10" fontWeight="bold">6 (BDC 180°)</text>
          <text x={32} y={184} textAnchor="end" fill="var(--app-muted)" fontSize="10" fontWeight="bold">9 (270°)</text>

          {/* Power Phase Arc (Full propulsive sweep) */}
          <path
            d={powerPhasePath}
            fill="none"
            stroke={phaseColor}
            strokeWidth="12"
            strokeLinecap="round"
            className="transition-all duration-300"
          />

          {/* Peak Power Phase Arc (Max torque band) */}
          <path
            d={peakPhasePath}
            fill="none"
            stroke={peakColor}
            strokeWidth="15"
            strokeLinecap="round"
            className="transition-all duration-300"
          />

          {/* Clockwise Rotation Arrow at Top */}
          <path
            d={describeArc(cx, cy, radius + 18, 335, 30)}
            fill="none"
            stroke="var(--app-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
          <polygon
            points={`${polarToCartesian(cx, cy, radius + 18, 30).x},${polarToCartesian(cx, cy, radius + 18, 30).y} ${polarToCartesian(cx, cy, radius + 13, 26).x},${polarToCartesian(cx, cy, radius + 13, 26).y} ${polarToCartesian(cx, cy, radius + 23, 26).x},${polarToCartesian(cx, cy, radius + 23, 26).y}`}
            fill="var(--app-muted)"
            opacity="0.5"
          />
        </svg>

        {/* Center Readout with generous whitespace, strictly contained inside the wide 220px+ inner hole */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6">
          {hasBalanceData ? (
            <>
              <div className="flex items-baseline">
                <span className="text-4xl sm:text-5xl font-bold font-mono tracking-tight text-app-text">
                  {Math.round(balance)}
                </span>
                <span className="text-base font-bold text-app-muted ml-0.5">%</span>
              </div>
              <span className="text-xs font-semibold text-app-muted mt-0.5">
                {side} Balance
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center mb-1">
              <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-app-muted/60">
                --
              </span>
              <span className="text-[11px] font-medium text-app-muted text-center leading-tight mt-0.5">
                Single-Sided Sensor
              </span>
            </div>
          )}

          <div className="text-[11px] sm:text-xs font-mono text-app-muted mt-3 flex items-center gap-1.5 whitespace-nowrap bg-app-bg/60 px-3.5 py-1 rounded-full border border-app-border/40 shadow-sm">
            <span className="text-app-muted font-semibold">Arc Span:</span>
            <strong className="text-app-text font-bold">{Math.round(arcLength)}°</strong>
          </div>
        </div>
      </div>

      {/* Drive End Callout */}
      <div className="flex items-center justify-center mt-1">
        <span className="text-xs font-semibold text-app-muted tracking-wide flex items-center gap-1.5">
          <span className="italic">Drive End:</span>
          <span className="font-mono text-app-text font-bold">{Math.round(powerPhaseEnd)}°</span>
        </span>
      </div>
    </div>
  );
};

/**
 * Garmin Pedal Platform Center Offset (PCO) Graphic
 * Exact reproduction of Garmin pedal anatomy:
 * - Garmin Definition: Positive (+) is Outboard (away from frame), Negative (−) is Inboard (toward frame/crank).
 * - Left Pedal: Spindle attaches on the RIGHT (inboard towards frame). Outboard (+) is Left, Inboard (−) is Right.
 *   Labels above Left pedal: [+] on Left (outboard), [−] on Right (inboard). Red line moves towards [+] (left) for positive offset (+ mm).
 * - Right Pedal: Spindle attaches on the LEFT (inboard towards frame). Inboard (−) is Left, Outboard (+) is Right.
 *   Labels above Right pedal: [−] on Left (inboard), [+] on Right (outboard). Red line moves towards [+] (right) for positive offset (+ mm).
 */
const PedalGraphic: React.FC<{
  side: 'Left' | 'Right';
  offsetMm: number;
}> = ({ side, offsetMm }) => {
  const isLeft = side === 'Left';
  // Clamped pixel translation for the red offset indicator:
  // On Left pedal: positive offset shifts LEFT (-X in SVG towards outboard +).
  // On Right pedal: positive offset shifts RIGHT (+X in SVG towards outboard +).
  const maxVisualMm = 15;
  const clampedMm = Math.max(-maxVisualMm, Math.min(maxVisualMm, offsetMm));
  // 1.8px per mm offset across a 100px viewBox
  const visualPxOffset = isLeft ? -(clampedMm * 1.8) : (clampedMm * 1.8);

  return (
    <div className="flex flex-col items-center py-2">
      {/* Garmin Top Signage: Left pedal has + (outboard) on left, - (inboard) on right. Right pedal has - (inboard) on left, + (outboard) on right. */}
      <div className="flex items-center justify-between w-full max-w-[130px] text-xs font-bold text-app-muted px-2 mb-1 select-none">
        <span 
          title={isLeft ? "Outboard (+)" : "Inboard (−)"}
          className={cn("text-base font-extrabold transition-colors", (isLeft ? offsetMm >= 0 : offsetMm < 0) ? "text-app-text" : "text-app-muted/50")}
        >
          {isLeft ? '+' : '−'}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-app-muted/80 font-bold">
          {side}
        </span>
        <span 
          title={isLeft ? "Inboard (−)" : "Outboard (+)"}
          className={cn("text-base font-extrabold transition-colors", (!isLeft ? offsetMm >= 0 : offsetMm < 0) ? "text-app-text" : "text-app-muted/50")}
        >
          {isLeft ? '−' : '+'}
        </span>
      </div>

      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Pedal body outline */}
          <path
            d="M 30,22 L 70,22 C 75,22 78,26 76,32 L 70,75 C 69,80 65,84 60,84 L 40,84 C 35,84 31,80 30,75 L 24,32 C 22,26 25,22 30,22 Z"
            fill="none"
            stroke="var(--app-muted)"
            strokeWidth="3"
            strokeOpacity="0.6"
          />
          {/* Pedal cleat pocket */}
          <rect x="36" y="32" width="28" height="34" rx="4" fill="none" stroke="var(--app-border)" strokeWidth="2" />
          
          {/* Spindle attachment & threaded axle stub:
              Left Pedal spindle attaches to the crank on the RIGHT (x > 70).
              Right Pedal spindle attaches to the crank on the LEFT (x < 30). */}
          {isLeft ? (
            <>
              {/* Spindle barrel on right */}
              <rect x="74" y="44" width="12" height="12" rx="2" fill="var(--app-muted)" fillOpacity="0.4" stroke="var(--app-muted)" strokeWidth="1" />
              {/* Spindle threaded collar lines */}
              <line x1="86" y1="46" x2="86" y2="54" stroke="var(--app-muted)" strokeWidth="1.5" />
              <line x1="90" y1="47" x2="90" y2="53" stroke="var(--app-muted)" strokeWidth="1.5" />
              <line x1="94" y1="48" x2="94" y2="52" stroke="var(--app-muted)" strokeWidth="1.5" />
            </>
          ) : (
            <>
              {/* Spindle barrel on left */}
              <rect x="14" y="44" width="12" height="12" rx="2" fill="var(--app-muted)" fillOpacity="0.4" stroke="var(--app-muted)" strokeWidth="1" />
              {/* Spindle threaded collar lines */}
              <line x1="14" y1="46" x2="14" y2="54" stroke="var(--app-muted)" strokeWidth="1.5" />
              <line x1="10" y1="47" x2="10" y2="53" stroke="var(--app-muted)" strokeWidth="1.5" />
              <line x1="6" y1="48" x2="6" y2="52" stroke="var(--app-muted)" strokeWidth="1.5" />
            </>
          )}

          {/* Neutral Center reference line (dashed gray) */}
          <line x1="50" y1="12" x2="50" y2="88" stroke="var(--app-muted)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />

          {/* Active Platform Center Offset Red Line */}
          <line
            x1={50 + visualPxOffset}
            y1="10"
            x2={50 + visualPxOffset}
            y2="90"
            stroke="#ef4444"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
      </div>

      <div className="text-center mt-2">
        <div className="text-xl sm:text-2xl font-bold font-mono text-app-text">
          {offsetMm >= 0 ? `+ ${offsetMm.toFixed(1)}` : `− ${Math.abs(offsetMm).toFixed(1)}`} mm
        </div>
        <span className="text-[11px] text-app-muted font-medium block">
          PCO {side} <span className="text-[10px] text-app-muted/80">({Math.abs(offsetMm) < 0.5 ? 'Center' : offsetMm > 0 ? 'Outboard' : 'Inboard'})</span>
        </span>
      </div>
    </div>
  );
};

/**
 * Garmin Exact Silhouette Rider & Bike Graphic
 * Renders the user's exact SVG files directly.
 */
const GarminRiderGraphic: React.FC<{
  position: 'seated' | 'standing';
}> = ({ position }) => {
  const isStanding = position === 'standing';
  const src = isStanding ? standingSvg : seatedSvg;
  const alt = isStanding ? "Standing Position Cyclist" : "Seated Position Cyclist";

  return (
    <img
      src={src}
      alt={alt}
      className="w-28 h-28 sm:w-32 sm:h-32 object-contain select-none pointer-events-none"
    />
  );
};

export const CyclingDynamicsSection: React.FC<CyclingDynamicsSectionProps> = ({
  summary,
  data,
  activePoint,
  setActivePoint,
  isExpanded,
  setIsExpanded
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [maxAvgPowerWindow, setMaxAvgPowerWindow] = useState<MaxAvgPowerWindow>('none');

  const dynamics = summary.cyclingDynamics;
  if (!dynamics || !dynamics.hasDynamics) {
    return null;
  }

  const peakWindowIndices = useMemo(() => {
    if (maxAvgPowerWindow === 'none' || !data || data.length === 0) return null;
    let windowSeconds = 0;
    if (maxAvgPowerWindow === '5s') windowSeconds = 5;
    else if (maxAvgPowerWindow === '1m') windowSeconds = 60;
    else if (maxAvgPowerWindow === '5m') windowSeconds = 300;
    else if (maxAvgPowerWindow === '20m') windowSeconds = 1200;
    else if (maxAvgPowerWindow === '60m') windowSeconds = 3600;

    if (windowSeconds <= 0 || data.length < windowSeconds) return null;

    let bestStart = 0;
    let maxAvg = 0;
    const powers = data.map(d => d.power || 0);

    let currentSum = 0;
    for (let i = 0; i < windowSeconds; i++) currentSum += powers[i];
    maxAvg = currentSum / windowSeconds;
    bestStart = 0;

    for (let i = windowSeconds; i < powers.length; i++) {
      currentSum += powers[i] - powers[i - windowSeconds];
      const avg = currentSum / windowSeconds;
      if (avg > maxAvg) {
        maxAvg = avg;
        bestStart = i - windowSeconds + 1;
      }
    }

    return { start: bestStart, end: bestStart + windowSeconds - 1, avgPower: Math.round(maxAvg) };
  }, [data, maxAvgPowerWindow]);

  const computedMetrics = useMemo(() => {
    // 1. If user explicitly picked a peak power window (e.g. 5s, 1m, 5m, 20m, 60m), THAT WINDOW TAKES PRECEDENCE!
    let subset = data;
    const isPeakWindowSelected = maxAvgPowerWindow !== 'none' && peakWindowIndices !== null;

    if (isPeakWindowSelected && peakWindowIndices && peakWindowIndices.start >= 0 && peakWindowIndices.end < data.length) {
      subset = data.slice(peakWindowIndices.start, peakWindowIndices.end + 1);
    } else if (activePoint !== null && activePoint >= 0 && activePoint < data.length) {
      // 2. Only inspect instantaneous second when user is actively scrubbing
      // If the current point was freewheeling/coasting (or intermediate recording), search within +/- 3s for active stroke data
      let pt = data[activePoint];
      let hasPtDynamics = pt.leftRightBalance !== undefined || pt.leftPco !== undefined || pt.rightPco !== undefined || pt.leftPowerPhaseStart !== undefined;

      if (!hasPtDynamics) {
        // Look within a small window (+/- 3 seconds) for the most recent or nearest active pedaling stroke
        for (let offset = 1; offset <= 3; offset++) {
          const prevIdx = activePoint - offset;
          if (prevIdx >= 0) {
            const candidate = data[prevIdx];
            if (candidate.leftRightBalance !== undefined || candidate.leftPco !== undefined || candidate.leftPowerPhaseStart !== undefined) {
              pt = candidate;
              hasPtDynamics = true;
              break;
            }
          }
          const nextIdx = activePoint + offset;
          if (nextIdx < data.length) {
            const candidate = data[nextIdx];
            if (candidate.leftRightBalance !== undefined || candidate.leftPco !== undefined || candidate.leftPowerPhaseStart !== undefined) {
              pt = candidate;
              hasPtDynamics = true;
              break;
            }
          }
        }
      }

      if (hasPtDynamics) {
        const leftBal = pt.leftRightBalance !== undefined ? pt.leftRightBalance : (dynamics.avgLeftBalance ?? 50);
        const rightBal = 100 - leftBal;
        const leftPco = pt.leftPco ?? (dynamics.avgLeftPco ?? 0);
        const rightPco = pt.rightPco ?? (dynamics.avgRightPco ?? 0);

        const leftPP = {
          start: pt.leftPowerPhaseStart ?? dynamics.avgLeftPowerPhase?.start ?? 10,
          end: pt.leftPowerPhaseEnd ?? dynamics.avgLeftPowerPhase?.end ?? 205,
          peakStart: pt.leftPowerPhasePeakStart ?? dynamics.avgLeftPowerPhase?.peakStart ?? 65,
          peakEnd: pt.leftPowerPhasePeakEnd ?? dynamics.avgLeftPowerPhase?.peakEnd ?? 115,
        };

        const rightPP = {
          start: pt.rightPowerPhaseStart ?? dynamics.avgRightPowerPhase?.start ?? 10,
          end: pt.rightPowerPhaseEnd ?? dynamics.avgRightPowerPhase?.end ?? 205,
          peakStart: pt.rightPowerPhasePeakStart ?? dynamics.avgRightPowerPhase?.peakStart ?? 65,
          peakEnd: pt.rightPowerPhasePeakEnd ?? dynamics.avgRightPowerPhase?.peakEnd ?? 115,
        };

        return {
          isInstantaneous: true,
          pointTimestamp: pt.timestamp,
          riderPosition: pt.riderPosition,
          power: pt.power,
          cadence: pt.cadence,
          leftBalance: leftBal,
          rightBalance: rightBal,
          leftPco,
          rightPco,
          leftPP,
          rightPP,
          seatedSeconds: dynamics.seatedSeconds,
          standingSeconds: dynamics.standingSeconds,
          seatedAvgPower: dynamics.seatedAvgPower,
          standingAvgPower: dynamics.standingAvgPower,
        };
      }
    }

    // Filter to active pedaling frames for biomechanical averages
    const pedalingSubset = subset.filter(p => (p.cadence !== undefined && p.cadence > 0) || (p.power !== undefined && p.power > 0));
    const activeSubset = pedalingSubset.length > 0 ? pedalingSubset : subset;

    let leftBalSum = 0;
    let balCount = 0;
    let leftPcoSum = 0;
    let leftPcoCount = 0;
    let rightPcoSum = 0;
    let rightPcoCount = 0;

    const leftStarts: number[] = [];
    const leftEnds: number[] = [];
    const leftPeakStarts: number[] = [];
    const leftPeakEnds: number[] = [];

    const rightStarts: number[] = [];
    const rightEnds: number[] = [];
    const rightPeakStarts: number[] = [];
    const rightPeakEnds: number[] = [];

    activeSubset.forEach(p => {
      if (typeof p.leftRightBalance === 'number' && Number.isFinite(p.leftRightBalance) && p.leftRightBalance >= 0 && p.leftRightBalance <= 100) {
        leftBalSum += p.leftRightBalance;
        balCount++;
      }
      if (typeof p.leftPco === 'number' && Number.isFinite(p.leftPco)) {
        leftPcoSum += p.leftPco;
        leftPcoCount++;
      }
      if (typeof p.rightPco === 'number' && Number.isFinite(p.rightPco)) {
        rightPcoSum += p.rightPco;
        rightPcoCount++;
      }
      if (typeof p.leftPowerPhaseStart === 'number' && typeof p.leftPowerPhaseEnd === 'number' && (p.leftPowerPhaseStart !== 0 || p.leftPowerPhaseEnd !== 0)) {
        leftStarts.push(p.leftPowerPhaseStart);
        leftEnds.push(p.leftPowerPhaseEnd);
        leftPeakStarts.push(p.leftPowerPhasePeakStart ?? 65);
        leftPeakEnds.push(p.leftPowerPhasePeakEnd ?? 115);
      }
      if (typeof p.rightPowerPhaseStart === 'number' && typeof p.rightPowerPhaseEnd === 'number' && (p.rightPowerPhaseStart !== 0 || p.rightPowerPhaseEnd !== 0)) {
        rightStarts.push(p.rightPowerPhaseStart);
        rightEnds.push(p.rightPowerPhaseEnd);
        rightPeakStarts.push(p.rightPowerPhasePeakStart ?? 65);
        rightPeakEnds.push(p.rightPowerPhasePeakEnd ?? 115);
      }
    });

    const leftBalance = balCount > 0 ? (leftBalSum / balCount) : (dynamics.avgLeftBalance ?? 50);
    const rightBalance = 100 - leftBalance;

    const leftPco = leftPcoCount > 0 ? (leftPcoSum / leftPcoCount) : (dynamics.avgLeftPco ?? 0);
    const rightPco = rightPcoCount > 0 ? (rightPcoSum / rightPcoCount) : (dynamics.avgRightPco ?? 0);

    const leftPP = leftStarts.length > 0 ? {
      start: circularMean(leftStarts),
      end: circularMean(leftEnds),
      peakStart: circularMean(leftPeakStarts),
      peakEnd: circularMean(leftPeakEnds)
    } : (dynamics.avgLeftPowerPhase || { start: 10, end: 205, peakStart: 65, peakEnd: 115 });

    const rightPP = rightStarts.length > 0 ? {
      start: circularMean(rightStarts),
      end: circularMean(rightEnds),
      peakStart: circularMean(rightPeakStarts),
      peakEnd: circularMean(rightPeakEnds)
    } : (dynamics.avgRightPowerPhase || { start: 10, end: 205, peakStart: 65, peakEnd: 115 });

    const hasPositionData = data.some(p => p.riderPosition !== undefined);
    const seatedPts = subset.filter(p => p.riderPosition === 'seated');
    const standingPts = subset.filter(p => p.riderPosition === 'standing');

    let seatedSeconds: number | undefined = undefined;
    let standingSeconds: number | undefined = undefined;
    if (hasPositionData) {
      seatedSeconds = seatedPts.length > 0 ? seatedPts.length : (peakWindowIndices ? 0 : (dynamics.seatedSeconds ?? 0));
      standingSeconds = standingPts.length > 0 ? standingPts.length : (peakWindowIndices ? 0 : (dynamics.standingSeconds ?? 0));
    } else if (dynamics.seatedSeconds !== undefined || dynamics.standingSeconds !== undefined) {
      seatedSeconds = dynamics.seatedSeconds;
      standingSeconds = dynamics.standingSeconds;
    }

    const seatedPower = seatedPts.map(p => p.power || 0);
    const standingPower = standingPts.map(p => p.power || 0);
    const seatedAvgPower = seatedPower.length > 0 
      ? Math.round(seatedPower.reduce((a, b) => a + b, 0) / seatedPower.length) 
      : (peakWindowIndices ? undefined : dynamics.seatedAvgPower);
    const standingAvgPower = standingPower.length > 0 
      ? Math.round(standingPower.reduce((a, b) => a + b, 0) / standingPower.length) 
      : (peakWindowIndices ? undefined : dynamics.standingAvgPower);

    return {
      isInstantaneous: false,
      pointTimestamp: undefined,
      riderPosition: undefined,
      power: undefined,
      leftBalance,
      rightBalance,
      leftPco,
      rightPco,
      leftPP,
      rightPP,
      seatedSeconds,
      standingSeconds,
      seatedAvgPower,
      standingAvgPower
    };
  }, [data, peakWindowIndices, dynamics, activePoint]);

  const exportActions: ExportAction[] = [
    {
      label: 'Dynamics Panel (PNG)',
      icon: Image,
      onClick: async () => {
        if (containerRef.current) {
          const fileName = `Velo_CyclingDynamics_${new Date().getTime()}.png`;
          await exportComponentAsImage(containerRef.current, fileName);
        }
      }
    },
    {
      label: 'Dynamics Summary & Position Breakdown (CSV)',
      icon: FileSpreadsheet,
      onClick: async () => {
        const totalDuration = (dynamics.seatedSeconds ?? 0) + (dynamics.standingSeconds ?? 0) || summary.duration || 1;
        const seatedSec = dynamics.seatedSeconds ?? 0;
        const standingSec = dynamics.standingSeconds ?? 0;
        const seatedPct = Math.round((seatedSec / totalDuration) * 100);
        const standingPct = Math.round((standingSec / totalDuration) * 100);

        const leftArc = (typeof dynamics.avgLeftPowerPhase?.end === 'number' && typeof dynamics.avgLeftPowerPhase?.start === 'number')
          ? ((dynamics.avgLeftPowerPhase.end - dynamics.avgLeftPowerPhase.start + 360) % 360).toFixed(1)
          : '';
        const rightArc = (typeof dynamics.avgRightPowerPhase?.end === 'number' && typeof dynamics.avgRightPowerPhase?.start === 'number')
          ? ((dynamics.avgRightPowerPhase.end - dynamics.avgRightPowerPhase.start + 360) % 360).toFixed(1)
          : '';
        const leftPeakArc = (typeof dynamics.avgLeftPowerPhase?.peakEnd === 'number' && typeof dynamics.avgLeftPowerPhase?.peakStart === 'number')
          ? ((dynamics.avgLeftPowerPhase.peakEnd - dynamics.avgLeftPowerPhase.peakStart + 360) % 360).toFixed(1)
          : '';
        const rightPeakArc = (typeof dynamics.avgRightPowerPhase?.peakEnd === 'number' && typeof dynamics.avgRightPowerPhase?.peakStart === 'number')
          ? ((dynamics.avgRightPowerPhase.peakEnd - dynamics.avgRightPowerPhase.peakStart + 360) % 360).toFixed(1)
          : '';

        const rows = [
          {
            'Category': 'Overall Ride',
            'Subcategory': 'Averages',
            'Time (s)': summary.duration || '',
            'Share of Ride (%)': '100%',
            'Avg Power (W)': summary.avgPower || '',
            'L/R Balance (% Left)': dynamics.avgLeftBalance !== undefined ? `${Math.round(dynamics.avgLeftBalance)}%` : '',
            'L/R Balance (% Right)': dynamics.avgRightBalance !== undefined ? `${Math.round(dynamics.avgRightBalance)}%` : '',
            'Left PCO (mm)': dynamics.avgLeftPco !== undefined ? dynamics.avgLeftPco.toFixed(1) : '',
            'Right PCO (mm)': dynamics.avgRightPco !== undefined ? dynamics.avgRightPco.toFixed(1) : '',
            'Left PP Start (°)': dynamics.avgLeftPowerPhase?.start ?? '',
            'Left PP End (°)': dynamics.avgLeftPowerPhase?.end ?? '',
            'Left PP Arc (°)': leftArc,
            'Right PP Start (°)': dynamics.avgRightPowerPhase?.start ?? '',
            'Right PP End (°)': dynamics.avgRightPowerPhase?.end ?? '',
            'Right PP Arc (°)': rightArc,
            'Left Peak PP Start (°)': dynamics.avgLeftPowerPhase?.peakStart ?? '',
            'Left Peak PP End (°)': dynamics.avgLeftPowerPhase?.peakEnd ?? '',
            'Left Peak PP Arc (°)': leftPeakArc,
            'Right Peak PP Start (°)': dynamics.avgRightPowerPhase?.peakStart ?? '',
            'Right Peak PP End (°)': dynamics.avgRightPowerPhase?.peakEnd ?? '',
            'Right Peak PP Arc (°)': rightPeakArc
          },
          {
            'Category': 'Rider Position',
            'Subcategory': 'Seated',
            'Time (s)': seatedSec,
            'Share of Ride (%)': `${seatedPct}%`,
            'Avg Power (W)': dynamics.seatedAvgPower ?? '',
            'L/R Balance (% Left)': '',
            'L/R Balance (% Right)': '',
            'Left PCO (mm)': '',
            'Right PCO (mm)': '',
            'Left PP Start (°)': '',
            'Left PP End (°)': '',
            'Left PP Arc (°)': '',
            'Right PP Start (°)': '',
            'Right PP End (°)': '',
            'Right PP Arc (°)': '',
            'Left Peak PP Start (°)': '',
            'Left Peak PP End (°)': '',
            'Left Peak PP Arc (°)': '',
            'Right Peak PP Start (°)': '',
            'Right Peak PP End (°)': '',
            'Right Peak PP Arc (°)': ''
          },
          {
            'Category': 'Rider Position',
            'Subcategory': 'Standing',
            'Time (s)': standingSec,
            'Share of Ride (%)': `${standingPct}%`,
            'Avg Power (W)': dynamics.standingAvgPower ?? '',
            'L/R Balance (% Left)': '',
            'L/R Balance (% Right)': '',
            'Left PCO (mm)': '',
            'Right PCO (mm)': '',
            'Left PP Start (°)': '',
            'Left PP End (°)': '',
            'Left PP Arc (°)': '',
            'Right PP Start (°)': '',
            'Right PP End (°)': '',
            'Right PP Arc (°)': '',
            'Left Peak PP Start (°)': '',
            'Left Peak PP End (°)': '',
            'Left Peak PP Arc (°)': '',
            'Right Peak PP Start (°)': '',
            'Right Peak PP End (°)': '',
            'Right Peak PP Arc (°)': ''
          }
        ];

        await exportToCSV(rows, `Velo_Dynamics_Summary_Postural_${Date.now()}.csv`);
      }
    },
    {
      label: 'Peak Power Window Dynamics (CSV)',
      icon: FileSpreadsheet,
      onClick: async () => {
        if (!peakWindowIndices) {
          const rows = [{
            'Status': 'No Peak Power Window Selected',
            'Note': 'Select a Peak Power Window (5s, 1m, 5m, 20m, 60m) above the dials to export interval dynamics.'
          }];
          await exportToCSV(rows, `Velo_Dynamics_PeakPower_None_${Date.now()}.csv`);
          return;
        }

        const { start, end } = peakWindowIndices;
        const windowData = data.slice(start, end + 1);

        const lArc = ((computedMetrics.leftPP.end - computedMetrics.leftPP.start + 360) % 360).toFixed(1);
        const rArc = ((computedMetrics.rightPP.end - computedMetrics.rightPP.start + 360) % 360).toFixed(1);
        const lPeakArc = ((computedMetrics.leftPP.peakEnd - computedMetrics.leftPP.peakStart + 360) % 360).toFixed(1);
        const rPeakArc = ((computedMetrics.rightPP.peakEnd - computedMetrics.rightPP.peakStart + 360) % 360).toFixed(1);

        const powers = windowData.map(d => d.power || 0);
        const avgPower = powers.length > 0 ? Math.round(powers.reduce((a, b) => a + b, 0) / powers.length) : 0;

        const rows = windowData.map((pt, i) => ({
          'Interval Window': maxAvgPowerWindow,
          'Interval Avg Power (W)': avgPower,
          'Interval L/R Balance (% Left)': computedMetrics.leftBalance.toFixed(1),
          'Interval Left PCO (mm)': computedMetrics.leftPco.toFixed(1),
          'Interval Right PCO (mm)': computedMetrics.rightPco.toFixed(1),
          'Interval Left PP Arc (°)': lArc,
          'Interval Right PP Arc (°)': rArc,
          'Interval Left Peak PP Arc (°)': lPeakArc,
          'Interval Right Peak PP Arc (°)': rPeakArc,
          'Second in Window': i + 1,
          'Timestamp': pt.timestamp || '',
          'Instant Power (W)': pt.power ?? '',
          'Instant Cadence (rpm)': pt.cadence ?? '',
          'Instant L/R Balance (% Left)': pt.leftRightBalance ?? '',
          'Instant Left PCO (mm)': pt.leftPco ?? '',
          'Instant Right PCO (mm)': pt.rightPco ?? '',
          'Instant Left PP Start (°)': pt.leftPowerPhaseStart ?? '',
          'Instant Left PP End (°)': pt.leftPowerPhaseEnd ?? '',
          'Instant Right PP Start (°)': pt.rightPowerPhaseStart ?? '',
          'Instant Right PP End (°)': pt.rightPowerPhaseEnd ?? '',
          'Rider Position': pt.riderPosition === 'standing' ? 'Standing' : (pt.riderPosition === 'seated' ? 'Seated' : '')
        }));

        await exportToCSV(rows, `Velo_Dynamics_PeakPower_${maxAvgPowerWindow}_${Date.now()}.csv`);
      }
    }
  ];

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader
        icon={RotateCw}
        title="Cycling Dynamics"
        description="Dual-sided pedal stroke power phase, platform center offset, and seated/standing telemetry"
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        exportActions={exportActions}
        infoContent={{
          title: "Garmin Cycling Dynamics",
          description: "Dual-sided pedal telemetry showing Left/Right power balance, crank angle Power Phase (PP), Peak Power Phase (PPP), and Platform Center Offset (PCO) foot placement."
        }}
      />

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 sm:space-y-8"
          >
            {/* Top Garmin "Max Avg Power" segmented button bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-b border-app-border/40 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">
                  Max Avg Power
                </span>
                {peakWindowIndices && 'avgPower' in peakWindowIndices && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-bold">
                    {peakWindowIndices.avgPower} W Peak
                  </span>
                )}
              </div>

              {/* Segmented control buttons */}
              <div className="flex bg-app-bg/60 p-1 rounded-full border border-app-border self-start sm:self-auto overflow-x-auto no-scrollbar">
                {(['none', '5s', '1m', '5m', '20m', '60m'] as MaxAvgPowerWindow[]).map((window) => {
                  const labelMap: Record<MaxAvgPowerWindow, string> = {
                    none: 'None',
                    '5s': '5 sec',
                    '1m': '1 min',
                    '5m': '5 min',
                    '20m': '20 min',
                    '60m': '60 min'
                  };
                  const isActive = maxAvgPowerWindow === window;
                  return (
                    <button
                      key={window}
                      onClick={() => setMaxAvgPowerWindow(window)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                        isActive
                          ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20"
                          : "text-app-muted hover:text-app-text"
                      )}
                    >
                      {labelMap[window]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Power Phase Heading & Dual Crank Circles */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2 flex-wrap justify-center">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-app-text">
                  Power Phase
                </h3>
                {maxAvgPowerWindow !== 'none' && peakWindowIndices ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
                    Peak {maxAvgPowerWindow}: {peakWindowIndices.avgPower} W Avg
                  </span>
                ) : computedMetrics.isInstantaneous && (
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30 flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Live Stroke: {computedMetrics.pointTimestamp ? new Date(computedMetrics.pointTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                    {computedMetrics.power !== undefined && (
                      <span className="text-orange-400 font-extrabold">• {computedMetrics.power} W</span>
                    )}
                    {computedMetrics.cadence !== undefined && computedMetrics.cadence > 0 && (
                      <span className="text-app-text">• {computedMetrics.cadence} RPM</span>
                    )}
                    {computedMetrics.riderPosition && (
                      <span className={cn(
                        "uppercase text-[9px] px-1.5 py-0.2 rounded font-bold ml-0.5",
                        computedMetrics.riderPosition === 'standing' ? "bg-orange-500/20 text-orange-400" : "bg-cyan-500/20 text-cyan-400"
                      )}>
                        {computedMetrics.riderPosition}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Intuitive Visual Legend for Crank Arcs */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-app-muted font-bold uppercase tracking-wider mb-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-full bg-[#86efac] inline-block" /> Power Phase (Drive)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-full bg-[#22c55e] inline-block" /> Peak Torque (Max)
                </span>
                {computedMetrics.isInstantaneous && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 rounded-full border border-dashed border-app-muted inline-block" /> Habitual Ride Avg
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 w-full max-w-5xl justify-items-center">
                <PedalClock
                  side="Left"
                  balance={computedMetrics.leftBalance}
                  hasBalanceData={data && data.some(p => typeof p.leftRightBalance === 'number')}
                  powerPhaseStart={computedMetrics.leftPP.start}
                  powerPhaseEnd={computedMetrics.leftPP.end}
                  peakPowerStart={computedMetrics.leftPP.peakStart}
                  peakPowerEnd={computedMetrics.leftPP.peakEnd}
                  habitualStart={computedMetrics.isInstantaneous ? dynamics.avgLeftPowerPhase?.start : undefined}
                  habitualEnd={computedMetrics.isInstantaneous ? dynamics.avgLeftPowerPhase?.end : undefined}
                />
                <PedalClock
                  side="Right"
                  balance={computedMetrics.rightBalance}
                  hasBalanceData={data && data.some(p => typeof p.leftRightBalance === 'number')}
                  powerPhaseStart={computedMetrics.rightPP.start}
                  powerPhaseEnd={computedMetrics.rightPP.end}
                  peakPowerStart={computedMetrics.rightPP.peakStart}
                  peakPowerEnd={computedMetrics.rightPP.peakEnd}
                  habitualStart={computedMetrics.isInstantaneous ? dynamics.avgRightPowerPhase?.start : undefined}
                  habitualEnd={computedMetrics.isInstantaneous ? dynamics.avgRightPowerPhase?.end : undefined}
                />
              </div>
            </div>

            {/* Horizontal Divider */}
            <div className="w-full border-t border-app-border/40" />

            {/* Bottom 2-Column Section: Platform Center Offset (PCO) & Position */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-app-border/40">
              {/* Left Column: Platform Center Offset (PCO) */}
              <div className="flex flex-col items-center pt-4 md:pt-0 md:pr-6">
                <h4 className="text-sm font-bold tracking-tight text-app-text mb-4">
                  Platform Center Offset (PCO)
                </h4>
                <div className="grid grid-cols-2 gap-4 w-full justify-items-center">
                  <PedalGraphic side="Left" offsetMm={computedMetrics.leftPco} />
                  <PedalGraphic side="Right" offsetMm={computedMetrics.rightPco} />
                </div>
              </div>

              {/* Right Column: Position (Garmin Solid Silhouette Cyclists) */}
              <div className="flex flex-col items-center pt-6 md:pt-0 md:pl-6">
                <h4 className="text-sm font-bold tracking-tight text-app-text mb-4">
                  Position
                </h4>

                <div className="grid grid-cols-2 gap-4 w-full justify-items-center">
                  {/* Seated Cyclist */}
                  <div className="flex flex-col items-center py-2">
                    <GarminRiderGraphic position="seated" />
                    <div className="text-center mt-2">
                      <div className="text-xl sm:text-2xl font-bold font-mono text-app-text">
                        {computedMetrics.seatedSeconds !== undefined ? `${Math.round(computedMetrics.seatedSeconds / 60)} min` : '--'}
                      </div>
                      <span className="text-[11px] text-app-muted font-medium block">Seated Time</span>
                      {computedMetrics.seatedAvgPower !== undefined && (
                        <span className="text-[10px] font-mono text-orange-400 font-bold block mt-0.5">
                          {computedMetrics.seatedAvgPower} W avg
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Standing Cyclist */}
                  <div className="flex flex-col items-center py-2">
                    <GarminRiderGraphic position="standing" />
                    <div className="text-center mt-2">
                      <div className="text-xl sm:text-2xl font-bold font-mono text-app-text">
                        {computedMetrics.standingSeconds !== undefined ? `${Math.round(computedMetrics.standingSeconds / 60)} min` : '--'}
                      </div>
                      <span className="text-[11px] text-app-muted font-medium block">Standing Time</span>
                      {computedMetrics.standingAvgPower !== undefined && (
                        <span className="text-[10px] font-mono text-orange-400 font-bold block mt-0.5">
                          {computedMetrics.standingAvgPower} W avg
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
