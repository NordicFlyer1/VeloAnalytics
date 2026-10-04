import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, ChartArea, BarChart3 } from 'lucide-react';
import { SectionHeader, ExportAction } from '../ui/SectionHeader';
import { MetricLane } from './MetricLane';
import { cn } from '../../lib/utils';
import { CyclingDataPoint, ZoneDefinition } from '../../types';
import { exportComponentAsImage } from '../../lib/chartExport';

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
  cpMode: 'manual' | 'estimated';
  setCpMode: (mode: 'manual' | 'estimated') => void;
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
          const fileName = `Velo_MetricAnalysis_Full_${new Date().getTime()}.png`;
          await exportComponentAsImage(containerRef.current, fileName);
        }
      }
    },
    {
      label: 'Chart Area (PNG)',
      icon: ChartArea,
      onClick: async () => {
        if (chartAreaRef.current) {
          const fileName = `Velo_MetricAnalysis_Chart_${new Date().getTime()}.png`;
          await exportComponentAsImage(chartAreaRef.current, fileName);
        }
      }
    }
  ];

  const toggleMetric = (key: string) => {
    setActiveMetrics(prev => {
      const next = prev.includes(key) 
        ? (prev.length > 1 ? prev.filter(m => m !== key) : prev)
        : [...prev, key];
      const order = Object.keys(metricsConfig);
      return [...next].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    });
  };

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={BarChart3}
        title="Metric Analysis"
        description="Deep dive into your performance data with synchronized power, heart rate, and pacing charts"
        isExpanded={isChartExpanded}
        onToggle={() => setIsChartExpanded(!isChartExpanded)}
        exportActions={exportActions}
        infoContent={{
          title: "Metric Analysis",
          description: "Explore point-by-point data for Power, W' Balance, Heart Rate, Cadence, Speed, Altitude, and Slope. Use the smoothing controls to filter out raw data noise, inspect training zones, and evaluate Critical Power benchmarks."
        }}
      />
      
      <AnimatePresence>
        {isChartExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col gap-4 mb-6 sm:mb-8 export-ignore">
              {/* Category: Ride Metrics */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 w-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted ml-1 sm:ml-0 shrink-0 w-24">
                  Ride Metrics
                </span>
                <div className="flex items-center overflow-x-auto pb-1 sm:pb-0 gap-1 bg-app-bg/50 p-1 rounded-full border border-app-border scrollbar-hide no-scrollbar max-w-full">
                  {Object.entries(metricsConfig).map(([key, config]) => {
                    const typedConfig = config as { label: string, color: string, unit: string };
                    const isActive = activeMetrics.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleMetric(key)}
                        className={cn(
                          "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
                          isActive 
                            ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                            : "text-app-muted hover:text-app-text"
                        )}
                      >
                        {!isActive && (
                          <div 
                            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: typedConfig.color }} 
                          />
                        )}
                        {typedConfig.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category: Smoothing Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted ml-1 sm:ml-0 shrink-0 w-24">
                  Smoothing
                </span>
                <div className="flex items-center overflow-x-auto pb-1 sm:pb-0 gap-1 bg-app-bg/50 p-1 rounded-full border border-app-border no-scrollbar shrink-0">
                  {[1, 3, 10, 30, 60].map((window) => (
                    <button
                      key={window}
                      onClick={() => setSmoothingWindow(window)}
                      className={cn(
                        "px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
                        smoothingWindow === window 
                          ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                          : "text-app-muted hover:text-app-text"
                      )}
                    >
                      {window === 1 ? 'Raw' : `${window}S`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div ref={chartAreaRef} className="flex flex-col border border-app-border/50 rounded-2xl overflow-hidden bg-app-bg/20">
              {activeMetrics.map((metric, index) => (
                <MetricLane 
                  key={metric}
                  metric={metric}
                  config={metricsConfig[metric] || { label: metric.toUpperCase(), color: '#f97316', unit: '' }}
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
                      if (isPointLocked && activePoint === e.activeTooltipIndex) {
                        setIsPointLocked(false);
                        setActivePoint(null);
                      } else {
                        setIsPointLocked(true);
                        setActivePoint(e.activeTooltipIndex);
                      }
                    }
                  }}
                  isLast={index === activeMetrics.length - 1}
                  syncId="activity-sync"
                  height={metric === 'riderPosition' ? 90 : 160}
                  estimatedCp={estimatedCp}
                  cp={cp}
                  manualCP={manualCP}
                  powerZoneDefinitions={powerZoneDefinitions}
                  hrZoneDefinitions={hrZoneDefinitions}
                  maxHR={maxHR}
                  showCP={cpMode === 'manual'}
                  showECP={cpMode === 'estimated'}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
