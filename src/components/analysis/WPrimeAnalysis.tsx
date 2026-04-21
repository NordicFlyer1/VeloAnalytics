import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, ChartArea, TrendingUp, Zap } from 'lucide-react';
import { SectionHeader, ExportAction } from '../ui/SectionHeader';
import { MetricLane } from './MetricLane';
import { cn } from '../../lib/utils';
import { CyclingDataPoint } from '../../types';
import { exportComponentAsImage } from '../../lib/chartExport';

interface WPrimeAnalysisProps {
  isWPrimeExpanded: boolean;
  setIsWPrimeExpanded: (expanded: boolean) => void;
  cpWPrime: { cp: number; wPrime: number } | null;
  manualCP: number | null;
  manualWPrime: number | null;
  smoothedData: CyclingDataPoint[];
  activePoint: number | null;
  setActivePoint: (index: number | null) => void;
  isPointLocked: boolean;
  setIsPointLocked: (locked: boolean) => void;
  cp: number;
  cpMode: 'manual' | 'estimated';
  setCpMode: (mode: 'manual' | 'estimated') => void;
}

export const WPrimeAnalysis: React.FC<WPrimeAnalysisProps> = ({
  isWPrimeExpanded,
  setIsWPrimeExpanded,
  cpWPrime,
  manualCP,
  manualWPrime,
  smoothedData,
  activePoint,
  setActivePoint,
  isPointLocked,
  setIsPointLocked,
  cp,
  cpMode,
  setCpMode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  const exportActions: ExportAction[] = [
    {
      label: 'Full Panel (PNG)',
      icon: Image,
      onClick: async () => {
        if (containerRef.current) {
          const fileName = `Velo_WPrime_Full_${new Date().getTime()}.png`;
          await exportComponentAsImage(containerRef.current, fileName);
        }
      }
    },
    {
      label: 'Chart Area (PNG)',
      icon: ChartArea,
      onClick: async () => {
        if (chartAreaRef.current) {
          const fileName = `Velo_WPrime_Chart_${new Date().getTime()}.png`;
          await exportComponentAsImage(chartAreaRef.current, fileName);
        }
      }
    }
  ];

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={TrendingUp}
        title="W' Balance Analysis"
        description="Anaerobic capacity utilization and recovery tracking"
        isExpanded={isWPrimeExpanded}
        onToggle={() => setIsWPrimeExpanded(!isWPrimeExpanded)}
        exportActions={exportActions}
        infoContent={{
          title: "W' Balance",
          description: "Your real-time anaerobic capacity reservoir (W'). It depletes when your power output exceeds Critical Power (CP) and recovers when you ride below it. The recovery model is fatigue-adjusted, meaning it becomes less efficient over the duration of long rides."
        }}
      />

      <AnimatePresence>
        {isWPrimeExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div ref={chartAreaRef} className="flex flex-col border border-app-border/50 rounded-2xl overflow-hidden bg-app-bg/20">
                {/* Power Lane */}
                <MetricLane 
                  metric="power"
                  config={{ label: 'Power', color: '#f97316', unit: 'W' }}
                  data={smoothedData}
                  activePoint={activePoint}
                  onMouseMove={(e) => {
                    if (!isPointLocked && e && e.activeTooltipIndex !== undefined) {
                      setActivePoint(e.activeTooltipIndex);
                    }
                  }}
                  onMouseLeave={() => {
                    if (!isPointLocked) setActivePoint(null);
                  }}
                  onClick={(e) => {
                    if (e && e.activeTooltipIndex !== undefined) {
                      setActivePoint(e.activeTooltipIndex);
                      setIsPointLocked(true);
                    } else {
                      setIsPointLocked(false);
                      setActivePoint(null);
                    }
                  }}
                  isLast={false}
                  syncId="activityAnalysis"
                  height={160}
                  estimatedCp={cpWPrime?.cp}
                  cp={cp}
                  manualCP={manualCP}
                  showCP={cpMode === 'manual'}
                  showECP={cpMode === 'estimated'}
                />
                {/* W' Balance Lane */}
                <MetricLane 
                  metric="wPrimeBalance"
                  config={{ label: "W' Balance", color: '#a855f7', unit: 'KJ' }}
                  data={smoothedData}
                  activePoint={activePoint}
                  onMouseMove={(e) => {
                    if (!isPointLocked && e && e.activeTooltipIndex !== undefined) {
                      setActivePoint(e.activeTooltipIndex);
                    }
                  }}
                  onMouseLeave={() => {
                    if (!isPointLocked) setActivePoint(null);
                  }}
                  onClick={(e) => {
                    if (e && e.activeTooltipIndex !== undefined) {
                      setActivePoint(e.activeTooltipIndex);
                      setIsPointLocked(true);
                    } else {
                      setIsPointLocked(false);
                      setActivePoint(null);
                    }
                  }}
                  isLast={true}
                  syncId="activityAnalysis"
                  height={160}
                />
              </div>

              <div className="flex items-center justify-center gap-3 py-3 border-t border-app-border/30 bg-app-card/10 export-ignore">
                <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Analysis Mode</span>
                <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border">
                  <button 
                    onClick={() => setCpMode('manual')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                      cpMode === 'manual' 
                        ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                        : "text-app-muted hover:text-app-text"
                    )}
                  >
                    Active CP
                  </button>
                  <button 
                    onClick={() => setCpMode('estimated')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                      cpMode === 'estimated' 
                        ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                        : "text-app-muted hover:text-app-text"
                    )}
                  >
                    Estimated CP
                  </button>
                </div>
              </div>

              {/* CP & W' Analysis */}
              <div className="bg-app-card border border-app-border rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold tracking-widest text-app-muted uppercase">
                    {cpMode === 'manual' ? 'Manual Performance Model' : 'Estimated Performance Model'}
                  </h3>
                  <Zap className="w-4 h-4 text-orange-500" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] tracking-widest text-app-muted/60 font-medium uppercase">
                      {cpMode === 'estimated' ? 'Estimated CP' : 'Active CP'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-light tracking-tighter text-app-text">
                        {Math.round(cpMode === 'estimated' ? (cpWPrime?.cp || 0) : (manualCP ?? cpWPrime?.cp ?? 0))}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">W</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] tracking-widest text-app-muted/60 font-medium uppercase">
                      {cpMode === 'estimated' ? "Estimated W'" : "Active W'"}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-light tracking-tighter text-app-text">
                        {Math.round((cpMode === 'estimated' ? (cpWPrime?.wPrime || 0) : (manualWPrime ?? cpWPrime?.wPrime ?? 0)) / 1000)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">KJ</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
