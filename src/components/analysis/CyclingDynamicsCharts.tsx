import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCw, 
  Image, 
  ChartArea, 
  Lock, 
  Unlock, 
  HelpCircle,
  SlidersHorizontal
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { SectionHeader, ExportAction } from '../ui/SectionHeader';
import { CyclingDataPoint, ActivitySummary } from '../../types';
import { exportComponentAsImage } from '../../lib/chartExport';
import { cn } from '../../lib/utils';

const ReferenceLineAny = ReferenceLine as any;

interface CyclingDynamicsChartsProps {
  summary: ActivitySummary;
  data: CyclingDataPoint[];
  dynamicsMetricsConfig: Record<string, { label: string; color: string; unit: string }>;
  activePoint: number | null;
  setActivePoint: (index: number | null) => void;
  isPointLocked: boolean;
  setIsPointLocked: (locked: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

export const CyclingDynamicsCharts: React.FC<CyclingDynamicsChartsProps> = ({
  summary,
  data,
  dynamicsMetricsConfig,
  activePoint,
  setActivePoint,
  isPointLocked,
  setIsPointLocked,
  isExpanded,
  setIsExpanded
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  // Strict canonical Garmin dynamics hierarchy:
  // L/R Balance MUST ALWAYS BE FIRST (both as the first button and first timeline)
  const CANONICAL_DYNAMICS_ORDER = [
    'leftRightBalance',
    'leftPco',
    'rightPco',
    'powerPhaseStart',
    'powerPhaseEnd',
    'riderPosition',
    'torqueEffectiveness',
    'pedalSmoothness'
  ];

  // Available metrics based on data presence, sorted strictly by canonical order
  const availableKeys = useMemo(() => {
    const rawKeys = Object.keys(dynamicsMetricsConfig);
    return rawKeys.sort((a, b) => {
      const idxA = CANONICAL_DYNAMICS_ORDER.indexOf(a);
      const idxB = CANONICAL_DYNAMICS_ORDER.indexOf(b);
      return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });
  }, [dynamicsMetricsConfig]);

  // Active dynamics lanes state
  const [activeDynamicsMetrics, setActiveDynamicsMetrics] = useState<string[]>(() => {
    const defaults = ['leftRightBalance', 'leftPco', 'rightPco', 'powerPhaseStart', 'powerPhaseEnd'];
    const filtered = defaults.filter(k => availableKeys.includes(k));
    const initial = filtered.length > 0 ? filtered : availableKeys;
    return [...initial].sort((a, b) => {
      const idxA = CANONICAL_DYNAMICS_ORDER.indexOf(a);
      const idxB = CANONICAL_DYNAMICS_ORDER.indexOf(b);
      return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
    });
  });

// Mode: Time (hh:mm:ss) vs Distance (km)
  const [xAxisMode, setXAxisMode] = useState<'time' | 'distance'>('time');

  // Color mode: Metric Canonical vs Instantaneous Power Heatmap
  const [colorMode, setColorMode] = useState<'metric' | 'power'>('metric');

  // Trend Baseline toggle (subtle rolling distribution center)
  const [showTrendBaseline, setShowTrendBaseline] = useState<boolean>(false);

  // Power Phase mode toggles (regular vs peak)
  const [ppStartMode, setPpStartMode] = useState<'start' | 'peakStart'>('start');
  const [ppEndMode, setPpEndMode] = useState<'end' | 'peakEnd'>('end');

  // Keep active list synced when availableKeys changes (e.g. file switched)
  React.useEffect(() => {
    setActiveDynamicsMetrics(prev => {
      const valid = prev.filter(k => availableKeys.includes(k));
      if (valid.length > 0) {
        return [...valid].sort((a, b) => {
          const idxA = CANONICAL_DYNAMICS_ORDER.indexOf(a);
          const idxB = CANONICAL_DYNAMICS_ORDER.indexOf(b);
          return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
        });
      }
      const defaults = ['leftRightBalance', 'leftPco', 'rightPco', 'powerPhaseStart', 'powerPhaseEnd'];
      const filtered = defaults.filter(k => availableKeys.includes(k));
      const res = filtered.length > 0 ? filtered : availableKeys;
      return [...res].sort((a, b) => {
        const idxA = CANONICAL_DYNAMICS_ORDER.indexOf(a);
        const idxB = CANONICAL_DYNAMICS_ORDER.indexOf(b);
        return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
      });
    });
  }, [availableKeys]);

  const toggleMetric = (key: string) => {
    setActiveDynamicsMetrics(prev => {
      const next = prev.includes(key)
        ? (prev.length > 1 ? prev.filter(m => m !== key) : prev)
        : [...prev, key];
      return [...next].sort((a, b) => {
        const idxA = CANONICAL_DYNAMICS_ORDER.indexOf(a);
        const idxB = CANONICAL_DYNAMICS_ORDER.indexOf(b);
        return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
      });
    });
  };

  const exportActions: ExportAction[] = [
    {
      label: 'Full Dynamics Panel (PNG)',
      icon: Image,
      onClick: async () => {
        if (containerRef.current) {
          await exportComponentAsImage(containerRef.current, `Velo_CyclingDynamics_Timeline_${Date.now()}.png`);
        }
      }
    },
    {
      label: 'Timeline Charts (PNG)',
      icon: ChartArea,
      onClick: async () => {
        if (chartAreaRef.current) {
          await exportComponentAsImage(chartAreaRef.current, `Velo_CyclingDynamics_Charts_${Date.now()}.png`);
        }
      }
    }
  ];

  // Garmin-aligned Power Heatmap Color Mapping:
  // Correlates each stroke's instantaneous biomechanics with power effort zones
  const cpValue = (summary as any).criticalPower || (summary as any).functionalThresholdPower || summary.xPower || (summary.avgPower ? summary.avgPower * 1.15 : 250);

  const getPowerZoneColor = (power: number | undefined): string => {
    if (typeof power !== 'number' || !Number.isFinite(power) || power <= 0) return '#64748b';
    const ratio = power / cpValue;
    if (ratio < 0.55) return '#06b6d4'; // Z1 Recovery (cyan)
    if (ratio < 0.75) return '#38bdf8'; // Z2 Endurance (sky)
    if (ratio < 0.90) return '#22c55e'; // Z3 Tempo (green)
    if (ratio < 1.05) return '#eab308'; // Z4 Threshold (yellow)
    if (ratio < 1.20) return '#f97316'; // Z5 VO2 Max (orange)
    return '#ec4899'; // Z6+ Anaerobic / Sprint (magenta)
  };

  const getPowerZoneLabel = (power: number | undefined): string => {
    if (typeof power !== 'number' || !Number.isFinite(power) || power <= 0) return 'Coasting';
    const ratio = power / cpValue;
    if (ratio < 0.55) return 'Z1 Recovery';
    if (ratio < 0.75) return 'Z2 Endurance';
    if (ratio < 0.90) return 'Z3 Tempo';
    if (ratio < 1.05) return 'Z4 Threshold';
    if (ratio < 1.20) return 'Z5 VO2 Max';
    return 'Z6+ Sprint';
  };

  // Normalized chart data with power heatmap colors & rolling distribution baselines
  const chartData = useMemo(() => {
    const TREND_WINDOW = 30; // 30-second rolling distribution baseline

    return data.map((p, idx) => {
      let lStart = ppStartMode === 'peakStart' ? p.leftPowerPhasePeakStart : p.leftPowerPhaseStart;
      let rStart = ppStartMode === 'peakStart' ? p.rightPowerPhasePeakStart : p.rightPowerPhaseStart;
      let lEnd = ppEndMode === 'peakEnd' ? p.leftPowerPhasePeakEnd : p.leftPowerPhaseEnd;
      let rEnd = ppEndMode === 'peakEnd' ? p.rightPowerPhasePeakEnd : p.rightPowerPhaseEnd;

      // Wrap start degrees > 180 to negative degrees centered around TDC 0
      if (typeof lStart === 'number') lStart = lStart > 180 ? lStart - 360 : lStart;
      if (typeof rStart === 'number') rStart = rStart > 180 ? rStart - 360 : rStart;

      const strokePowerColor = getPowerZoneColor(p.power);

      // Compute rolling 30s distribution baseline (if enabled)
      let trendBalance: number | undefined = undefined;
      let trendLeftPco: number | undefined = undefined;
      let trendRightPco: number | undefined = undefined;
      let trendLeftPPStart: number | undefined = undefined;
      let trendRightPPStart: number | undefined = undefined;
      let trendLeftPPEnd: number | undefined = undefined;
      let trendRightPPEnd: number | undefined = undefined;

      if (showTrendBaseline) {
        const wStart = Math.max(0, idx - Math.floor(TREND_WINDOW / 2));
        const wEnd = Math.min(data.length - 1, idx + Math.floor(TREND_WINDOW / 2));
        let balSum = 0, balCnt = 0;
        let lpSum = 0, lpCnt = 0;
        let rpSum = 0, rpCnt = 0;
        let lpsSum = 0, lpsCnt = 0;
        let rpsSum = 0, rpsCnt = 0;
        let lpeSum = 0, lpeCnt = 0;
        let rpeSum = 0, rpeCnt = 0;

        for (let i = wStart; i <= wEnd; i++) {
          const pt = data[i];
          if (typeof pt.leftRightBalance === 'number') { balSum += pt.leftRightBalance; balCnt++; }
          if (typeof pt.leftPco === 'number') { lpSum += pt.leftPco; lpCnt++; }
          if (typeof pt.rightPco === 'number') { rpSum += pt.rightPco; rpCnt++; }

          let curLPS = ppStartMode === 'peakStart' ? pt.leftPowerPhasePeakStart : pt.leftPowerPhaseStart;
          if (typeof curLPS === 'number') {
            if (curLPS > 180) curLPS -= 360;
            lpsSum += curLPS; lpsCnt++;
          }
          let curRPS = ppStartMode === 'peakStart' ? pt.rightPowerPhasePeakStart : pt.rightPowerPhaseStart;
          if (typeof curRPS === 'number') {
            if (curRPS > 180) curRPS -= 360;
            rpsSum += curRPS; rpsCnt++;
          }
          let curLPE = ppEndMode === 'peakEnd' ? pt.leftPowerPhasePeakEnd : pt.leftPowerPhaseEnd;
          if (typeof curLPE === 'number') { lpeSum += curLPE; lpeCnt++; }
          let curRPE = ppEndMode === 'peakEnd' ? pt.rightPowerPhasePeakEnd : pt.rightPowerPhaseEnd;
          if (typeof curRPE === 'number') { rpeSum += curRPE; rpeCnt++; }
        }

        if (balCnt >= 3) trendBalance = balSum / balCnt;
        if (lpCnt >= 3) trendLeftPco = lpSum / lpCnt;
        if (rpCnt >= 3) trendRightPco = rpSum / rpCnt;
        if (lpsCnt >= 3) trendLeftPPStart = lpsSum / lpsCnt;
        if (rpsCnt >= 3) trendRightPPStart = rpsSum / rpsCnt;
        if (lpeCnt >= 3) trendLeftPPEnd = lpeSum / lpeCnt;
        if (rpeCnt >= 3) trendRightPPEnd = rpeSum / rpeCnt;
      }

      return {
        ...p,
        chartIndex: idx,
        displayDistKm: p.distance ? (p.distance / 1000) : 0,
        chartLeftPowerPhaseStart: lStart,
        chartRightPowerPhaseStart: rStart,
        chartLeftPowerPhaseEnd: lEnd,
        chartRightPowerPhaseEnd: rEnd,
        strokePowerColor,
        trendBalance,
        trendLeftPco,
        trendRightPco,
        trendLeftPPStart,
        trendRightPPStart,
        trendLeftPPEnd,
        trendRightPPEnd,
      };
    });
  }, [data, ppStartMode, ppEndMode, showTrendBaseline, cpValue]);

  // Precomputed averages for badges (matching Garmin "Avg: X mm")
  const averages = useMemo(() => {
    const leftPcoVals = data.map(p => p.leftPco).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const rightPcoVals = data.map(p => p.rightPco).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const balVals = data.map(p => p.leftRightBalance).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    const avgLeftPco = leftPcoVals.length > 0 ? (leftPcoVals.reduce((a, b) => a + b, 0) / leftPcoVals.length) : null;
    const avgRightPco = rightPcoVals.length > 0 ? (rightPcoVals.reduce((a, b) => a + b, 0) / rightPcoVals.length) : null;
    const avgBal = balVals.length > 0 ? (balVals.reduce((a, b) => a + b, 0) / balVals.length) : null;

    return {
      leftPco: avgLeftPco !== null ? `${avgLeftPco >= 0 ? '+' : '−'}${Math.abs(Math.round(avgLeftPco))} MM` : null,
      rightPco: avgRightPco !== null ? `${avgRightPco >= 0 ? '+' : '−'}${Math.abs(Math.round(avgRightPco))} MM` : null,
      balance: avgBal !== null ? `${Math.round(avgBal)}/${100 - Math.round(avgBal)}%` : null
    };
  }, [data]);

  // Current scrubbed point
  const currentPt = activePoint !== null && data[activePoint] ? data[activePoint] : null;

  if (availableKeys.length === 0) return null;

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={RotateCw}
        title="Cycling Dynamics Timeline"
        description="Scrubbable dual-pedal stroke biomechanics, platform center offset, and crank power phases"
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        exportActions={exportActions}
        infoContent={{
          title: "Garmin Cycling Dynamics Timeline",
          description: "Inspect stroke-level biomechanical telemetry synchronized with your ride. Monitor L/R balance symmetry across intervals, track cleat foot alignment (PCO) across pedal strokes, and visualize exact propulsive crank arcs relative to Top Dead Center (TDC) and Bottom Dead Center (BDC)."
        }}
      />

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Top Controls Bar */}
            <div className="flex flex-col gap-3 pt-2 export-ignore">
              {/* Category Pills: Dynamics Metrics Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 w-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted ml-1 sm:ml-0 shrink-0 w-28 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-orange-500" />
                  Dynamics
                </span>
                <div className="flex items-center overflow-x-auto pb-1 sm:pb-0 gap-1 bg-app-bg/50 p-1 rounded-full border border-app-border scrollbar-hide no-scrollbar max-w-full">
                  {availableKeys.map(key => {
                    const cfg = dynamicsMetricsConfig[key];
                    const isActive = activeDynamicsMetrics.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleMetric(key)}
                        className={cn(
                          "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
                          isActive 
                            ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                            : "text-app-muted hover:text-app-text"
                        )}
                      >
                        {!isActive && (
                          <div 
                            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: cfg.color }} 
                          />
                        )}
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auxiliary Controls: Time vs Distance, Color Mode, Trend Baseline & Scrubber Locking */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-app-border/30">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Time vs Distance Capsule */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Axis:</span>
                    <div className="flex bg-app-bg/60 p-0.5 rounded-full border border-app-border">
                      <button
                        onClick={() => setXAxisMode('time')}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                          xAxisMode === 'time' ? "bg-orange-500 text-black shadow-sm" : "text-app-muted hover:text-app-text"
                        )}
                      >
                        Time
                      </button>
                      <button
                        onClick={() => setXAxisMode('distance')}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                          xAxisMode === 'distance' ? "bg-orange-500 text-black shadow-sm" : "text-app-muted hover:text-app-text"
                        )}
                      >
                        Distance
                      </button>
                    </div>
                  </div>

                  {/* Dot Color Mapping Capsule (Metric vs Power Intensity) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Dots:</span>
                    <div className="flex bg-app-bg/60 p-0.5 rounded-full border border-app-border">
                      <button
                        onClick={() => setColorMode('metric')}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all",
                          colorMode === 'metric' ? "bg-orange-500 text-black shadow-sm" : "text-app-muted hover:text-app-text"
                        )}
                      >
                        Metric Color
                      </button>
                      <button
                        onClick={() => setColorMode('power')}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1",
                          colorMode === 'power' ? "bg-orange-500 text-black shadow-sm" : "text-app-muted hover:text-app-text"
                        )}
                        title="Color-code dots by instantaneous power zone to correlate biomechanics with effort"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                        Power Heatmap
                      </button>
                    </div>
                  </div>

                  {/* Trend Baseline Toggle */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Trend:</span>
                    <button
                      onClick={() => setShowTrendBaseline(!showTrendBaseline)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all border",
                        showTrendBaseline 
                          ? "bg-orange-500/20 border-orange-500/40 text-orange-400" 
                          : "bg-app-bg/60 border-app-border text-app-muted hover:text-app-text"
                      )}
                    >
                      {showTrendBaseline ? '30s Baseline On' : 'Baseline Off'}
                    </button>
                  </div>
                </div>

                {/* Scrubber Lock Button (Aligned horizontally with Trend: Baseline) */}
                <div className="flex items-center">
                  <button
                    onClick={() => setIsPointLocked(!isPointLocked)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border transition-all",
                      isPointLocked 
                        ? "bg-red-500/10 border-red-500/30 text-red-400" 
                        : "bg-app-bg/60 border-app-border text-app-muted hover:text-app-text"
                    )}
                  >
                    {isPointLocked ? <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Unlock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                    {isPointLocked ? 'Scrubber Locked' : 'Lock Scrubber'}
                  </button>
                </div>
              </div>

              {/* Power Heatmap Legend Bar (Visible when Power Heatmap mode is selected) */}
              {colorMode === 'power' && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 sm:gap-3 py-1.5 px-3 rounded-xl bg-app-bg/40 border border-app-border/40 text-[9px] font-mono text-app-muted overflow-x-auto no-scrollbar"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider text-app-text shrink-0">Power Heatmap:</span>
                  <span className="flex items-center gap-1 shrink-0"><span className="w-2 h-2 rounded-full bg-[#06b6d4]" /> &lt;55% Z1</span>
                  <span className="flex items-center gap-1 shrink-0"><span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> 55-75% Z2</span>
                  <span className="flex items-center gap-1 shrink-0"><span className="w-2 h-2 rounded-full bg-[#22c55e]" /> 75-90% Z3</span>
                  <span className="flex items-center gap-1 shrink-0"><span className="w-2 h-2 rounded-full bg-[#eab308]" /> 90-105% Z4</span>
                  <span className="flex items-center gap-1 shrink-0"><span className="w-2 h-2 rounded-full bg-[#f97316]" /> 105-120% Z5</span>
                  <span className="flex items-center gap-1 shrink-0"><span className="w-2 h-2 rounded-full bg-[#ec4899]" /> &gt;120% Z6+</span>
                </motion.div>
              )}
            </div>

            {/* Stacked Dynamics Charts Area */}
            <div ref={chartAreaRef} className="flex flex-col border border-app-border/50 rounded-2xl overflow-hidden bg-app-bg/20 mt-2">
              {activeDynamicsMetrics.map((metricKey, idx) => {
                const isLast = idx === activeDynamicsMetrics.length - 1;
                const cfg = dynamicsMetricsConfig[metricKey] || { label: metricKey, color: '#f97316', unit: '' };

                // 1. Rider Position Track (Special discrete Seated/Standing bar)
                if (metricKey === 'riderPosition') {
                  const currentPos = currentPt ? currentPt.riderPosition : null;
                  return (
                    <div 
                      key={metricKey} 
                      className={cn("relative group transition-all duration-300 p-4", !isLast && "border-b border-app-border/30")}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-3 rounded-full bg-cyan-400" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted">
                            RIDER POSITION
                          </span>
                          {currentPos && (
                            <span className={cn(
                              "text-xs font-mono font-bold px-2 py-0.5 rounded-full uppercase ml-2",
                              currentPos === 'standing' ? "bg-orange-500/20 text-orange-400" : "bg-cyan-500/20 text-cyan-400"
                            )}>
                              {currentPos}
                            </span>
                          )}
                        </div>
                      </div>

                      <div 
                        className="relative w-full h-8 bg-app-card rounded-lg overflow-hidden border border-app-border/40 flex cursor-crosshair"
                        onMouseMove={(e) => {
                          if (!isPointLocked && containerRef.current) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                            setActivePoint(Math.floor(frac * (data.length - 1)));
                          }
                        }}
                        onMouseLeave={() => !isPointLocked && setActivePoint(null)}
                        onClick={() => setIsPointLocked(!isPointLocked)}
                      >
                        {data.map((p, pIdx) => {
                          const isStanding = p.riderPosition === 'standing' || p.riderPosition === (1 as any);
                          return (
                            <div 
                              key={pIdx} 
                              className={cn(
                                "flex-1 h-full transition-colors",
                                isStanding ? "bg-orange-500 hover:bg-orange-400" : "bg-cyan-500 hover:bg-cyan-400"
                              )}
                              style={{ opacity: isStanding ? 0.95 : 0.75 }}
                            />
                          );
                        })}

                        {/* Scrub needle on Rider Position */}
                        {activePoint !== null && data.length > 0 && (
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-20 shadow-md"
                            style={{ left: `${(activePoint / (data.length - 1)) * 100}%` }}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-bold text-app-muted mt-1 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> Seated
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Standing
                        </span>
                      </div>
                    </div>
                  );
                }

                // 2. Continuous Biomechanical Scatter Lanes (L/R Balance, Left PCO, Right PCO, Power Phase)
                const isLRBalance = metricKey === 'leftRightBalance';
                const isLeftPco = metricKey === 'leftPco';
                const isRightPco = metricKey === 'rightPco';
                const isPPStart = metricKey === 'powerPhaseStart';
                const isPPEnd = metricKey === 'powerPhaseEnd';
                const isDualTE = metricKey === 'torqueEffectiveness';
                const isDualPS = metricKey === 'pedalSmoothness';

                // Format current hover value in lane header
                let headerValue = null;
                if (currentPt) {
                  if (isLRBalance && typeof currentPt.leftRightBalance === 'number') {
                    const l = Math.round(currentPt.leftRightBalance);
                    headerValue = `${l}% L / ${100 - l}% R`;
                  } else if (isLeftPco && typeof currentPt.leftPco === 'number') {
                    headerValue = `${currentPt.leftPco >= 0 ? '+' : '−'}${Math.abs(Number(currentPt.leftPco)).toFixed(1)} MM`;
                  } else if (isRightPco && typeof currentPt.rightPco === 'number') {
                    headerValue = `${currentPt.rightPco >= 0 ? '+' : '−'}${Math.abs(Number(currentPt.rightPco)).toFixed(1)} MM`;
                  } else if (isPPStart) {
                    const l = ppStartMode === 'peakStart' ? currentPt.leftPowerPhasePeakStart : currentPt.leftPowerPhaseStart;
                    const r = ppStartMode === 'peakStart' ? currentPt.rightPowerPhasePeakStart : currentPt.rightPowerPhaseStart;
                    if (l !== undefined || r !== undefined) {
                      headerValue = `L: ${l !== undefined ? Math.round(l) + '°' : '--'} / R: ${r !== undefined ? Math.round(r) + '°' : '--'}`;
                    }
                  } else if (isPPEnd) {
                    const l = ppEndMode === 'peakEnd' ? currentPt.leftPowerPhasePeakEnd : currentPt.leftPowerPhaseEnd;
                    const r = ppEndMode === 'peakEnd' ? currentPt.rightPowerPhasePeakEnd : currentPt.rightPowerPhaseEnd;
                    if (l !== undefined || r !== undefined) {
                      headerValue = `L: ${l !== undefined ? Math.round(l) + '°' : '--'} / R: ${r !== undefined ? Math.round(r) + '°' : '--'}`;
                    }
                  } else if (isDualTE) {
                    headerValue = `L: ${currentPt.leftTorqueEffectiveness ?? '--'}% / R: ${currentPt.rightTorqueEffectiveness ?? '--'}%`;
                  } else if (isDualPS) {
                    headerValue = `L: ${currentPt.leftPedalSmoothness ?? '--'}% / R: ${currentPt.rightPedalSmoothness ?? '--'}%`;
                  }
                }

                // Domain & Ticks
                let yDomain: any = ['auto', 'auto'];
                let yTicks: number[] | undefined = undefined;

                if (isLRBalance) {
                  yDomain = [0, 100];
                  yTicks = [0, 50, 100];
                } else if (isLeftPco || isRightPco) {
                  yDomain = [-30, 30];
                  yTicks = [-30, -15, 0, 15, 30];
                } else if (isPPStart) {
                  // Centered on TDC 0
                  yDomain = [-90, 90];
                  yTicks = [-90, -45, 0, 45, 90];
                } else if (isPPEnd) {
                  // Full 0-360 range centered on BDC 180 so stroke endings never clip
                  yDomain = [0, 360];
                  yTicks = [0, 90, 180, 270, 360];
                } else if (isDualTE || isDualPS) {
                  yDomain = [0, 100];
                  yTicks = [0, 50, 100];
                }

                return (
                  <div 
                    key={metricKey} 
                    className={cn("relative group transition-all duration-300", !isLast && "border-b border-app-border/30")}
                  >
                    {/* Header Readout & Toggles */}
                    <div className="absolute left-4 top-3 z-10 flex items-center gap-3 pointer-events-none">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted">
                          {cfg.label}
                        </span>
                      </div>

                      {/* Header Value */}
                      {headerValue && (
                        <span className="text-xs font-mono font-bold text-app-text animate-in fade-in duration-150">
                          {headerValue}
                        </span>
                      )}

                      {/* Active Axis Position (Time or Distance) */}
                      {currentPt && (
                        <span className="text-[10px] font-mono text-app-muted font-medium ml-1">
                          • {xAxisMode === 'distance' 
                              ? `${currentPt.distance !== undefined ? (currentPt.distance / 1000).toFixed(2) : '0.00'} km`
                              : new Date(currentPt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            }
                        </span>
                      )}
                    </div>

                    {/* Mode selector for Power Phase Start/End - placed inboard from the right Y-axis scale */}
                    {isPPStart && (
                      <div className="absolute right-24 sm:right-28 top-2.5 z-20 pointer-events-auto">
                        <div className="flex bg-app-bg/80 p-0.5 rounded-full border border-app-border text-[9px] font-bold uppercase shadow-sm">
                          <button
                            onClick={() => setPpStartMode('start')}
                            className={cn(
                              "px-2 py-0.5 rounded-full transition-colors",
                              ppStartMode === 'start' ? "bg-orange-500 text-black font-extrabold" : "text-app-muted hover:text-app-text"
                            )}
                          >
                            Drive Start
                          </button>
                          <button
                            onClick={() => setPpStartMode('peakStart')}
                            className={cn(
                              "px-2 py-0.5 rounded-full transition-colors",
                              ppStartMode === 'peakStart' ? "bg-orange-500 text-black font-extrabold" : "text-app-muted hover:text-app-text"
                            )}
                          >
                            Peak Start
                          </button>
                        </div>
                      </div>
                    )}

                    {isPPEnd && (
                      <div className="absolute right-24 sm:right-28 top-2.5 z-20 pointer-events-auto">
                        <div className="flex bg-app-bg/80 p-0.5 rounded-full border border-app-border text-[9px] font-bold uppercase shadow-sm">
                          <button
                            onClick={() => setPpEndMode('end')}
                            className={cn(
                              "px-2 py-0.5 rounded-full transition-colors",
                              ppEndMode === 'end' ? "bg-orange-500 text-black font-extrabold" : "text-app-muted hover:text-app-text"
                            )}
                          >
                            Drive End
                          </button>
                          <button
                            onClick={() => setPpEndMode('peakEnd')}
                            className={cn(
                              "px-2 py-0.5 rounded-full transition-colors",
                              ppEndMode === 'peakEnd' ? "bg-orange-500 text-black font-extrabold" : "text-app-muted hover:text-app-text"
                            )}
                          >
                            Peak End
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Garmin-style Average Benchmark badge in top-right */}
                    {isLRBalance && averages.balance && (
                      <div className="absolute right-14 top-3 z-10 pointer-events-none hidden sm:block">
                        <span className="text-[10px] font-mono text-app-muted font-bold tracking-wider">
                          Avg: <span className="text-app-text">{averages.balance}</span>
                        </span>
                      </div>
                    )}
                    {isLeftPco && averages.leftPco && (
                      <div className="absolute right-14 top-3 z-10 pointer-events-none hidden sm:block">
                        <span className="text-[10px] font-mono text-app-muted font-bold tracking-wider">
                          Avg: <span className="text-app-text">{averages.leftPco}</span>
                        </span>
                      </div>
                    )}
                    {isRightPco && averages.rightPco && (
                      <div className="absolute right-14 top-3 z-10 pointer-events-none hidden sm:block">
                        <span className="text-[10px] font-mono text-app-muted font-bold tracking-wider">
                          Avg: <span className="text-app-text">{averages.rightPco}</span>
                        </span>
                      </div>
                    )}

                    {/* Chart Container - expanded height on the last lane to give X-axis generous clearance */}
                    <div style={{ height: isLast ? 185 : 160 }} className={cn("w-full min-w-0", isLast ? "min-h-[185px]" : "min-h-[160px]")}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          syncId="activity-sync"
                          margin={{ 
                            top: 40, 
                            right: window.innerWidth < 768 ? 8 : 30, 
                            left: window.innerWidth < 768 ? -20 : 10, 
                            bottom: isLast ? 32 : 5 
                          }}
                          onMouseMove={(e: any) => {
                            if (!isPointLocked && e && e.activeTooltipIndex !== undefined) {
                              setActivePoint(e.activeTooltipIndex);
                            }
                          }}
                          onMouseLeave={() => !isPointLocked && setActivePoint(null)}
                          onClick={(e: any) => {
                            if (e && e.activeTooltipIndex !== undefined) {
                              setIsPointLocked(!isPointLocked);
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} opacity={0.2} />

                          {/* X-Axis: Time vs Distance */}
                          <XAxis 
                            dataKey="timestamp"
                            hide={!isLast}
                            stroke="var(--app-muted)"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            dy={6}
                            tickFormatter={(val) => {
                              if (xAxisMode === 'distance') {
                                const pt = chartData.find(d => d.timestamp === val || (d.timestamp instanceof Date && val instanceof Date && d.timestamp.getTime() === val.getTime()));
                                return pt?.displayDistKm !== undefined ? `${pt.displayDistKm.toFixed(1)} km` : '';
                              }
                              const d = new Date(val);
                              return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                            }}
                          />

                          {/* Y-Axis */}
                          <YAxis 
                            yAxisId={metricKey}
                            stroke="var(--app-muted)"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            domain={yDomain}
                            ticks={yTicks}
                            orientation="right"
                            width={window.innerWidth < 768 ? 40 : 60}
                            tickFormatter={(val) => {
                              if (isLRBalance) {
                                if (val === 100) return '100% L';
                                if (val === 50) return '50/50';
                                if (val === 0) return '100% R';
                                return `${val}`;
                              }
                              if (isLeftPco || isRightPco) {
                                return `${val > 0 ? '+' : ''}${Math.round(val)}`;
                              }
                              if (isPPStart) {
                                if (val === 0) return 'TDC 0';
                                return `${val > 0 ? val : (val + 360) % 360}`;
                              }
                              if (isPPEnd) {
                                if (val === 180) return 'BDC 180';
                                if (val === 0 || val === 360) return 'TDC 0';
                                return `${val}°`;
                              }
                              return `${Math.round(val)}`;
                            }}
                          />

                          {/* 50/50 Center Line for L/R Balance */}
                          {isLRBalance && (
                            <ReferenceLineAny 
                              yAxisId={metricKey}
                              y={50}
                              stroke="var(--app-muted)"
                              strokeDasharray="3 3"
                              strokeOpacity={0.6}
                              strokeWidth={1.5}
                              label={{ value: '50/50', fill: 'var(--app-muted)', fontSize: 9, position: 'insideRight' }}
                            />
                          )}

                          {/* 0 mm Neutral Center for PCO */}
                          {(isLeftPco || isRightPco) && (
                            <ReferenceLineAny 
                              yAxisId={metricKey}
                              y={0}
                              stroke="var(--app-border)"
                              strokeDasharray="2 2"
                              strokeOpacity={0.7}
                              strokeWidth={1.5}
                              label={{ value: 'CENTER 0', fill: 'var(--app-muted)', fontSize: 8, position: 'insideRight' }}
                            />
                          )}

                          {/* TDC 0° line for Power Phase Start */}
                          {isPPStart && (
                            <ReferenceLineAny 
                              yAxisId={metricKey}
                              y={0}
                              stroke="var(--app-muted)"
                              strokeDasharray="3 3"
                              strokeOpacity={0.5}
                              strokeWidth={1}
                              label={{ value: 'TDC 0', fill: 'var(--app-muted)', fontSize: 8, position: 'insideRight' }}
                            />
                          )}

                          {/* BDC 180° line for Power Phase End */}
                          {isPPEnd && (
                            <ReferenceLineAny 
                              yAxisId={metricKey}
                              y={180}
                              stroke="var(--app-muted)"
                              strokeDasharray="3 3"
                              strokeOpacity={0.5}
                              strokeWidth={1}
                              label={{ value: 'BDC 180', fill: 'var(--app-muted)', fontSize: 8, position: 'insideRight' }}
                            />
                          )}

                          {/* Scrubber Needle */}
                          {activePoint !== null && data[activePoint] && (
                            <ReferenceLineAny 
                              yAxisId={metricKey}
                              x={data[activePoint].timestamp}
                              stroke="var(--app-muted)"
                              strokeOpacity={0.8}
                              strokeWidth={1}
                            />
                          )}

                          {/* Enriched Biomechanical & Power Tooltip */}
                          <Tooltip 
                            isAnimationActive={false}
                            cursor={false}
                            content={({ active, payload }) => {
                              if (window.innerWidth < 768) return null;
                              if (active && payload && payload.length) {
                                const p = payload[0].payload;
                                const zoneLabel = getPowerZoneLabel(p.power);
                                const zoneColor = getPowerZoneColor(p.power);
                                const timeStr = p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
                                const distStr = p.displayDistKm ? `${p.displayDistKm.toFixed(2)} km` : '';

                                return (
                                  <div className="bg-app-card/95 backdrop-blur-md border border-app-border p-2.5 rounded-xl shadow-2xl flex flex-col gap-1 min-w-[175px]">
                                    <div className="flex items-center justify-between text-[10px] text-app-muted border-b border-app-border/40 pb-1 font-mono">
                                      <span>{xAxisMode === 'distance' ? distStr : timeStr}</span>
                                      {p.riderPosition && (
                                        <span className={cn(
                                          "px-1.5 py-0.2 rounded uppercase font-bold text-[9px]",
                                          p.riderPosition === 'standing' ? "bg-orange-500/20 text-orange-400" : "bg-cyan-500/20 text-cyan-400"
                                        )}>
                                          {p.riderPosition}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between pt-0.5">
                                      <span className="text-xs font-mono font-bold text-app-text">
                                        {headerValue || payload[0].value}
                                      </span>
                                    </div>
                                    {typeof p.power === 'number' && (
                                      <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
                                        <span className="flex items-center gap-1.5 font-bold" style={{ color: zoneColor }}>
                                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: zoneColor }} />
                                          {p.power} W
                                        </span>
                                        <span className="text-[9px] text-app-muted font-medium">{zoneLabel}</span>
                                      </div>
                                    )}
                                    {typeof p.cadence === 'number' && p.cadence > 0 && (
                                      <div className="flex items-center justify-between text-[9px] font-mono text-app-muted">
                                        <span>Cadence:</span>
                                        <span className="text-app-text font-bold">{p.cadence} RPM</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />

                          {/* 1. Optional Distribution Trend Baselines (30s Rolling Mean) */}
                          {showTrendBaseline && isLRBalance && (
                            <Line
                              yAxisId={metricKey}
                              type="monotone"
                              dataKey="trendBalance"
                              stroke="#d946ef"
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              dot={false}
                              activeDot={false}
                              isAnimationActive={false}
                              opacity={0.65}
                            />
                          )}
                          {showTrendBaseline && isLeftPco && (
                            <Line
                              yAxisId={metricKey}
                              type="monotone"
                              dataKey="trendLeftPco"
                              stroke="#ef4444"
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              dot={false}
                              activeDot={false}
                              isAnimationActive={false}
                              opacity={0.65}
                            />
                          )}
                          {showTrendBaseline && isRightPco && (
                            <Line
                              yAxisId={metricKey}
                              type="monotone"
                              dataKey="trendRightPco"
                              stroke="#f59e0b"
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              dot={false}
                              activeDot={false}
                              isAnimationActive={false}
                              opacity={0.65}
                            />
                          )}
                          {showTrendBaseline && isPPStart && (
                            <>
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="trendLeftPPStart"
                                stroke="#22c55e"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                                activeDot={false}
                                isAnimationActive={false}
                                opacity={0.65}
                              />
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="trendRightPPStart"
                                stroke="#38bdf8"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                                activeDot={false}
                                isAnimationActive={false}
                                opacity={0.65}
                              />
                            </>
                          )}
                          {showTrendBaseline && isPPEnd && (
                            <>
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="trendLeftPPEnd"
                                stroke="#22c55e"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                                activeDot={false}
                                isAnimationActive={false}
                                opacity={0.65}
                              />
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="trendRightPPEnd"
                                stroke="#38bdf8"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                dot={false}
                                activeDot={false}
                                isAnimationActive={false}
                                opacity={0.65}
                              />
                            </>
                          )}

                          {/* 2. Render Discrete Scatter Dots (with optional Power Heatmap Color Mapping) */}
                          {isLRBalance ? (
                            <Line
                              yAxisId={metricKey}
                              type="monotone"
                              dataKey="leftRightBalance"
                              stroke="#d946ef"
                              strokeWidth={0}
                              dot={colorMode === 'power' 
                                ? (props: any) => {
                                    const { cx, cy, payload } = props;
                                    if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#d946ef'} fillOpacity={0.85} stroke="none" />;
                                  }
                                : { r: 2.5, fill: '#d946ef', fillOpacity: 0.75, strokeWidth: 0 }
                              }
                              activeDot={{ r: 5, fill: '#d946ef', fillOpacity: 1 }}
                              isAnimationActive={false}
                              connectNulls={false}
                            />
                          ) : isLeftPco ? (
                            <Line
                              yAxisId={metricKey}
                              type="monotone"
                              dataKey="leftPco"
                              stroke="#ef4444"
                              strokeWidth={0}
                              dot={colorMode === 'power' 
                                ? (props: any) => {
                                    const { cx, cy, payload } = props;
                                    if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#ef4444'} fillOpacity={0.85} stroke="none" />;
                                  }
                                : { r: 2.5, fill: '#ef4444', fillOpacity: 0.75, strokeWidth: 0 }
                              }
                              activeDot={{ r: 5, fill: '#ef4444', fillOpacity: 1 }}
                              isAnimationActive={false}
                              connectNulls={false}
                            />
                          ) : isRightPco ? (
                            <Line
                              yAxisId={metricKey}
                              type="monotone"
                              dataKey="rightPco"
                              stroke="#f59e0b"
                              strokeWidth={0}
                              dot={colorMode === 'power' 
                                ? (props: any) => {
                                    const { cx, cy, payload } = props;
                                    if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#f59e0b'} fillOpacity={0.85} stroke="none" />;
                                  }
                                : { r: 2.5, fill: '#f59e0b', fillOpacity: 0.75, strokeWidth: 0 }
                              }
                              activeDot={{ r: 5, fill: '#f59e0b', fillOpacity: 1 }}
                              isAnimationActive={false}
                              connectNulls={false}
                            />
                          ) : isPPStart ? (
                            <>
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="chartLeftPowerPhaseStart"
                                stroke="#22c55e"
                                strokeWidth={0}
                                dot={colorMode === 'power' 
                                  ? (props: any) => {
                                      const { cx, cy, payload } = props;
                                      if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                      return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#22c55e'} fillOpacity={0.85} stroke="none" />;
                                    }
                                  : { r: 2.5, fill: '#22c55e', fillOpacity: 0.8, strokeWidth: 0 }
                                }
                                activeDot={{ r: 5, fill: '#22c55e', fillOpacity: 1 }}
                                isAnimationActive={false}
                                connectNulls={false}
                              />
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="chartRightPowerPhaseStart"
                                stroke="#38bdf8"
                                strokeWidth={0}
                                dot={colorMode === 'power' 
                                  ? (props: any) => {
                                      const { cx, cy, payload } = props;
                                      if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                      return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#38bdf8'} fillOpacity={0.85} stroke="none" />;
                                    }
                                  : { r: 2.5, fill: '#38bdf8', fillOpacity: 0.8, strokeWidth: 0 }
                                }
                                activeDot={{ r: 5, fill: '#38bdf8', fillOpacity: 1 }}
                                isAnimationActive={false}
                                connectNulls={false}
                              />
                            </>
                          ) : isPPEnd ? (
                            <>
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="chartLeftPowerPhaseEnd"
                                stroke="#22c55e"
                                strokeWidth={0}
                                dot={colorMode === 'power' 
                                  ? (props: any) => {
                                      const { cx, cy, payload } = props;
                                      if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                      return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#22c55e'} fillOpacity={0.85} stroke="none" />;
                                    }
                                  : { r: 2.5, fill: '#22c55e', fillOpacity: 0.8, strokeWidth: 0 }
                                }
                                activeDot={{ r: 5, fill: '#22c55e', fillOpacity: 1 }}
                                isAnimationActive={false}
                                connectNulls={false}
                              />
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="chartRightPowerPhaseEnd"
                                stroke="#38bdf8"
                                strokeWidth={0}
                                dot={colorMode === 'power' 
                                  ? (props: any) => {
                                      const { cx, cy, payload } = props;
                                      if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                      return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#38bdf8'} fillOpacity={0.85} stroke="none" />;
                                    }
                                  : { r: 2.5, fill: '#38bdf8', fillOpacity: 0.8, strokeWidth: 0 }
                                }
                                activeDot={{ r: 5, fill: '#38bdf8', fillOpacity: 1 }}
                                isAnimationActive={false}
                                connectNulls={false}
                              />
                            </>
                          ) : isDualTE ? (
                            <>
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="leftTorqueEffectiveness"
                                stroke="#22c55e"
                                strokeWidth={0}
                                dot={colorMode === 'power' 
                                  ? (props: any) => {
                                      const { cx, cy, payload } = props;
                                      if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                      return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#22c55e'} fillOpacity={0.85} stroke="none" />;
                                    }
                                  : { r: 2.5, fill: '#22c55e', fillOpacity: 0.75, strokeWidth: 0 }
                                }
                                activeDot={{ r: 5, fill: '#22c55e', fillOpacity: 1 }}
                                isAnimationActive={false}
                              />
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="rightTorqueEffectiveness"
                                stroke="#38bdf8"
                                strokeWidth={0}
                                dot={colorMode === 'power' 
                                  ? (props: any) => {
                                      const { cx, cy, payload } = props;
                                      if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                      return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#38bdf8'} fillOpacity={0.85} stroke="none" />;
                                    }
                                  : { r: 2.5, fill: '#38bdf8', fillOpacity: 0.75, strokeWidth: 0 }
                                }
                                activeDot={{ r: 5, fill: '#38bdf8', fillOpacity: 1 }}
                                isAnimationActive={false}
                              />
                            </>
                          ) : isDualPS ? (
                            <>
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="leftPedalSmoothness"
                                stroke="#22c55e"
                                strokeWidth={0}
                                dot={colorMode === 'power' 
                                  ? (props: any) => {
                                      const { cx, cy, payload } = props;
                                      if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                      return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#22c55e'} fillOpacity={0.85} stroke="none" />;
                                    }
                                  : { r: 2.5, fill: '#22c55e', fillOpacity: 0.75, strokeWidth: 0 }
                                }
                                activeDot={{ r: 5, fill: '#22c55e', fillOpacity: 1 }}
                                isAnimationActive={false}
                              />
                              <Line
                                yAxisId={metricKey}
                                type="monotone"
                                dataKey="rightPedalSmoothness"
                                stroke="#38bdf8"
                                strokeWidth={0}
                                dot={colorMode === 'power' 
                                  ? (props: any) => {
                                      const { cx, cy, payload } = props;
                                      if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) return null;
                                      return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.5} fill={payload.strokePowerColor || '#38bdf8'} fillOpacity={0.85} stroke="none" />;
                                    }
                                  : { r: 2.5, fill: '#38bdf8', fillOpacity: 0.75, strokeWidth: 0 }
                                }
                                activeDot={{ r: 5, fill: '#38bdf8', fillOpacity: 1 }}
                                isAnimationActive={false}
                              />
                            </>
                          ) : null}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
