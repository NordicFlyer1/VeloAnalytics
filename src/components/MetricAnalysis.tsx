import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3 } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { MetricLane } from './MetricLane';
import { cn } from '../lib/utils';
import { CyclingDataPoint, ZoneDefinition } from '../types';

interface MetricAnalysisProps {
  isChartExpanded: boolean;
  setIsChartExpanded: (expanded: boolean) => void;
  metricsConfig: Record<string, { label: string, color: string, unit: string }>;
  activeMetrics: string[];
  setActiveMetrics: React.Dispatch<React.SetStateAction<string[]>>;
  smoothingWindow: number;
  setSmoothingWindow: (window: number) => void;
  smoothedData: CyclingDataPoint[];
  activePoint: number | null;
  setActivePoint: (index: number | null) => void;
  isPointLocked: boolean;
  setIsPointLocked: (locked: boolean) => void;
  estimatedCp: number | null;
  cp: number;
  manualCP: number | null;
  powerZoneDefinitions: ZoneDefinition[];
  hrZoneDefinitions: ZoneDefinition[];
  maxHR: number;
  showCP: boolean;
  setShowCP: (show: boolean) => void;
  showECP: boolean;
  setShowECP: (show: boolean) => void;
}

export const MetricAnalysis: React.FC<MetricAnalysisProps> = ({
  isChartExpanded,
  setIsChartExpanded,
  metricsConfig,
  activeMetrics,
  setActiveMetrics,
  smoothingWindow,
  setSmoothingWindow,
  smoothedData,
  activePoint,
  setActivePoint,
  isPointLocked,
  setIsPointLocked,
  estimatedCp,
  cp,
  manualCP,
  powerZoneDefinitions,
  hrZoneDefinitions,
  maxHR,
  showCP,
  setShowCP,
  showECP,
  setShowECP
}) => {
  return (
    <div className="bg-app-card border border-app-border rounded-3xl p-8">
      <SectionHeader 
        icon={BarChart3}
        title="Metric Analysis"
        description="Deep dive into your performance data with synchronized charts"
        isExpanded={isChartExpanded}
        onToggle={() => setIsChartExpanded(!isChartExpanded)}
      />
      
      <AnimatePresence>
        {isChartExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Metrics</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(metricsConfig).map(([key, config]) => {
                    const typedConfig = config as { label: string, color: string, unit: string };
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setActiveMetrics(prev => 
                            prev.includes(key) 
                              ? (prev.length > 1 ? prev.filter(m => m !== key) : prev)
                              : [...prev, key]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                          activeMetrics.includes(key) 
                            ? "bg-app-card text-app-text border-orange-500/50 shadow-lg shadow-orange-500/5" 
                            : "bg-app-card/50 text-app-muted border-app-border hover:border-app-muted/30"
                        )}
                      >
                        <div 
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            activeMetrics.includes(key) ? "scale-100 opacity-100" : "scale-50 opacity-30"
                          )} 
                          style={{ backgroundColor: typedConfig.color }} 
                        />
                        {typedConfig.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Smoothing</span>
                <div className="flex flex-wrap items-center gap-1 bg-app-bg/50 p-1 rounded-2xl sm:rounded-full border border-app-border">
                  {[1, 3, 10, 30, 60].map((window) => (
                    <button
                      key={window}
                      onClick={() => setSmoothingWindow(window)}
                      className={cn(
                        "px-2 sm:px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                        smoothingWindow === window 
                          ? "bg-orange-500 text-black shadow-lg" 
                          : "text-app-muted hover:text-app-text"
                      )}
                    >
                      {window === 1 ? 'Raw' : `${window}s`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col border border-app-border/50 rounded-2xl overflow-hidden bg-app-bg/20">
              {activeMetrics.map((metric, index) => (
                <MetricLane 
                  key={metric}
                  metric={metric}
                  config={metricsConfig[metric]}
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
                  isLast={index === activeMetrics.length - 1}
                  syncId="activityMetrics"
                  height={activeMetrics.length > 3 ? 120 : 160}
                  estimatedCp={estimatedCp}
                  cp={cp}
                  manualCP={manualCP}
                  powerZoneDefinitions={powerZoneDefinitions}
                  hrZoneDefinitions={hrZoneDefinitions}
                  maxHR={maxHR}
                  showCP={showCP}
                  showECP={showECP}
                />
              ))}
            </div>

            {activeMetrics.includes('power') && (
              <div className="flex items-center justify-center gap-6 py-2 border-t border-app-border/30 bg-app-card/10">
                <button 
                  onClick={() => setShowCP(!showCP)}
                  className={cn(
                    "flex items-center gap-2 transition-all duration-300",
                    showCP ? "opacity-100" : "opacity-30 grayscale"
                  )}
                >
                  <div className="w-6 h-0.5 bg-[#3b82f6] border-t border-dashed border-[#3b82f6]" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-app-muted">Critical Power</span>
                </button>
                <button 
                  onClick={() => setShowECP(!showECP)}
                  className={cn(
                    "flex items-center gap-2 transition-all duration-300",
                    showECP ? "opacity-100" : "opacity-30 grayscale"
                  )}
                >
                  <div className="w-6 h-0.5 bg-[#ef4444] border-t border-dashed border-[#ef4444]" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-app-muted">Estimated CP</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
