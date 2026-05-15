import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wind, Image, FileSpreadsheet } from 'lucide-react';
import { SleepMetric } from '../../../types';
import { SectionHeader, ExportAction } from '../../ui/SectionHeader';
import { HealthMetricsChart } from './HealthMetricsChart';
import { exportComponentAsImage } from '../../../lib/chartExport';
import { exportToCSV } from '../../../lib/csvExport';

interface HealthAnalysisProps {
  sleepData: SleepMetric[];
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

export const HealthAnalysis: React.FC<HealthAnalysisProps> = ({ 
  sleepData, 
  isExpanded, 
  setIsExpanded
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const exportActions: ExportAction[] = [
    {
      label: 'Panel (PNG)',
      icon: Image,
      onClick: async () => {
        if (containerRef.current) {
          const fileName = `Velo_HealthMetrics_${new Date().getTime()}.png`;
          await exportComponentAsImage(containerRef.current, fileName);
        }
      }
    },
    {
      label: 'Data (CSV)',
      icon: FileSpreadsheet,
      onClick: async () => {
        if (sleepData.length > 0) {
          // Format data specifically for this panel's context
          const exportData = [...sleepData]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map(d => ({
              Date: d.date,
              'PulseOX (%)': d.pulseOx,
              'Respiration (BPM)': d.respiration
            }));
          
          const fileName = `Velo_HealthData_${new Date().getTime()}.csv`;
          await exportToCSV(exportData, fileName);
        }
      }
    }
  ];

  const latestData = sleepData.length > 0 ? [...sleepData].sort((a, b) => b.date.localeCompare(a.date))[0] : null;

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={Wind}
        title="PulseOX & Respiration Rate Trends"
        description="Daily PulseOX and Respiration Rate trends to monitor systemic stress and recovery"
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        exportActions={exportActions}
        infoContent={{
          title: "PulseOX & Respiration",
          description: "Tracking fundamental physiological indicators helps detect early signs of illness or overtraining. \n\n• PulseOX (%): Measures oxygen saturation in the blood. Significant drops from baseline can indicate respiratory stress or altitude effects.\n\n• Respiration (bpm): Resting breaths per minute. An elevated rate often precedes heart rate changes during illness onset."
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
            {sleepData.length === 0 ? (
              <div className="bg-app-bg/20 border border-app-border/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Wind className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-app-text uppercase tracking-widest">No Health Data</h3>
                  <p className="text-[10px] text-app-muted uppercase font-bold tracking-tight max-w-[200px]">
                    Upload your Garmin Sleep metadata CSV in Settings to see trends
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-app-bg/30 border border-app-border/50 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Latest PulseOX</span>
                    <div className="flex items-baseline gap-2">
                       <span className="text-xl font-black text-fuchsia-500">{latestData?.pulseOx || '--'}</span>
                       <span className="text-[9px] font-bold text-app-muted uppercase">%</span>
                    </div>
                  </div>
                  <div className="bg-app-bg/30 border border-app-border/50 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Avg Respiration</span>
                    <div className="flex items-baseline gap-2">
                       <span className="text-xl font-black text-emerald-500">{latestData?.respiration || '--'}</span>
                       <span className="text-[9px] font-bold text-app-muted uppercase">BPM</span>
                    </div>
                  </div>
                </div>

                <div className="border border-app-border/50 rounded-2xl overflow-hidden bg-app-bg/10 p-4">
                  <HealthMetricsChart data={sleepData} />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
