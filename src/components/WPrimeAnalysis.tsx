import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Zap } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { MetricLane } from './MetricLane';
import { cn } from '../lib/utils';
import { CyclingDataPoint } from '../types';

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
  showCP: boolean;
  setShowCP: (show: boolean) => void;
  showECP: boolean;
  setShowECP: (show: boolean) => void;
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
  showCP,
  setShowCP,
  showECP,
  setShowECP
}) => {
  return (
    <div className="bg-app-card border border-app-border rounded-3xl p-8">
      <SectionHeader 
        icon={TrendingUp}
        title="W' Balance Analysis"
        description="Anaerobic capacity utilization and recovery tracking"
        isExpanded={isWPrimeExpanded}
        onToggle={() => setIsWPrimeExpanded(!isWPrimeExpanded)}
      />

      <AnimatePresence>
        {isWPrimeExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-[10px] text-app-muted uppercase tracking-widest mt-1">Anaerobic Reserve Depletion & Recovery</p>
                </div>
                {cpWPrime && (
                  <div className="grid grid-cols-2 md:flex md:items-center gap-4 sm:gap-6">
                    <div className="text-center">
                      <div className="text-[8px] sm:text-[10px] text-app-muted uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                        Critical Power
                        {manualCP !== null && <span className="text-[8px] bg-orange-500/20 text-orange-500 px-1 rounded">Manual</span>}
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-orange-500">{Math.round(manualCP ?? cpWPrime.cp ?? 0)}W</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8px] sm:text-[10px] text-app-muted uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                        W' Capacity
                        {manualWPrime !== null && <span className="text-[8px] bg-purple-500/20 text-purple-500 px-1 rounded">Manual</span>}
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-purple-500">{Math.round((manualWPrime ?? cpWPrime.wPrime ?? 0) / 1000)}kJ</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col border border-app-border/50 rounded-2xl overflow-hidden bg-app-bg/20">
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
                  showCP={showCP}
                  showECP={showECP}
                />
                {/* W' Balance Lane */}
                <MetricLane 
                  metric="wPrimeBalance"
                  config={{ label: "W' Balance", color: '#a855f7', unit: 'J' }}
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

              {/* CP & W' Analysis */}
              <div className="bg-app-card border border-app-border rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-bold tracking-[0.2em] text-app-text/60">Critical Power Analysis</h3>
                  <Zap className="w-4 h-4 text-orange-500" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] tracking-widest text-app-muted font-bold">Estimated CP (eCP)</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-light tracking-tighter">{Math.round(cpWPrime?.cp || 0)}</span>
                      <span className="text-sm text-app-muted">Watts</span>
                    </div>
                    <p className="text-[10px] text-app-muted/50 mt-2 leading-relaxed">
                      Critical Power represents the highest power output you can maintain indefinitely without fatigue.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] tracking-widest text-app-muted font-bold">Estimated W' (eW')</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-light tracking-tighter">{Math.round(cpWPrime?.wPrime || 0)}</span>
                      <span className="text-sm text-app-muted">Joules</span>
                    </div>
                    <p className="text-[10px] text-app-muted/50 mt-2 leading-relaxed">
                      W' is your anaerobic work capacity, the finite amount of energy available above Critical Power.
                    </p>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-app-border/30">
                  <p className="text-[9px] text-app-muted/40 uppercase tracking-widest font-medium">
                    Model: 2-Parameter Linear Model (Work = CP × t + W')
                  </p>
                </div>
              </div>

              <div className="bg-app-bg/50 rounded-2xl p-6 border border-app-border">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  What is W' Balance?
                </h4>
                <p className="text-xs text-app-muted leading-relaxed">
                  W' (pronounced "W-prime") represents your anaerobic work capacity—the total amount of work you can perform above your Critical Power (CP) before reaching exhaustion. 
                  The W' Balance chart shows how this reserve depletes when you ride above CP and how it recovers when you ride below it. 
                  When the curve hits zero, you've theoretically reached your limit for high-intensity effort.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
