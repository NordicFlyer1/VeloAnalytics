import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap } from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Line 
} from 'recharts';
import { SectionHeader } from './SectionHeader';
import { ActivitySummary, PowerCurvePoint } from '../types';
import { exportComponentAsImage } from '../lib/chartExport';

interface PowerCurveAnalysisProps {
  isPowerCurveExpanded: boolean;
  setIsPowerCurveExpanded: (expanded: boolean) => void;
  selectedHistoryIds: string[];
  setSelectedHistoryIds: (ids: string[]) => void;
  summary: ActivitySummary | null;
  allTimeBestCurve: PowerCurvePoint[];
  rolling90DayBestCurve: PowerCurvePoint[];
  getComparisonCurves: () => { name: string, curve: PowerCurvePoint[] }[];
  mmpCurveRef: React.RefObject<HTMLDivElement>;
  theme: 'light' | 'dark';
}

export const PowerCurveAnalysis: React.FC<PowerCurveAnalysisProps> = ({
  isPowerCurveExpanded,
  setIsPowerCurveExpanded,
  selectedHistoryIds,
  setSelectedHistoryIds,
  summary,
  allTimeBestCurve,
  rolling90DayBestCurve,
  getComparisonCurves,
  mmpCurveRef,
  theme
}) => {
  const handleExport = async () => {
    if (mmpCurveRef.current) {
      const fileName = `Velo_PowerCurve_${summary?.name || 'Activity'}_${new Date().getTime()}.png`;
      await exportComponentAsImage(mmpCurveRef.current, fileName);
    }
  };

  return (
    <div ref={mmpCurveRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={Zap}
        title="Power Curve"
        description="Peak power output across different time durations"
        isExpanded={isPowerCurveExpanded}
        onToggle={() => setIsPowerCurveExpanded(!isPowerCurveExpanded)}
        onExport={handleExport}
        infoContent={{
          title: "Power Curve",
          description: "Compares your maximum power outputs across all durations (from 1s to 60m) against your 90-day and all-time bests to identify strengths and peaks."
        }}
      />

      <AnimatePresence>
        {isPowerCurveExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                {selectedHistoryIds.length >= 2 && (
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">
                      OVERLAYING {selectedHistoryIds.length} ACTIVITIES
                    </div>
                    <button 
                      onClick={() => setSelectedHistoryIds([])}
                      className="px-3 py-1 bg-white/[0.05] border border-app-border rounded-full text-[10px] font-bold uppercase tracking-widest text-orange-500 hover:bg-orange-500/10 transition-all"
                    >
                      CLEAR COMPARISON
                    </button>
                  </div>
                )}
              </div>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(() => {
                    const durations = [1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600];
                    const comparisons = getComparisonCurves();
                    return durations.map(d => {
                      const point: any = { duration: d };
                      const current = summary?.powerCurve?.find(p => p.duration === d);
                      if (current) point.current = current.power;
                      
                      const allTime = allTimeBestCurve.find(p => p.duration === d);
                      if (allTime) point.allTime = allTime.power;

                      const ninetyDay = rolling90DayBestCurve.find(p => p.duration === d);
                      if (ninetyDay) point.ninetyDay = ninetyDay.power;

                      comparisons.forEach(comp => {
                        const p = comp.curve.find(cp => cp.duration === d);
                        if (p) point[comp.name] = p.power;
                      });
                      
                      return point;
                    });
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                    <XAxis 
                      dataKey="duration" 
                      type="number" 
                      scale="log" 
                      domain={[1, 3600]} 
                      ticks={[1, 2, 5, 10, 30, 60, 300, 600, 1200, 3600]}
                      tickFormatter={(tick) => {
                        if (tick < 60) return `${tick}S`;
                        if (tick < 3600) return `${tick / 60}M`;
                        return `${tick / 3600}H`;
                      }}
                      stroke="var(--app-muted)"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis stroke="var(--app-muted)" fontSize={10} unit="W" axisLine={false} tickLine={false} />
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
                      labelFormatter={(label) => {
                        const d = Number(label);
                        if (d < 60) return `${d} SECONDS`;
                        if (d < 3600) return `${d / 60} MINUTES`;
                        return `${d / 3600} HOURS`;
                      }}
                      formatter={(value: any) => [`${Math.round(value)} W`, 'Power']}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="circle"
                      wrapperStyle={{ 
                        fontSize: '10px', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.1em', 
                        paddingBottom: '20px', 
                        color: 'var(--app-muted)' 
                      }}
                    />
                    <Line type="monotone" dataKey="current" name="CURRENT ACTIVITY" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="allTime" name="ALL-TIME BEST" stroke={theme === 'dark' ? '#f8fafc' : '#1e293b'} strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="ninetyDay" name="90-DAY BEST" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                    
                    {getComparisonCurves().map((comp, i) => (
                      <Line 
                        key={comp.name}
                        type="monotone" 
                        dataKey={comp.name} 
                        name={comp.name} 
                        stroke={['#3b82f6', '#10b981', '#a855f7', '#f43f5e'][i % 4]} 
                        strokeWidth={1.5} 
                        strokeDasharray="2 2"
                        dot={false} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                {[5, 60, 300, 600, 1200, 1800, 3600].map(d => {
                  const p = summary?.powerCurve?.find(cp => cp.duration === d);
                  return (
                    <div key={d} className="bg-app-card/50 border border-app-border rounded-xl p-3 text-center">
                      <div className="text-[10px] text-app-muted uppercase tracking-widest mb-1">
                        {d < 60 ? `${d}S` : d < 3600 ? `${d / 60}M` : `${d / 3600}H`}
                      </div>
                      <div className="text-sm font-bold text-app-text">
                        {p ? `${p.power} W` : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
