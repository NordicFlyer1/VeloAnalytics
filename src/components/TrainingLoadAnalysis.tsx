import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { SectionHeader } from './SectionHeader';
import { cn } from '../lib/utils';

interface TrainingLoadAnalysisProps {
  isTrainingLoadExpanded: boolean;
  setIsTrainingLoadExpanded: (expanded: boolean) => void;
  trainingLoadRange: 'weekly' | 'monthly' | 'yearly';
  setTrainingLoadRange: (range: 'weekly' | 'monthly' | 'yearly') => void;
  trainingLoadData: any[];
  trainingLoadStats: {
    totalBikeScore: number;
    avgBikeScore: number;
    totalWork: number;
    totalDuration: number;
  };
}

export const TrainingLoadAnalysis: React.FC<TrainingLoadAnalysisProps> = ({
  isTrainingLoadExpanded,
  setIsTrainingLoadExpanded,
  trainingLoadRange,
  setTrainingLoadRange,
  trainingLoadData,
  trainingLoadStats
}) => {
  return (
    <div className="bg-app-card border border-app-border rounded-3xl p-8">
      <SectionHeader 
        icon={Calendar}
        title="Training Load Summary"
        description="Weekly and monthly aggregation of training stress and volume"
        isExpanded={isTrainingLoadExpanded}
        onToggle={() => setIsTrainingLoadExpanded(!isTrainingLoadExpanded)}
      />

      <AnimatePresence>
        {isTrainingLoadExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="grid grid-cols-3 md:flex w-full md:w-auto gap-2">
                  {(['weekly', 'monthly', 'yearly'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTrainingLoadRange(range)}
                      className={cn(
                        "px-2 md:px-6 py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all border text-center",
                        trainingLoadRange === range 
                          ? "bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20" 
                          : "bg-app-card text-app-muted border-app-border hover:bg-app-card/80"
                      )}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trainingLoadData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      tickFormatter={(str) => str}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="var(--app-muted)" 
                      fontSize={10} 
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'BikeScore', angle: -90, position: 'insideLeft', style: { fill: 'var(--app-muted)', fontSize: '10px' } }} 
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
                      formatter={(value: any, name: string) => {
                        if (name.toLowerCase() === 'work') return [`${Math.round(value)} kJ`, 'Total Work'];
                        if (name.toLowerCase() === 'bikescore') return [Math.round(value), 'BikeScore'];
                        if (name.toLowerCase() === 'duration') return [`${(value / 3600).toFixed(1)} h`, 'Total Time'];
                        return [typeof value === 'number' ? Math.round(value) : value, name];
                      }}
                    />
                    <Bar 
                      dataKey="bikeScore" 
                      fill="#f97316" 
                      radius={[6, 6, 0, 0]} 
                      name="BikeScore"
                      activeBar={{ fill: "#fb923c" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-app-border/50">
                <div className="text-center">
                  <div className="text-2xl font-light tracking-tighter text-orange-500">{Math.round(trainingLoadStats.totalBikeScore || 0)}</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Total BikeScore</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-light tracking-tighter text-app-text">{Math.round(trainingLoadStats.avgBikeScore || 0)}</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Avg BikeScore / Period</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-light tracking-tighter text-app-text">{Math.round(trainingLoadStats.totalWork || 0)}kJ</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Total Work</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-light tracking-tighter text-app-text">{Math.round((trainingLoadStats.totalDuration || 0) / 3600)}h</div>
                  <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Total Time</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
