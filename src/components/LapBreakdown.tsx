import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutList } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { Lap } from '../types';
import { cn } from '../lib/utils';

interface LapBreakdownProps {
  isLapsExpanded: boolean;
  setIsLapsExpanded: (expanded: boolean) => void;
  currentLaps: Lap[];
  lapMode: 'file' | '1km' | '5km' | '10km' | '1min' | '5min' | '10min';
  setLapMode: (mode: 'file' | '1km' | '5km' | '10km' | '1min' | '5min' | '10min') => void;
}

export const LapBreakdown: React.FC<LapBreakdownProps> = ({
  isLapsExpanded,
  setIsLapsExpanded,
  currentLaps,
  lapMode,
  setLapMode
}) => {
  return (
    <div className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={LayoutList}
        title="Lap Breakdown"
        description="Detailed performance metrics for individual segments"
        isExpanded={isLapsExpanded}
        onToggle={() => setIsLapsExpanded(!isLapsExpanded)}
        infoContent={{
          title: "Lap Breakdown",
          description: "Comprehensive analysis of automatic and manual segments. Provides granular statistics for each lap including duration, distance, intensity (relative and absolute), power distribution, heart rate response, and total work performed."
        }}
      />

      <AnimatePresence>
        {isLapsExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex overflow-x-auto pb-1 sm:pb-0 items-center gap-1 bg-app-bg/50 p-1 rounded-full border border-app-border no-scrollbar scrollbar-hide">
                  {[
                    { id: 'file', label: 'FILE' },
                    { id: '1km', label: '1KM' },
                    { id: '5km', label: '5KM' },
                    { id: '10km', label: '10KM' },
                    { id: '1min', label: '1MIN' },
                    { id: '5min', label: '5MIN' },
                    { id: '10min', label: '10MIN' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setLapMode(mode.id as any)}
                      className={cn(
                        "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all whitespace-nowrap",
                        lapMode === mode.id 
                          ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                          : "text-app-muted hover:text-app-text"
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {/* Desktop Table View */}
                <table className="w-full text-left border-collapse hidden md:table">
                  <thead className="sticky top-0 bg-app-card z-10">
                    <tr className="border-b border-app-border">
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">LAP</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">TIME</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">DIST (KM)</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">AVG/MAX POWER (W)</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">xPower (W)</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">WORK (KJ)</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">AVG/MAX HR (BPM)</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">AVG/MAX CADENCE (RPM)</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">AVG/MAX SPEED (KM/H)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLaps.map((lap) => (
                      <tr key={lap.id} className="border-b border-app-border/50 hover:bg-app-card transition-colors group">
                        <td className="py-4 text-xs font-medium text-orange-500">#{lap.id}</td>
                        <td className="py-4 text-xs text-app-text/60">
                          {Math.floor(lap.duration / 60)}:{(lap.duration % 60).toString().padStart(2, '0')}
                        </td>
                        <td className="py-4 text-xs text-app-text/60">{(lap.distance / 1000).toFixed(2)}</td>
                        <td className="py-4 text-xs text-app-text/60 font-bold">
                          {Math.round(lap.avgPower || 0)} / {Math.round(lap.maxPower || 0)} W
                        </td>
                        <td className="py-4 text-xs text-app-text/60 italic">
                          {Math.round(lap.xPower || 0)}
                        </td>
                        <td className="py-4 text-xs text-orange-500/80 font-bold">
                          {Math.round((lap.avgPower || 0) * (lap.duration || 0) / 1000)}
                        </td>
                        <td className="py-4 text-xs text-app-text/60">
                          {Math.round(lap.avgHeartRate || 0)} / {Math.round(lap.maxHeartRate || 0)}
                        </td>
                        <td className="py-4 text-xs text-app-text/60">
                          {Math.round(lap.avgCadence || 0)} / {Math.round(lap.maxCadence || 0)}
                        </td>
                        <td className="py-4 text-xs text-app-text/60">
                          {(lap.avgSpeed || 0).toFixed(1)} / {(lap.maxSpeed || 0).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {currentLaps.map((lap) => (
                    <div key={lap.id} className="bg-app-bg/50 border border-app-border rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-app-border pb-3 uppercase tracking-widest font-bold">
                        <span className="text-sm text-orange-500">LAP #{lap.id}</span>
                        <span className="text-xs text-app-text/60">
                          {Math.floor(lap.duration / 60)}:{(lap.duration % 60).toString().padStart(2, '0')} • {(lap.distance / 1000).toFixed(2)} KM
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Power (Avg/Max • xP)</span>
                          <div className="text-xs font-bold text-app-text">{Math.round(lap.avgPower || 0)} / {Math.round(lap.maxPower || 0)} / {Math.round(lap.xPower || 0)} W</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Work</span>
                          <div className="text-xs font-bold text-orange-500">{Math.round((lap.avgPower || 0) * (lap.duration || 0) / 1000)} KJ</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Heart Rate</span>
                          <div className="text-xs text-app-text/80">{Math.round(lap.avgHeartRate || 0)} / {Math.round(lap.maxHeartRate || 0)} BPM</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Cadence</span>
                          <div className="text-xs text-app-text/80">{Math.round(lap.avgCadence || 0)} / {Math.round(lap.maxCadence || 0)} RPM</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Speed</span>
                          <div className="text-xs text-app-text/80">{(lap.avgSpeed || 0).toFixed(1)} / {(lap.maxSpeed || 0).toFixed(1)} KM/H</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
