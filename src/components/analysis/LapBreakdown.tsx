import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutList, Table, Image } from 'lucide-react';
import { SectionHeader, ExportAction } from '../ui/SectionHeader';
import { Lap } from '../../types';
import { cn } from '../../lib/utils';
import { exportToCSV } from '../../lib/csvExport';

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
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleExportCSV = () => {
    if (!currentLaps || !currentLaps.length) return;

    const exportData = currentLaps.map(lap => ({
      Lap: lap.id,
      Time: `${Math.floor(lap.duration / 60)}:${(lap.duration % 60).toString().padStart(2, '0')}`,
      'Distance (KM)': (lap.distance / 1000).toFixed(2),
      'Avg Power (W)': Math.round(lap.avgPower || 0),
      'Max Power (W)': Math.round(lap.maxPower || 0),
      'xPower (W)': Math.round(lap.xPower || 0),
      'Work (KJ)': Math.round((lap.avgPower || 0) * (lap.duration || 0) / 1000),
      'Avg HR (BPM)': Math.round(lap.avgHeartRate || 0),
      'Max HR (BPM)': Math.round(lap.maxHeartRate || 0),
      'Avg Cadence (RPM)': Math.round(lap.avgCadence || 0),
      'Max Cadence (RPM)': Math.round(lap.maxCadence || 0),
      'Avg Speed (KM/H)': (lap.avgSpeed || 0).toFixed(1),
      'Max Speed (KM/H)': (lap.maxSpeed || 0).toFixed(1)
    }));

    const fileName = `Velo_Laps_${lapMode.toUpperCase()}_${new Date().getTime()}.csv`;
    exportToCSV(exportData, fileName);
  };

  const exportActions: ExportAction[] = [
    {
      label: 'Full Panel (PNG)',
      icon: Image,
      onClick: async () => {
        if (containerRef.current) {
          const { exportComponentAsImage } = await import('../../lib/chartExport');
          const fileName = `Velo_Laps_Full_${new Date().getTime()}.png`;
          await exportComponentAsImage(containerRef.current, fileName);
        }
      }
    },
    {
      label: 'Table Data (CSV)',
      icon: Table,
      onClick: handleExportCSV
    }
  ];

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={LayoutList}
        title="Lap Breakdown"
        description="Detailed performance metrics for individual segments"
        isExpanded={isLapsExpanded}
        onToggle={() => setIsLapsExpanded(!isLapsExpanded)}
        exportActions={exportActions}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 export-ignore">
                <div className="flex items-center justify-between sm:justify-start gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted ml-1 sm:ml-0">Lap Mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex overflow-x-auto pb-1 sm:pb-0 items-center gap-1 bg-app-bg/50 p-1 rounded-full border border-app-border no-scrollbar scrollbar-hide -mx-1 sm:mx-0 flex-1">
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
                          "px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-full transition-all whitespace-nowrap",
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
              </div>

              <div className="max-h-[50vh] md:max-h-[400px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar no-scrollbar scroll-smooth">
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
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {currentLaps.map((lap) => (
                    <div key={lap.id} className="bg-app-bg/30 border border-app-border/60 rounded-2xl p-4 space-y-4 active:scale-[0.98] transition-all">
                      <div className="flex justify-between items-center border-b border-app-border/40 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-widest font-black text-orange-500">LAP #{lap.id}</span>
                          <div className="w-1 h-3 bg-app-border rounded-full" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-app-text/80">
                            {Math.floor(lap.duration / 60)}:{(lap.duration % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-app-muted">{(lap.distance / 1000).toFixed(2)} KM</span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase tracking-widest text-app-muted font-bold">Power (Avg/Max • xP)</span>
                          <div className="text-[11px] font-bold text-app-text tracking-tight">
                            {Math.round(lap.avgPower || 0)} / {Math.round(lap.maxPower || 0)} <span className="text-app-muted text-[10px] font-medium">• {Math.round(lap.xPower || 0)}W</span>
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase tracking-widest text-app-muted font-bold">Energy</span>
                          <div className="text-[11px] font-bold text-orange-500 tracking-tight">{Math.round((lap.avgPower || 0) * (lap.duration || 0) / 1000)} KJ</div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase tracking-widest text-app-muted font-bold">Heart Rate</span>
                          <div className="text-[11px] font-medium text-app-text/80">{Math.round(lap.avgHeartRate || 0)} / {Math.round(lap.maxHeartRate || 0)} <span className="text-[8px] opacity-60">BPM</span></div>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] uppercase tracking-widest text-app-muted font-bold">Cadence</span>
                          <div className="text-[11px] font-medium text-app-text/80">{Math.round(lap.avgCadence || 0)} / {Math.round(lap.maxCadence || 0)} <span className="text-[8px] opacity-60">RPM</span></div>
                        </div>
                        <div className="space-y-0.5 col-span-2 border-t border-app-border/20 pt-2">
                          <span className="text-[9px] uppercase tracking-widest text-app-muted font-bold">Speed</span>
                          <div className="text-[11px] font-medium text-app-text/80">{(lap.avgSpeed || 0).toFixed(1)} / {(lap.maxSpeed || 0).toFixed(1)} <span className="text-[8px] opacity-60">KM/H</span></div>
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
