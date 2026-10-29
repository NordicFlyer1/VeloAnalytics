import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart as LineChartIcon, Image } from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { SectionHeader, ExportAction } from '../ui/SectionHeader';
import { cn } from '../../lib/utils';
import { exportComponentAsImage } from '../../lib/chartExport';

interface PmcAnalysisProps {
  isPmcExpanded: boolean;
  setIsPmcExpanded: (expanded: boolean) => void;
  currentPMC: any;
  pmcData: any[];
  pmcFocus: string | null;
  setPmcFocus: (focus: string | null) => void;
  pmcDateRange: 'all' | '1year' | '6months' | '3months' | '6weeks';
  setPmcDateRange: (range: 'all' | '1year' | '6months' | '3months' | '6weeks') => void;
}

export const PmcAnalysis: React.FC<PmcAnalysisProps> = ({
  isPmcExpanded,
  setIsPmcExpanded,
  currentPMC,
  pmcData,
  pmcFocus,
  setPmcFocus,
  pmcDateRange,
  setPmcDateRange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const exportActions: ExportAction[] = [
    {
      label: 'Full Panel (PNG)',
      icon: Image,
      onClick: async () => {
        if (containerRef.current) {
          const fileName = `Velo_PMC_Full_${new Date().getTime()}.png`;
          await exportComponentAsImage(containerRef.current, fileName);
        }
      }
    }
  ];

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={LineChartIcon}
        title="PMC Analysis"
        description="Performance Management Chart showing fitness, fatigue, form, and daily training impulse"
        isExpanded={isPmcExpanded}
        onToggle={() => setIsPmcExpanded(!isPmcExpanded)}
        exportActions={exportActions}
        infoContent={{
          title: "PMC Analysis & Training Impulse",
          description: "Tracks continuous Long-Term Stress (Fitness), Short-Term Stress (Fatigue), and Stress Balance (Form) over time, driven by your daily training dose (BikeScore™) and Relative Intensity (RI) impulse history."
        }}
      />

      <AnimatePresence>
        {isPmcExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 export-ignore">
                {/* Range Selector - Aligned under Title (Top Left) */}
                <div className="flex items-center gap-1 bg-app-bg/50 p-1 rounded-full border border-app-border w-full md:w-auto overflow-x-auto sm:overflow-x-visible">
                  {[
                    { id: 'all', label: 'ALL' },
                    { id: '1year', label: '1Y' },
                    { id: '6months', label: '6M' },
                    { id: '3months', label: '3M' },
                    { id: '6weeks', label: '6W' }
                  ].map(range => (
                    <button
                      key={range.id}
                      onClick={() => setPmcDateRange(range.id as any)}
                      className={cn(
                        "flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                        pmcDateRange === range.id 
                          ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                          : "text-app-muted hover:text-app-text"
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Canvas: Pure Banister Impulse-Response Curves (Fitness, Fatigue, Form) */}
              <div className="h-[310px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={pmcData} syncId="velo-pmc-sync">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      tickFormatter={(str) => {
                        const [y, m, d] = str.split('-').map(Number);
                        return format(new Date(y, m - 1, d), 'MMM d');
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="fitness" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      axisLine={false} 
                      tickLine={false} 
                      domain={['auto', 'auto']}
                    />
                    <YAxis 
                      yAxisId="form" 
                      orientation="right" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <ReferenceLine yAxisId="form" y={0} stroke="var(--app-border)" strokeDasharray="3 3" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--app-tooltip-bg)', 
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid var(--app-border)', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        color: 'var(--app-text)',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: 'var(--app-text)', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}
                      labelFormatter={(label, payload) => {
                        const isPredictive = payload?.[0]?.payload?.isPredictive;
                        const [y, m, d] = label.split('-').map(Number);
                        const date = format(new Date(y, m - 1, d), 'EEEE, MMMM d, yyyy');
                        return isPredictive ? `${date} (Projected)` : date;
                      }}
                      formatter={(value: any, name: string) => {
                        return [`${Number(value).toFixed(1)} PTS`, name];
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      onMouseEnter={(e) => setPmcFocus(e.dataKey as string)}
                      onMouseLeave={() => setPmcFocus(null)}
                      wrapperStyle={{ 
                        paddingTop: '6px',
                        fontSize: '10px', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.1em', 
                        color: 'var(--app-muted)' 
                      }}
                    />
                    {pmcData.some(d => d.isPredictive) && (() => {
                      const firstPredictive = pmcData.find(d => d.isPredictive);
                      if (firstPredictive) {
                        return (
                          <ReferenceArea 
                            yAxisId="fitness"
                            x1={firstPredictive.date} 
                            fill="rgba(249, 115, 22, 0.05)" 
                            stroke="none"
                            label={{ 
                              value: 'PREDICTED DECAY', 
                              position: 'insideTopRight', 
                              fill: 'var(--app-muted)', 
                              fontSize: 9, 
                              fontWeight: 'bold',
                              letterSpacing: '0.1em',
                              offset: 10
                            }}
                          />
                        );
                      }
                      return null;
                    })()}
                    <Line 
                      yAxisId="fitness" 
                      type="monotone" 
                      dataKey="lts" 
                      stroke="#3b82f6" 
                      strokeWidth={pmcFocus === 'lts' ? 3.5 : 2} 
                      opacity={pmcFocus === 'lts' ? 1 : pmcFocus ? 0.2 : 1}
                      dot={false} 
                      name="FITNESS (LTS)" 
                    />
                    <Line 
                      yAxisId="fitness" 
                      type="monotone" 
                      dataKey="sts" 
                      stroke="#ef4444" 
                      strokeWidth={pmcFocus === 'sts' ? 3.5 : 2} 
                      opacity={pmcFocus === 'sts' ? 1 : pmcFocus ? 0.2 : 1}
                      dot={false} 
                      name="FATIGUE (STS)" 
                    />
                    <Area 
                      yAxisId="form" 
                      type="monotone" 
                      dataKey="sb" 
                      fill="#22c55e" 
                      stroke="#22c55e" 
                      strokeWidth={pmcFocus === 'sb' ? 2.5 : 1}
                      fillOpacity={pmcFocus === 'sb' ? 0.35 : 0.12} 
                      opacity={pmcFocus === 'sb' ? 1 : pmcFocus ? 0.2 : 1}
                      name="FORM (SB)" 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Sub-Lane Divider & Legends */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-app-border/40">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">
                    Daily Training Dose & Intensity
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-bold border border-orange-500/20">
                    IMPULSE & RI
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest font-bold text-app-muted">
                  <span 
                    className={cn(
                      "flex items-center gap-1.5 cursor-pointer transition-colors", 
                      pmcFocus === 'bikeScore' ? "text-orange-500 font-black" : "hover:text-orange-500"
                    )}
                    onMouseEnter={() => setPmcFocus('bikeScore')} 
                    onMouseLeave={() => setPmcFocus(null)}
                  >
                    <span className="w-2.5 h-2.5 rounded-xs bg-orange-500 inline-block shadow-sm" />
                    BikeScore (Dose)
                  </span>
                  <span 
                    className={cn(
                      "flex items-center gap-1.5 cursor-pointer transition-colors", 
                      pmcFocus === 'relativeIntensity' ? "text-amber-500 font-black" : "hover:text-amber-500"
                    )}
                    onMouseEnter={() => setPmcFocus('relativeIntensity')} 
                    onMouseLeave={() => setPmcFocus(null)}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block ring-1 ring-amber-400/40" />
                    Relative Intensity (RI)
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 text-app-muted/60">
                    <span className="w-3 border-t border-dashed border-amber-500/60 inline-block" />
                    1.00 Threshold
                  </span>
                </div>
              </div>

              {/* Lower Canvas: Synchronized Daily Impulse Sub-Lane (BikeScore Bars & RI Line/Dots) */}
              <div className="h-[135px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={pmcData} syncId="velo-pmc-sync">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      tickFormatter={(str) => {
                        const [y, m, d] = str.split('-').map(Number);
                        return format(new Date(y, m - 1, d), 'MMM d');
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="dose" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      axisLine={false} 
                      tickLine={false}
                      domain={[0, 'auto']}
                      tickFormatter={(v) => String(Math.round(v))}
                    />
                    <YAxis 
                      yAxisId="ri" 
                      orientation="right" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      axisLine={false} 
                      tickLine={false}
                      domain={[0, 1.4]}
                      ticks={[0.5, 0.8, 1.0, 1.2]}
                      tickFormatter={(v) => Number(v).toFixed(1)}
                    />
                    <ReferenceLine yAxisId="ri" y={1.0} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.35} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--app-tooltip-bg)', 
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid var(--app-border)', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        color: 'var(--app-text)',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: 'var(--app-text)', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}
                      labelFormatter={(label, payload) => {
                        const isPredictive = payload?.[0]?.payload?.isPredictive;
                        const [y, m, d] = label.split('-').map(Number);
                        const date = format(new Date(y, m - 1, d), 'EEEE, MMMM d, yyyy');
                        return isPredictive ? `${date} (Projected)` : date;
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === 'BIKESCORE') return [`${Math.round(value)} PTS`, 'BIKESCORE'];
                        if (name === 'RELATIVE INTENSITY (RI)') return [`${Number(value).toFixed(2)} RI`, 'INTENSITY (RI)'];
                        return [value, name];
                      }}
                    />
                    <Bar 
                      yAxisId="dose" 
                      dataKey="bikeScore" 
                      fill="#f97316" 
                      radius={[3, 3, 0, 0]}
                      opacity={pmcFocus === 'bikeScore' ? 0.95 : pmcFocus ? 0.2 : 0.75} 
                      name="BIKESCORE" 
                    />
                    <Line 
                      yAxisId="ri" 
                      type="monotone" 
                      dataKey="relativeIntensity" 
                      stroke="#f59e0b" 
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      connectNulls={false}
                      dot={{ r: 3, fill: '#f59e0b', stroke: '#b45309', strokeWidth: 1 }}
                      activeDot={{ r: 5, fill: '#fbbf24', stroke: '#fff', strokeWidth: 1.5 }}
                      opacity={pmcFocus === 'relativeIntensity' ? 1 : pmcFocus ? 0.2 : 0.9} 
                      name="RELATIVE INTENSITY (RI)" 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Metrics - 5 Columns: Impulse & Banister States */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 pt-6 border-t border-app-border/50">
                <div 
                  className={cn(
                    "text-center cursor-pointer transition-all duration-300",
                    pmcFocus === 'bikeScore' ? "scale-105" : pmcFocus && pmcFocus !== 'bikeScore' ? "opacity-30" : ""
                  )}
                  onMouseEnter={() => setPmcFocus('bikeScore')}
                  onMouseLeave={() => setPmcFocus(null)}
                >
                  <div className="text-2xl font-light tracking-tighter text-orange-500">{Math.round(currentPMC?.bikeScore || 0)}</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">BIKESCORE</div>
                </div>

                <div 
                  className={cn(
                    "text-center cursor-pointer transition-all duration-300",
                    pmcFocus === 'relativeIntensity' ? "scale-105" : pmcFocus && pmcFocus !== 'relativeIntensity' ? "opacity-30" : ""
                  )}
                  onMouseEnter={() => setPmcFocus('relativeIntensity')}
                  onMouseLeave={() => setPmcFocus(null)}
                >
                  <div className="text-2xl font-light tracking-tighter text-amber-500">
                    {currentPMC?.relativeIntensity !== undefined && currentPMC.relativeIntensity > 0 
                      ? currentPMC.relativeIntensity.toFixed(2) 
                      : '--'}
                  </div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">INTENSITY (RI)</div>
                </div>

                <div 
                  className={cn(
                    "text-center cursor-pointer transition-all duration-300",
                    pmcFocus === 'lts' ? "scale-105" : pmcFocus && pmcFocus !== 'lts' ? "opacity-30" : ""
                  )}
                  onMouseEnter={() => setPmcFocus('lts')}
                  onMouseLeave={() => setPmcFocus(null)}
                >
                  <div className="text-2xl font-light tracking-tighter text-blue-500">{Math.round(currentPMC?.lts || 0)}</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">FITNESS (LTS)</div>
                </div>

                <div 
                  className={cn(
                    "text-center cursor-pointer transition-all duration-300",
                    pmcFocus === 'sts' ? "scale-105" : pmcFocus && pmcFocus !== 'sts' ? "opacity-30" : ""
                  )}
                  onMouseEnter={() => setPmcFocus('sts')}
                  onMouseLeave={() => setPmcFocus(null)}
                >
                  <div className="text-2xl font-light tracking-tighter text-red-500">{Math.round(currentPMC?.sts || 0)}</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">FATIGUE (STS)</div>
                </div>

                <div 
                  className={cn(
                    "text-center cursor-pointer transition-all duration-300",
                    pmcFocus === 'sb' ? "scale-105" : pmcFocus && pmcFocus !== 'sb' ? "opacity-30" : ""
                  )}
                  onMouseEnter={() => setPmcFocus('sb')}
                  onMouseLeave={() => setPmcFocus(null)}
                >
                  <div className="text-2xl font-light tracking-tighter text-green-500">
                    {currentPMC?.sb > 0 ? `+${Math.round(currentPMC.sb)}` : Math.round(currentPMC?.sb || 0)}
                  </div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">FORM (SB)</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
