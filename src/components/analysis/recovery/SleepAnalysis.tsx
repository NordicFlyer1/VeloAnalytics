import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Image, FileText, Clock } from 'lucide-react';
import { SleepMetric } from '../../../types';
import { SectionHeader, ExportAction } from '../../ui/SectionHeader';
import { SleepChart } from './SleepChart';
import { exportSleepToCSV } from '../../../services/wellnessService';
import { exportComponentAsImage } from '../../../lib/chartExport';
import { cn } from '../../../lib/utils';

interface SleepAnalysisProps {
  data: SleepMetric[];
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

export const SleepAnalysis: React.FC<SleepAnalysisProps> = ({ data, isExpanded, setIsExpanded }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const exportActions: ExportAction[] = [
    {
      label: 'Panel (PNG)',
      icon: Image,
      onClick: async () => {
        if (containerRef.current) {
          const fileName = `Velo_SleepTrends_${new Date().getTime()}.png`;
          await exportComponentAsImage(containerRef.current, fileName);
        }
      }
    },
    {
      label: 'Data (CSV)',
      icon: FileText,
      onClick: () => exportSleepToCSV(data)
    }
  ];

  const latest = data.length > 0 ? [...data].sort((a, b) => b.date.localeCompare(a.date))[0] : null;

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={Moon}
        title="Sleep Trends"
        description="Monitor sleep quality, duration, and physiological resting metrics"
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        exportActions={exportActions}
        infoContent={{
          title: "Sleep Quality & Recovery",
          description: "Sleep is the foundation of athletic recovery. This panel tracks your overall Sleep Quality (a composite of duration and architecture), deep sleep cycles, and resting heart rate trends. Higher quality directly correlates with improved training adaptation and metabolic efficiency."
        }}
      />
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {data.length === 0 ? (
              <div className="bg-app-bg/20 border border-app-border/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Moon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-app-text uppercase tracking-widest">No Sleep Data</h3>
                  <p className="text-[10px] text-app-muted uppercase font-bold tracking-tight max-w-[200px]">
                    Upload your Garmin Sleep CSV in Settings to see trends
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-app-bg/30 border border-app-border/50 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Latest Quality</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-app-text">{latest?.score || '--'}</span>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                        (latest?.score || 0) >= 80 ? "bg-green-500/10 text-green-500" : 
                        (latest?.score || 0) >= 60 ? "bg-orange-500/10 text-orange-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {latest?.quality || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-app-bg/30 border border-app-border/50 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Duration</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-app-text">
                        {latest ? `${Math.floor(latest.duration / 60)}h ${latest.duration % 60}m` : '--'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-app-bg/30 border border-app-border/50 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Resting HR</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-app-text text-red-500">{latest?.restingHeartRate || '--'}</span>
                      <span className="text-[9px] font-bold text-app-muted uppercase">BPM</span>
                    </div>
                  </div>
                  <div className="bg-app-bg/30 border border-app-border/50 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Readiness Score</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-app-text text-cyan-500">{latest?.readinessScore || '--'}</span>
                      <span className="text-[9px] font-bold text-app-muted uppercase">Points</span>
                    </div>
                  </div>
                </div>

                <div className="border border-app-border/50 rounded-2xl overflow-hidden bg-app-bg/10 p-4">
                  <SleepChart data={data} />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
