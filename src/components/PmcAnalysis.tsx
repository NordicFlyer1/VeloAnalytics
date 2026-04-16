import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart as LineChartIcon } from 'lucide-react';
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
  ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { SectionHeader } from './SectionHeader';
import { cn } from '../lib/utils';

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
  return (
    <div className="bg-app-card border border-app-border rounded-3xl p-8">
      <SectionHeader 
        icon={LineChartIcon}
        title="PMC Analysis"
        description="Performance Management Chart showing fitness, fatigue, and form"
        isExpanded={isPmcExpanded}
        onToggle={() => setIsPmcExpanded(!isPmcExpanded)}
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
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Range Selector - Aligned under Title (Top Left) */}
                <div className="grid grid-cols-3 sm:flex sm:w-auto gap-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: '1year', label: '1 Year' },
                    { id: '6months', label: '6 Months' },
                    { id: '3months', label: '3 Months' },
                    { id: '6weeks', label: '6 Weeks' }
                  ].map(range => (
                    <button
                      key={range.id}
                      onClick={() => setPmcDateRange(range.id as any)}
                      className={cn(
                        "px-2 md:px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border text-center",
                        pmcDateRange === range.id 
                          ? "bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20" 
                          : "bg-app-card text-app-muted border-app-border hover:bg-app-card/80"
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={pmcData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      tickFormatter={(str) => format(new Date(str), 'MMM d')}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="fitness" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      yAxisId="form" 
                      orientation="right" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      yAxisId="bikeScore" 
                      orientation="right" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      hide 
                    />
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
                      labelStyle={{ color: 'var(--app-text)', fontWeight: 'bold', marginBottom: '4px' }}
                      labelFormatter={(label) => format(new Date(label), 'EEEE, MMMM d, yyyy')}
                      formatter={(value: any, name: string) => {
                        if (name === 'BikeScore') return [Math.round(value), name];
                        return [Number(value).toFixed(1), name];
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      onMouseEnter={(e) => setPmcFocus(e.dataKey as string)}
                      onMouseLeave={() => setPmcFocus(null)}
                      wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--app-text)' }}
                    />
                    <Bar 
                      yAxisId={pmcFocus === 'bikeScore' ? "bikeScore" : "fitness"} 
                      dataKey="bikeScore" 
                      fill="#f97316" 
                      opacity={pmcFocus === 'bikeScore' ? 0.8 : pmcFocus ? 0.1 : 0.3} 
                      name="BikeScore" 
                    />
                    <Line 
                      yAxisId="fitness" 
                      type="monotone" 
                      dataKey="lts" 
                      stroke="#3b82f6" 
                      strokeWidth={pmcFocus === 'lts' ? 4 : 2} 
                      opacity={pmcFocus === 'lts' ? 1 : pmcFocus ? 0.2 : 1}
                      dot={false} 
                      name="Fitness (LTS)" 
                    />
                    <Line 
                      yAxisId="fitness" 
                      type="monotone" 
                      dataKey="sts" 
                      stroke="#ef4444" 
                      strokeWidth={pmcFocus === 'sts' ? 4 : 2} 
                      opacity={pmcFocus === 'sts' ? 1 : pmcFocus ? 0.2 : 1}
                      dot={false} 
                      name="Fatigue (STS)" 
                    />
                    <Area 
                      yAxisId="form" 
                      type="monotone" 
                      dataKey="sb" 
                      fill="#22c55e" 
                      stroke="#22c55e" 
                      strokeWidth={pmcFocus === 'sb' ? 3 : 1}
                      fillOpacity={pmcFocus === 'sb' ? 0.4 : pmcFocus ? 0.05 : 0.1} 
                      opacity={pmcFocus === 'sb' ? 1 : pmcFocus ? 0.2 : 1}
                      name="Form (SB)" 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Metrics - Moved below the chart */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-app-border/50">
                <div 
                  className={cn(
                    "text-center cursor-pointer transition-all duration-300",
                    pmcFocus === 'bikeScore' ? "scale-110" : pmcFocus && pmcFocus !== 'bikeScore' ? "opacity-30" : ""
                  )}
                  onMouseEnter={() => setPmcFocus('bikeScore')}
                  onMouseLeave={() => setPmcFocus(null)}
                >
                  <div className="text-2xl font-light tracking-tighter text-orange-500">{Math.round(currentPMC?.bikeScore || 0)}</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">BikeScore</div>
                </div>
                <div 
                  className={cn(
                    "text-center cursor-pointer transition-all duration-300",
                    pmcFocus === 'lts' ? "scale-110" : pmcFocus && pmcFocus !== 'lts' ? "opacity-30" : ""
                  )}
                  onMouseEnter={() => setPmcFocus('lts')}
                  onMouseLeave={() => setPmcFocus(null)}
                >
                  <div className="text-2xl font-light tracking-tighter text-blue-500">{Math.round(currentPMC?.lts || 0)}</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Fitness (LTS)</div>
                </div>
                <div 
                  className={cn(
                    "text-center cursor-pointer transition-all duration-300",
                    pmcFocus === 'sts' ? "scale-110" : pmcFocus && pmcFocus !== 'sts' ? "opacity-30" : ""
                  )}
                  onMouseEnter={() => setPmcFocus('sts')}
                  onMouseLeave={() => setPmcFocus(null)}
                >
                  <div className="text-2xl font-light tracking-tighter text-red-500">{Math.round(currentPMC?.sts || 0)}</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Fatigue (STS)</div>
                </div>
                <div 
                  className={cn(
                    "text-center cursor-pointer transition-all duration-300",
                    pmcFocus === 'sb' ? "scale-110" : pmcFocus && pmcFocus !== 'sb' ? "opacity-30" : ""
                  )}
                  onMouseEnter={() => setPmcFocus('sb')}
                  onMouseLeave={() => setPmcFocus(null)}
                >
                  <div className="text-2xl font-light tracking-tighter text-green-500">{Math.round(currentPMC?.sb || 0)}</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Form (SB)</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-app-border/50">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500">LTS (Fitness)</h4>
                  <p className="text-[10px] text-app-muted leading-relaxed">
                    Long Term Stress is a 42-day weighted average of your daily BikeScore. It represents your long-term training load and overall fitness level.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-500">STS (Fatigue)</h4>
                  <p className="text-[10px] text-app-muted leading-relaxed">
                    Short Term Stress is a 7-day weighted average of your daily BikeScore. It represents your short-term training load and current level of fatigue.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-green-500">SB (Form)</h4>
                  <p className="text-[10px] text-app-muted leading-relaxed">
                    Stress Balance (LTS - STS) represents your current form or freshness. A positive SB suggests you are fresh and ready to perform.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
