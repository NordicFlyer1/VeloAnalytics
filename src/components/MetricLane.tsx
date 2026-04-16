import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Area, 
  ReferenceLine, 
  ReferenceArea 
} from 'recharts';
import { cn } from '../lib/utils';
import { getZonesFromDefinitions } from '../services/metrics';

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
  height = 140,
  estimatedCp,
  cp,
  manualCP,
  powerZoneDefinitions,
  hrZoneDefinitions,
  maxHR,
  showCP = true,
  showECP = true
}: MetricLaneProps) => {
  const currentValue = activePoint !== null && data[activePoint] ? data[activePoint][metric] : null;

  return (
    <div className={cn(
      "relative group transition-all duration-300",
      !isLast && "border-b border-app-border/30"
    )}>
      {/* Lane Label & Value */}
      <div className="absolute left-4 top-3 z-10 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-app-muted group-hover:text-app-text transition-colors">
            {config.label} <span className="opacity-40 ml-1">({config.unit})</span>
          </span>
        </div>
        {currentValue !== null && (
          <div className="flex items-baseline gap-1 animate-in fade-in zoom-in-95 duration-200">
            <span className="text-sm font-mono font-bold text-app-text tabular-nums">
              {metric === 'speed' || metric === 'slope' ? Number(currentValue).toFixed(1) : Math.round(currentValue)}
            </span>
            <span className="text-[8px] font-bold text-app-muted uppercase">{config.unit}</span>
          </div>
        )}
      </div>

      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data}
            syncId={syncId}
            margin={{ top: 40, right: 30, left: 10, bottom: isLast ? 20 : 0 }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
          >
            <defs>
              <linearGradient id={`color-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={config.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} opacity={0.2} />
            <XAxis 
              dataKey="timestamp" 
              hide={!isLast}
              stroke="var(--app-muted)" 
              fontSize={9}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
              }}
            />
            <YAxis 
              yAxisId={metric}
              stroke="var(--app-muted)"
              fontSize={9}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              width={45}
              tickFormatter={(val) => Math.round(val).toString()}
            />
            
            {activePoint !== null && data[activePoint] && (
              <ReferenceLineAny 
                yAxisId={metric}
                x={data[activePoint].timestamp} 
                stroke="var(--app-text)" 
                strokeOpacity={0.8}
                strokeWidth={1}
                strokeDasharray="3 3" 
              />
            )}

            {/* CP Reference Lines for Power lane */}
            {metric === 'power' && estimatedCp && showECP && (
              <ReferenceLineAny 
                yAxisId="power" 
                y={estimatedCp} 
                stroke="#ef4444" 
                strokeDasharray="3 3" 
                strokeOpacity={0.7}
                strokeWidth={2}
              />
            )}
            {metric === 'power' && manualCP !== null && showCP && (
              <ReferenceLineAny 
                yAxisId="power" 
                y={cp} 
                stroke="#3b82f6" 
                strokeDasharray="3 3" 
                strokeOpacity={0.7}
                strokeWidth={2}
              />
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
                if (active && payload && payload.length) {
                  const val = payload[0].value;
                  return (
                    <div className="bg-app-card/90 backdrop-blur-md border border-app-border p-2 rounded-xl shadow-xl flex items-center gap-2">
                       <span className="text-xs font-mono font-bold text-app-text">
                        {metric === 'speed' || metric === 'slope' ? Number(val).toFixed(1) : Math.round(Number(val))}
                      </span>
                      <span className="text-[8px] font-bold text-app-muted uppercase">{config.unit}</span>
                    </div>
                  );
                }
                return null;
              }}
            />

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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

MetricLane.displayName = 'MetricLane';
