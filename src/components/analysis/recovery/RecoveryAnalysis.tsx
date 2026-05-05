import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Image, FileText, Zap, Heart } from 'lucide-react';
import { HRVMetric, SleepMetric, AISettings } from '../../../types';
import { SectionHeader, ExportAction } from '../../ui/SectionHeader';
import { HRVChart } from './HRVChart';
import { exportHRVToCSV, calculateVeloReadiness } from '../../../services/wellnessService';
import { exportComponentAsImage } from '../../../lib/chartExport';
import { cn } from '../../../lib/utils';

interface RecoveryAnalysisProps {
  hrvData: HRVMetric[];
  sleepData: SleepMetric[];
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  aiSettings?: AISettings;
}

export const RecoveryAnalysis: React.FC<RecoveryAnalysisProps> = ({ 
  hrvData, 
  sleepData, 
  isExpanded, 
  setIsExpanded,
  aiSettings
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const exportActions: ExportAction[] = [
    {
      label: 'Panel (PNG)',
      icon: Image,
      onClick: async () => {
        if (containerRef.current) {
          const fileName = `Velo_RecoveryStatus_${new Date().getTime()}.png`;
          await exportComponentAsImage(containerRef.current, fileName);
        }
      }
    },
    {
      label: 'Data (CSV)',
      icon: FileText,
      onClick: () => exportHRVToCSV(hrvData)
    }
  ];

  const latestHRV = hrvData.length > 0 ? [...hrvData].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  const latestSleep = sleepData.length > 0 ? [...sleepData].sort((a, b) => b.date.localeCompare(a.date))[0] : null;

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={RefreshCw}
        title={aiSettings?.useExperimentalReadiness ? "Velo-Readiness" : "Readiness"}
        description="Physiological readiness based on Heart Rate Variability and Autonomic Nervous System balance"
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        exportActions={exportActions}
        infoContent={{
          title: "HRV & Autonomic Recovery",
          description: "Heart Rate Variability (HRV) measures the variation in time between consecutive heartbeats. It is a powerful proxy for Autonomic Nervous System (ANS) state. A value within your 'Baseline Range' indicates healthy recovery (Parasympathetic activity). Values significantly below baseline suggest systemic fatigue or stress."
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
            {hrvData.length === 0 ? (
              <div className="bg-app-bg/20 border border-app-border/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-app-text uppercase tracking-widest">No HRV Data</h3>
                  <p className="text-[10px] text-app-muted uppercase font-bold tracking-tight max-w-[200px]">
                    Upload your Garmin HRV CSV in Settings to see trends
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  <div className="bg-app-bg/30 border border-app-border/50 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Overnight HRV</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-app-text text-purple-500">{latestHRV?.overnightHRV || '--'}</span>
                      <span className="text-[9px] font-bold text-app-muted uppercase">ms</span>
                    </div>
                  </div>
                  <div className="bg-app-bg/30 border border-app-border/50 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Baseline</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-app-text">
                        {latestHRV ? `${latestHRV.baselineMin}-${latestHRV.baselineMax}` : '--'}
                      </span>
                      <span className="text-[9px] font-bold text-app-muted uppercase">ms</span>
                    </div>
                  </div>
                  <div className="bg-app-bg/30 border border-app-border/50 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">7D Average</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-app-text text-purple-400">{latestHRV?.sevenDayAvg || '--'}</span>
                      <span className="text-[9px] font-bold text-app-muted uppercase">ms</span>
                    </div>
                  </div>
                  <div className="bg-app-bg/30 border border-app-border/50 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Resting HR</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-app-text text-red-500">{latestSleep?.restingHeartRate || '--'}</span>
                      <span className="text-[9px] font-bold text-app-muted uppercase">BPM</span>
                    </div>
                  </div>
                </div>

                <div className="border border-app-border/50 rounded-2xl overflow-hidden bg-app-bg/10 p-4">
                  <HRVChart data={hrvData} />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
