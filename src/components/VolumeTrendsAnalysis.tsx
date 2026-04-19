import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3, Activity, Clock, Mountain } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { SectionHeader } from './SectionHeader';
import { cn } from '../lib/utils';
import { exportComponentAsImage } from '../lib/chartExport';

interface VolumeTrendsAnalysisProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  range: 'weekly' | 'monthly' | 'yearly';
  setRange: (range: 'weekly' | 'monthly' | 'yearly') => void;
  data: any[];
}

type MetricType = 'distance' | 'duration' | 'elevation';

const metrics: { id: MetricType; label: string; icon: any; color: string; unit: string }[] = [
  { id: 'distance', label: 'Distance', icon: Activity, color: '#f97316', unit: 'KM' },
  { id: 'duration', label: 'Time', icon: Clock, color: '#a855f7', unit: 'H' },
  { id: 'elevation', label: 'Elevation', icon: Mountain, color: '#3b82f6', unit: 'M' },
];

export const VolumeTrendsAnalysis: React.FC<VolumeTrendsAnalysisProps> = ({
  isExpanded,
  setIsExpanded,
  range,
  setRange,
  data
}) => {
  const [activeMetric, setActiveMetric] = React.useState<MetricType>('distance');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const activeMetricConfig = metrics.find(m => m.id === activeMetric)!;

  const currentStats = React.useMemo(() => {
    if (data.length === 0) return { total: 0, avg: 0 };
    const total = data.reduce((sum, d) => sum + (d[activeMetric] || 0), 0);
    return {
      total,
      avg: total / data.length
    };
  }, [data, activeMetric]);

  const formatValue = (val: number) => {
    if (activeMetric === 'duration') return (val / 3600).toFixed(1);
    if (activeMetric === 'distance') return (val / 1000).toFixed(1);
    return Math.round(val).toString();
  };

  const handleExport = async () => {
    if (containerRef.current) {
      const fileName = `Velo_VolumeTrends_${range}_${activeMetric}_${new Date().getTime()}.png`;
      await exportComponentAsImage(containerRef.current, fileName);
    }
  };

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={BarChart3}
        title="Volume Trends"
        description="Historical analysis of distance, time, and elevation gain"
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        onExport={handleExport}
        infoContent={{
          title: "Volume Trends",
          description: "Analyzes your weekly and monthly activity volume. Tracks total distance, elevation gain, and time to ensure consistent training progression."
        }}
      />

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Range Selector - Matched with TrainingLoadSummary (Top Left) */}
                <div className="flex items-center gap-1 bg-app-bg/50 p-1 rounded-full border border-app-border w-full lg:w-auto">
                  {(['weekly', 'monthly', 'yearly'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={cn(
                        "flex-1 lg:flex-none px-4 lg:px-6 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                        range === r 
                          ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                          : "text-app-muted hover:text-app-text"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Metric Selector - Capsule style (Top Right) */}
                <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border w-full lg:w-auto overflow-x-auto no-scrollbar">
                  {metrics.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setActiveMetric(m.id)}
                        className={cn(
                          "flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                          activeMetric === m.id 
                            ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                            : "text-app-muted hover:text-app-text"
                        )}
                      >
                        <Icon size={12} className={cn(activeMetric === m.id ? "text-black/40" : "")} style={activeMetric !== m.id ? { color: m.color } : {}} />
                        <span className="sm:inline">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chart Container */}
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => formatValue(val)}
                    />
                    <Tooltip 
                      cursor={false}
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
                      formatter={(value: any) => [
                        <span style={{ color: activeMetricConfig.color }}>{`${formatValue(value)} ${activeMetricConfig.unit}`}</span>, 
                        activeMetricConfig.label
                      ]}
                    />
                    <Bar 
                      dataKey={activeMetric} 
                      radius={[6, 6, 0, 0]} 
                      name={activeMetricConfig.label}
                      fill={activeMetricConfig.color}
                      activeBar={{ fillOpacity: 0.8 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Stats - Moved to bottom like TrainingLoadSummary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-6 sm:pt-8 border-t border-app-border/50">
                <div className="text-center p-2 rounded-2xl bg-app-bg/20 border border-app-border/10 sm:bg-transparent sm:border-none">
                  <div className="text-lg sm:text-2xl font-light tracking-tighter" style={{ color: activeMetricConfig.color }}>
                    {formatValue(currentStats.total)}
                    <span className="text-[9px] ml-1 uppercase font-bold opacity-70">{activeMetricConfig.unit}</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-app-muted uppercase tracking-widest font-bold text-center">TOTAL {activeMetricConfig.label}</div>
                </div>
                <div className="text-center p-2 rounded-2xl bg-app-bg/20 border border-app-border/10 sm:bg-transparent sm:border-none">
                  <div className="text-lg sm:text-2xl font-light tracking-tighter text-app-text">
                    {formatValue(currentStats.avg)}
                    <span className="text-[9px] ml-1 uppercase font-bold opacity-70">{activeMetricConfig.unit}</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-app-muted uppercase tracking-widest font-bold text-center">AVG / {range === 'weekly' ? 'WEEK' : range === 'monthly' ? 'MONTH' : 'YEAR'}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
