import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Area, 
  Line,
  ReferenceLine, 
  ReferenceArea 
} from 'recharts';
import { cn } from '../../lib/utils';
import { getZonesFromDefinitions, DEFAULT_FALLBACK_CP } from '../../services/metrics';

const ReferenceAreaAny = ReferenceArea as any;
const ReferenceLineAny = ReferenceLine as any;

interface MetricLaneProps {
  metric: string;
  config: { label: string, color: string, unit: string };
  data: any[];
  activePoint: number | null;
  onMouseMove: (e: any) => void;
  onMouseLeave: () => void;
  onClick: (e: any) => void;
  isLast: boolean;
  syncId: string;
  height?: number;
  estimatedCp?: number | null;
  cp?: number;
  manualCP?: number | null;
  powerZoneDefinitions?: any;
  hrZoneDefinitions?: any;
  maxHR?: number;
  showCP?: boolean;
  showECP?: boolean;
}

export const MetricLane = React.memo(({ 
  metric, 
  config, 
  data, 
  activePoint, 
  onMouseMove, 
  onMouseLeave, 
  onClick,
  isLast,
  syncId,
  height = 160,
  estimatedCp,
  cp,
  manualCP,
  powerZoneDefinitions,
  hrZoneDefinitions,
  maxHR,
  showCP = true,
  showECP = true
}: MetricLaneProps) => {
  // Format point value for header readout
  const formatValue = (val: any) => {
    if (val === null || val === undefined) return null;
    if (metric === 'riderPosition') {
      return val === 'standing' || val === 1 ? 'STANDING' : 'SEATED';
    }
    if (config.unit === 'KJ') return Number(val / 1000).toFixed(1);
    if (metric === 'speed' || metric === 'slope' || metric === 'leftPco' || metric === 'rightPco') {
      return Number(val).toFixed(1);
    }
    if (metric === 'leftRightBalance') {
      const left = Math.round(val);
      const right = 100 - left;
      return `${left}% L / ${right}% R`;
    }
    if (metric === 'powerPhaseStart' || metric === 'powerPhaseEnd' || metric === 'leftPowerPhaseStart' || metric === 'rightPowerPhaseStart' || metric === 'leftPowerPhaseEnd' || metric === 'rightPowerPhaseEnd') {
      return `${Math.round(val)}°`;
    }
    return Math.round(val).toString();
  };

  // Is this metric best visualized as scatter/point or continuous area
  const isPowerPhaseStart = metric === 'powerPhaseStart';
  const isPowerPhaseEnd = metric === 'powerPhaseEnd';
  const isDualDualDynamics = metric === 'torqueEffectiveness' || metric === 'pedalSmoothness';
  const isPowerPhaseMetric = isPowerPhaseStart || isPowerPhaseEnd;
  const isScatterMetric = metric === 'leftRightBalance' || metric === 'leftPco' || metric === 'rightPco' || isPowerPhaseMetric || isDualDualDynamics;
  const isPositionMetric = metric === 'riderPosition';

  // Convert raw data to normalized chart-ready data for Power Phase Start (wrapping around TDC 0)
  const chartData = React.useMemo(() => {
    if (!isPowerPhaseStart) return data;
    // Map angles > 180 (e.g. 340° to 359°) into negative degrees (-20° to -1°) centered around TDC 0°
    return data.map(p => {
      let left = p.leftPowerPhaseStart;
      let right = p.rightPowerPhaseStart;
      if (typeof left === 'number') {
        left = left > 180 ? left - 360 : left;
      }
      if (typeof right === 'number') {
        right = right > 180 ? right - 360 : right;
      }
      return {
        ...p,
        leftPowerPhaseStart: left,
        rightPowerPhaseStart: right
      };
    });
  }, [data, isPowerPhaseStart]);

  const currentValue = activePoint !== null && data[activePoint] ? data[activePoint][metric] : null;

  // Dual-value format for Power Phase Start/End and Dual Metrics
  const dualCurrentValue = React.useMemo(() => {
    if (activePoint === null || !data[activePoint]) return null;
    const pt = data[activePoint];
    if (metric === 'powerPhaseStart') {
      const left = pt.leftPowerPhaseStart;
      const right = pt.rightPowerPhaseStart;
      if (left === undefined && right === undefined) return null;
      return { left, right, leftColor: '#22c55e', rightColor: '#38bdf8' };
    }
    if (metric === 'powerPhaseEnd') {
      const left = pt.leftPowerPhaseEnd;
      const right = pt.rightPowerPhaseEnd;
      if (left === undefined && right === undefined) return null;
      return { left, right, leftColor: '#22c55e', rightColor: '#38bdf8' };
    }
    if (metric === 'torqueEffectiveness') {
      return { left: pt.leftTorqueEffectiveness, right: pt.rightTorqueEffectiveness, leftColor: '#22c55e', rightColor: '#38bdf8' };
    }
    if (metric === 'pedalSmoothness') {
      return { left: pt.leftPedalSmoothness, right: pt.rightPedalSmoothness, leftColor: '#22c55e', rightColor: '#38bdf8' };
    }
    return null;
  }, [activePoint, data, metric]);

  // Calculate Average benchmark for continuous & offset metrics (Garmin style "Avg: XX")
  const avgValue = React.useMemo(() => {
    if (!data || data.length === 0) return null;
    if (metric === 'riderPosition') return null;
    
    if (metric === 'leftPco') {
      const vals = data.map(p => p.leftPco).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      if (vals.length === 0) return null;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return `${avg >= 0 ? '+' : '−'}${Math.abs(Math.round(avg))} mm`;
    }

    if (metric === 'rightPco') {
      const vals = data.map(p => p.rightPco).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      if (vals.length === 0) return null;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return `${avg >= 0 ? '+' : '−'}${Math.abs(Math.round(avg))} mm`;
    }

    if (metric === 'leftRightBalance') {
      const vals = data.map(p => p.leftRightBalance).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      if (vals.length === 0) return null;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const l = Math.round(avg);
      return `${l}/${100 - l}%`;
    }

    let sum = 0;
    let count = 0;
    data.forEach(p => {
      const v = p[metric];
      if (typeof v === 'number' && Number.isFinite(v)) {
        sum += v;
        count++;
      }
    });
    if (count === 0) return null;
    const avg = sum / count;

    if (metric === 'speed') return `${avg.toFixed(1)} kph`;
    if (metric === 'cadence') return `${Math.round(avg)} rpm`;
    if (metric === 'heartRate') return `${Math.round(avg)} bpm`;
    if (metric === 'power') return `${Math.round(avg)} W`;
    if (metric === 'altitude') return `${Math.round(avg)} m`;
    return null;
  }, [data, metric]);

  return (
    <div className={cn(
      "relative group transition-all duration-300",
      !isLast && "border-b border-app-border/30"
    )}>
      {/* Lane Label & Current Hover Value */}
      <div className="absolute left-4 top-3 z-10 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-app-muted group-hover:text-app-text transition-colors">
            {config.label} {config.unit && <span className="opacity-40 ml-1">({config.unit})</span>}
          </span>
        </div>

        {/* Dual-pedal value display (e.g. Left 12° / Right 14° or 85% / 88%) */}
        {dualCurrentValue ? (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
            {dualCurrentValue.left !== undefined && (
              <div className="flex items-baseline gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: dualCurrentValue.leftColor }} />
                <span className="text-xs font-mono font-bold text-app-text tabular-nums">
                  L: {Math.round(dualCurrentValue.left)}{config.unit}
                </span>
              </div>
            )}
            {dualCurrentValue.right !== undefined && (
              <div className="flex items-baseline gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: dualCurrentValue.rightColor }} />
                <span className="text-xs font-mono font-bold text-app-text tabular-nums">
                  R: {Math.round(dualCurrentValue.right)}{config.unit}
                </span>
              </div>
            )}
          </div>
        ) : (currentValue !== null && currentValue !== undefined && (
          <div className="flex items-baseline gap-1 animate-in fade-in zoom-in-95 duration-200">
            <span className="text-sm font-mono font-bold text-app-text tabular-nums">
              {formatValue(currentValue)}
            </span>
            {config.unit && metric !== 'leftRightBalance' && !metric.startsWith('powerPhase') && (
              <span className="text-[10px] font-bold text-app-muted uppercase">{config.unit}</span>
            )}
          </div>
        ))}
      </div>

      {/* Garmin-style Average Benchmark badge in top-right */}
      {avgValue && (
        <div className="absolute right-12 top-3 z-10 pointer-events-none hidden sm:block">
          <span className="text-[10px] font-mono text-app-muted font-bold tracking-wider">
            Avg: <span className="text-app-text">{avgValue}</span>
          </span>
        </div>
      )}

      {/* Special Garmin Rider Position Track (Seated / Standing discrete 2-tier bar) */}
      {isPositionMetric ? (
        <div 
          style={{ height: 90 }} 
          className="w-full relative px-4 sm:px-8 pt-9 pb-3 flex flex-col justify-between"
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onClick={onClick}
        >
          {/* Standing / Seated axis labels */}
          <div className="flex flex-col justify-between h-full select-none text-[9px] font-bold tracking-widest text-app-muted">
            <div className="flex items-center justify-between">
              <span>STANDING</span>
              {currentValue === 'standing' && (
                <span className="text-orange-400 font-bold text-[10px]">ACTIVE</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>SEATED</span>
              {currentValue === 'seated' && (
                <span className="text-cyan-400 font-bold text-[10px]">ACTIVE</span>
              )}
            </div>
          </div>

          {/* Interactive timeline visualization bar */}
          <div className="relative w-full h-4 bg-app-card rounded-md overflow-hidden border border-app-border/40 mt-1 flex">
            {data.map((p, idx) => {
              const isStanding = p.riderPosition === 'standing' || p.riderPosition === 1;
              return (
                <div 
                  key={idx}
                  className={cn(
                    "flex-1 h-full transition-colors",
                    isStanding ? "bg-orange-500 hover:bg-orange-400" : "bg-cyan-500 hover:bg-cyan-400"
                  )}
                  style={{ opacity: isStanding ? 0.95 : 0.75 }}
                />
              );
            })}
          </div>

          {/* Scrubber needle on position track */}
          {activePoint !== null && data.length > 0 && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none z-20"
              style={{ left: `${(activePoint / (data.length - 1)) * 100}%` }}
            />
          )}
        </div>
      ) : (
        <div style={{ height }} className="w-full min-w-0 min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={160}>
            <AreaChart 
              data={chartData}
              syncId={syncId}
              margin={{ 
                top: window.innerWidth < 768 ? 35 : 40, 
                right: window.innerWidth < 768 ? 5 : 30, 
                left: window.innerWidth < 768 ? -20 : 10, 
                bottom: isLast ? (window.innerWidth < 768 ? 10 : 20) : 0 
              }}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
              onClick={onClick}
            >
              <defs>
                <linearGradient id={`color-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.18}/>
                  <stop offset="95%" stopColor={config.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} opacity={0.2} />
              
              <XAxis 
                dataKey="timestamp" 
                hide={!isLast}
                stroke="var(--app-muted)" 
                fontSize={8}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                }}
              />
              
              <YAxis 
                yAxisId={metric}
                stroke="var(--app-muted)"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                domain={
                  metric === 'slope' 
                    ? [
                        (dataMin: number) => Math.floor(Math.min(dataMin, -5) / 5) * 5, 
                        (dataMax: number) => Math.ceil(Math.max(dataMax, 5) / 5) * 5
                      ]
                    : metric === 'leftRightBalance'
                    ? [0, 100] // Full 0-100% scale with 50/50 center matching Garmin
                    : metric === 'leftPco'
                    ? [-30, 30] // Top is +30, center 0, bottom -30
                    : metric === 'rightPco'
                    ? [30, -30] // Inverted axis matching Garmin: Top is -30, center 0, bottom +30
                    : isPowerPhaseStart
                    ? [-90, 90] // TDC 0 centered matching Garmin
                    : isPowerPhaseEnd
                    ? [135, 315] // BDC 180 centered matching Garmin
                    : (metric === 'torqueEffectiveness' || metric === 'pedalSmoothness')
                    ? [0, 100]
                    : ['auto', 'auto']
                }
                ticks={
                  metric === 'leftRightBalance' 
                    ? [0, 50, 100] 
                    : metric === 'leftPco'
                    ? [-30, -15, 0, 15, 30]
                    : metric === 'rightPco'
                    ? [30, 15, 0, -15, -30]
                    : isPowerPhaseStart
                    ? [-90, -45, 0, 45, 90]
                    : isPowerPhaseEnd
                    ? [135, 180, 225, 270, 315]
                    : (metric === 'torqueEffectiveness' || metric === 'pedalSmoothness')
                    ? [0, 50, 100]
                    : undefined
                }
                width={window.innerWidth < 768 ? 36 : 56}
                orientation="right"
                tickFormatter={(val) => {
                  if (config.unit === 'KJ') return (val / 1000).toFixed(1);
                  if (metric === 'leftPco' || metric === 'rightPco') {
                    return `${val > 0 ? '+' : ''}${Math.round(val)}`;
                  }
                  if (metric === 'leftRightBalance') {
                    if (val === 100) return '100% L';
                    if (val === 50) return '50/50';
                    if (val === 0) return '100% R';
                    return `${100 - Math.round(val)}/${Math.round(val)}`;
                  }
                  if (isPowerPhaseStart) {
                    if (val === 0) return 'TDC 0';
                    const deg = (val + 360) % 360;
                    return `${deg}`;
                  }
                  if (isPowerPhaseEnd) {
                    if (val === 180) return 'BDC 180';
                    return `${val}`;
                  }
                  return Math.round(val).toString();
                }}
              />
              
              {metric === 'slope' && (
                <ReferenceLineAny 
                  yAxisId="slope" 
                  y={0} 
                  stroke="var(--app-border)" 
                  strokeOpacity={0.4} 
                  strokeWidth={1}
                />
              )}

              {/* Garmin 50/50 L/R Balance Center Reference Line */}
              {metric === 'leftRightBalance' && (
                <ReferenceLineAny 
                  yAxisId="leftRightBalance" 
                  y={50} 
                  stroke="var(--app-muted)" 
                  strokeDasharray="3 3"
                  strokeOpacity={0.6} 
                  strokeWidth={1.5}
                  label={{ value: '50/50', fill: 'var(--app-muted)', fontSize: 9, position: 'insideRight' }}
                />
              )}

              {/* Garmin 0 mm Neutral Center for Left & Right PCO */}
              {(metric === 'leftPco' || metric === 'rightPco') && (
                <ReferenceLineAny 
                  yAxisId={metric} 
                  y={0} 
                  stroke="var(--app-border)" 
                  strokeDasharray="2 2"
                  strokeOpacity={0.6} 
                  strokeWidth={1.5}
                  label={{ value: 'CENTER 0', fill: 'var(--app-muted)', fontSize: 8, position: 'insideRight' }}
                />
              )}

              {/* TDC (0°) guide for Power Phase Start */}
              {isPowerPhaseStart && (
                <ReferenceLineAny 
                  yAxisId={metric} 
                  y={0} 
                  stroke="var(--app-muted)" 
                  strokeDasharray="3 3"
                  strokeOpacity={0.5} 
                  strokeWidth={1}
                  label={{ value: 'TDC 0', fill: 'var(--app-muted)', fontSize: 8, position: 'insideRight' }}
                />
              )}

              {/* BDC (180°) guide for Power Phase End */}
              {isPowerPhaseEnd && (
                <ReferenceLineAny 
                  yAxisId={metric} 
                  y={180} 
                  stroke="var(--app-muted)" 
                  strokeDasharray="3 3"
                  strokeOpacity={0.5} 
                  strokeWidth={1}
                  label={{ value: 'BDC 180', fill: 'var(--app-muted)', fontSize: 8, position: 'insideRight' }}
                />
              )}

              {/* Active Scrubber Needle */}
              {activePoint !== null && data[activePoint] && (
                <ReferenceLineAny 
                  yAxisId={metric}
                  x={data[activePoint].timestamp} 
                  stroke="var(--app-muted)" 
                  strokeOpacity={0.8}
                  strokeWidth={1}
                />
              )}

              {/* CP Reference Lines for Power lane */}
              {metric === 'power' && (
                <>
                  {showECP && (estimatedCp || DEFAULT_FALLBACK_CP) && (
                    <ReferenceLineAny 
                      yAxisId="power" 
                      y={estimatedCp || DEFAULT_FALLBACK_CP} 
                      stroke="var(--app-muted)" 
                      strokeDasharray="4 4" 
                      strokeOpacity={0.5}
                      strokeWidth={1.5}
                    />
                  )}
                  {showCP && (
                    <ReferenceLineAny 
                      yAxisId="power" 
                      y={(manualCP && manualCP > 0) ? manualCP : (estimatedCp || DEFAULT_FALLBACK_CP)} 
                      stroke="var(--app-muted)" 
                      strokeDasharray="4 4" 
                      strokeOpacity={0.5}
                      strokeWidth={1.5}
                    />
                  )}
                </>
              )}

              {/* Zone Highlighting */}
              {metric === 'power' && powerZoneDefinitions && cp && getZonesFromDefinitions(powerZoneDefinitions, cp).map((z) => (
                <ReferenceAreaAny 
                  key={z.name} 
                  yAxisId="power" 
                  y1={z.min} 
                  y2={z.max >= 9999 ? 10000 : z.max} 
                  fill={z.color} 
                  fillOpacity={0.02} 
                  stroke="none"
                />
              ))}
              {metric === 'heartRate' && hrZoneDefinitions && maxHR && getZonesFromDefinitions(hrZoneDefinitions, maxHR).map((z) => (
                <ReferenceAreaAny 
                  key={z.name} 
                  yAxisId="heartRate" 
                  y1={z.min} 
                  y2={z.max >= 9999 ? 1000 : z.max} 
                  fill={z.color} 
                  fillOpacity={0.02} 
                  stroke="none"
                />
              ))}

              <Tooltip 
                isAnimationActive={false}
                cursor={false}
                content={({ active, payload }) => {
                  if (window.innerWidth < 768) return null;
                  if (active && payload && payload.length) {
                    const val = payload[0].value;
                    return (
                      <div className="bg-app-card/90 backdrop-blur-md border border-app-border p-2 rounded-xl shadow-xl flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-app-text">
                          {formatValue(val)}
                        </span>
                        {config.unit && <span className="text-[10px] font-bold text-app-muted uppercase">{config.unit}</span>}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* If it's a scatter metric (Dynamics), render as scatter dots; otherwise Area fill */}
              {isPowerPhaseStart ? (
                <>
                  <Line
                    yAxisId={metric}
                    type="monotone"
                    dataKey="leftPowerPhaseStart"
                    stroke="#22c55e"
                    strokeWidth={0}
                    dot={{ r: 2.5, fill: '#22c55e', fillOpacity: 0.75, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#22c55e', fillOpacity: 1 }}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId={metric}
                    type="monotone"
                    dataKey="rightPowerPhaseStart"
                    stroke="#38bdf8"
                    strokeWidth={0}
                    dot={{ r: 2.5, fill: '#38bdf8', fillOpacity: 0.75, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#38bdf8', fillOpacity: 1 }}
                    isAnimationActive={false}
                  />
                </>
              ) : isPowerPhaseEnd ? (
                <>
                  <Line
                    yAxisId={metric}
                    type="monotone"
                    dataKey="leftPowerPhaseEnd"
                    stroke="#22c55e"
                    strokeWidth={0}
                    dot={{ r: 2.5, fill: '#22c55e', fillOpacity: 0.75, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#22c55e', fillOpacity: 1 }}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId={metric}
                    type="monotone"
                    dataKey="rightPowerPhaseEnd"
                    stroke="#38bdf8"
                    strokeWidth={0}
                    dot={{ r: 2.5, fill: '#38bdf8', fillOpacity: 0.75, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#38bdf8', fillOpacity: 1 }}
                    isAnimationActive={false}
                  />
                </>
              ) : metric === 'torqueEffectiveness' ? (
                <>
                  <Line
                    yAxisId={metric}
                    type="monotone"
                    dataKey="leftTorqueEffectiveness"
                    stroke="#22c55e"
                    strokeWidth={0}
                    dot={{ r: 2.5, fill: '#22c55e', fillOpacity: 0.75, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#22c55e', fillOpacity: 1 }}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId={metric}
                    type="monotone"
                    dataKey="rightTorqueEffectiveness"
                    stroke="#38bdf8"
                    strokeWidth={0}
                    dot={{ r: 2.5, fill: '#38bdf8', fillOpacity: 0.75, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#38bdf8', fillOpacity: 1 }}
                    isAnimationActive={false}
                  />
                </>
              ) : metric === 'pedalSmoothness' ? (
                <>
                  <Line
                    yAxisId={metric}
                    type="monotone"
                    dataKey="leftPedalSmoothness"
                    stroke="#22c55e"
                    strokeWidth={0}
                    dot={{ r: 2.5, fill: '#22c55e', fillOpacity: 0.75, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#22c55e', fillOpacity: 1 }}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId={metric}
                    type="monotone"
                    dataKey="rightPedalSmoothness"
                    stroke="#38bdf8"
                    strokeWidth={0}
                    dot={{ r: 2.5, fill: '#38bdf8', fillOpacity: 0.75, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#38bdf8', fillOpacity: 1 }}
                    isAnimationActive={false}
                  />
                </>
              ) : isScatterMetric ? (
                <Line
                  yAxisId={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={config.color}
                  strokeWidth={0}
                  dot={{ r: 2.5, fill: config.color, fillOpacity: 0.65, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: config.color, fillOpacity: 1 }}
                  isAnimationActive={false}
                />
              ) : (
                <Area 
                  yAxisId={metric}
                  type="monotone" 
                  dataKey={metric} 
                  stroke={config.color} 
                  strokeWidth={1.5}
                  fillOpacity={1} 
                  fill={`url(#color-${metric})`} 
                  connectNulls
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

MetricLane.displayName = 'MetricLane';
