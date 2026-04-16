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
    <div className="bg-app-card border border-app-border rounded-3xl p-8">
      <SectionHeader 
        icon={LayoutList}
        title="Lap Breakdown"
        description="Detailed performance metrics for individual segments"
        isExpanded={isLapsExpanded}
        onToggle={() => setIsLapsExpanded(!isLapsExpanded)}
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
                <div className="flex flex-wrap items-center gap-1 bg-app-bg/50 p-1 rounded-full border border-app-border">
                  {[
                    { id: 'file', label: 'File' },
                    { id: '1km', label: '1km' },
                    { id: '5km', label: '5km' },
                    { id: '10km', label: '10km' },
                    { id: '1min', label: '1min' },
                    { id: '5min', label: '5min' },
                    { id: '10min', label: '10min' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setLapMode(mode.id as any)}
                      className={cn(
                        "px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full transition-all",
                        lapMode === mode.id 
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                          : "text-app-muted hover:text-app-text hover:bg-app-card"
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
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Lap</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Time</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Dist (km)</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Avg/Max Power</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Avg/Max HR</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Avg/Max Cadence</th>
                      <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Avg/Max Speed</th>
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
                        <td className="py-4 text-xs text-app-text/60">
                          {Math.round(lap.avgHeartRate || 0)} / {Math.round(lap.maxHeartRate || 0)} bpm
                        </td>
                        <td className="py-4 text-xs text-app-text/60">
                          {Math.round(lap.avgCadence || 0)} / {Math.round(lap.maxCadence || 0)} rpm
                        </td>
                        <td className="py-4 text-xs text-app-text/60">
                          {(lap.avgSpeed || 0).toFixed(1)} / {(lap.maxSpeed || 0).toFixed(1)} km/h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {currentLaps.map((lap) => (
                    <div key={lap.id} className="bg-app-bg/50 border border-app-border rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-app-border pb-3">
                        <span className="text-sm font-bold text-orange-500">Lap #{lap.id}</span>
                        <span className="text-xs font-medium text-app-text/60">
                          {Math.floor(lap.duration / 60)}:{(lap.duration % 60).toString().padStart(2, '0')} • {(lap.distance / 1000).toFixed(2)} km
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                        <div className="space-y-1">
                          <span className="text-[8px] uppercase tracking-widest text-app-muted font-bold">Power (Avg/Max)</span>
                          <div className="text-xs font-bold text-app-text">{Math.round(lap.avgPower || 0)} / {Math.round(lap.maxPower || 0)} W</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] uppercase tracking-widest text-app-muted font-bold">Heart Rate</span>
                          <div className="text-xs text-app-text/80">{Math.round(lap.avgHeartRate || 0)} / {Math.round(lap.maxHeartRate || 0)} bpm</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] uppercase tracking-widest text-app-muted font-bold">Cadence</span>
                          <div className="text-xs text-app-text/80">{Math.round(lap.avgCadence || 0)} / {Math.round(lap.maxCadence || 0)} rpm</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] uppercase tracking-widest text-app-muted font-bold">Speed</span>
                          <div className="text-xs text-app-text/80">{(lap.avgSpeed || 0).toFixed(1)} / {(lap.maxSpeed || 0).toFixed(1)} km/h</div>
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
