import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Pencil, Check, XCircle, FileDown, Download } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { ActivitySummary } from '../types';
import { formatNumericalDuration } from '../lib/utils';
import { format } from 'date-fns';

interface ActivityDetailsProps {
  isDetailsExpanded: boolean;
  setIsDetailsExpanded: (expanded: boolean) => void;
  summary: ActivitySummary | null;
  isEditingName: boolean;
  setIsEditingName: (editing: boolean) => void;
  editedName: string;
  setEditedName: (name: string) => void;
  updateActivityName: (id: string, newName: string) => void;
  currentActivityId: string | null;
  estimatedCp: number | null;
  exportOriginal: () => void;
  exportGPX: () => void;
}

export const ActivityDetails: React.FC<ActivityDetailsProps> = ({
  isDetailsExpanded,
  setIsDetailsExpanded,
  summary,
  isEditingName,
  setIsEditingName,
  editedName,
  setEditedName,
  updateActivityName,
  currentActivityId,
  estimatedCp,
  exportOriginal,
  exportGPX
}) => {
  if (!summary) return null;

  return (
    <div className="bg-app-card border border-app-border rounded-3xl p-4 sm:p-8">
      <SectionHeader 
        icon={Info}
        title="Activity Details"
        description="Key performance indicators and summary statistics"
        isExpanded={isDetailsExpanded}
        onToggle={() => setIsDetailsExpanded(!isDetailsExpanded)}
        infoContent={{
          title: "Activity Details",
          description: "High-level summary of your session, including duration, distance, total work (KJ), and normalized metrics like xPower and BikeScore™."
        }}
      />
      
      <AnimatePresence>
        {isDetailsExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">Activity Name</span>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (currentActivityId) {
                            updateActivityName(currentActivityId, editedName);
                          }
                          setIsEditingName(false);
                        } else if (e.key === 'Escape') {
                          setIsEditingName(false);
                        }
                      }}
                      className="bg-app-bg border border-app-border rounded px-2 py-1 text-xs focus:border-orange-500 outline-none w-48"
                      autoFocus
                    />
                    <button 
                      onClick={() => {
                        if (currentActivityId) {
                          updateActivityName(currentActivityId, editedName);
                        }
                        setIsEditingName(false);
                      }}
                      className="p-1 hover:bg-orange-500/10 rounded text-orange-500"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => setIsEditingName(false)}
                      className="p-1 hover:bg-red-500/10 rounded text-red-500"
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{summary.name}</span>
                    <button 
                      onClick={() => {
                        setEditedName(summary.name);
                        setIsEditingName(true);
                      }}
                      className="p-1 hover:bg-app-card rounded text-app-muted hover:text-orange-500 transition-colors"
                      title="Edit Activity Name"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">Start Time</span>
                <span className="text-xs font-medium">{format(summary.startTime, 'h:mm:ss a')}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">Duration</span>
                <span className="text-xs font-medium">{formatNumericalDuration(summary.duration)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">Distance</span>
                <span className="text-xs font-medium">{(summary.distance / 1000).toFixed(2)} KM</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">Avg/Max Power</span>
                <span className="text-xs font-medium">{Math.round(summary.avgPower || 0)} / {Math.round(summary.maxPower || 0)} W</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">xPower</span>
                <span className="text-xs font-medium">{Math.round(summary.xPower || 0)} W</span>
              </div>
              {estimatedCp && (
                <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-orange-500/60 uppercase">ESTIMATED CP (ECP)</span>
                  <span className="text-xs font-bold text-orange-500">
                    {estimatedCp} W
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">Avg/Max Cadence</span>
                <span className="text-xs font-medium">{Math.round(summary.avgCadence || 0)} / {Math.round(summary.maxCadence || 0)} RPM</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">Avg/Max Speed</span>
                <span className="text-xs font-medium">{(summary.avgSpeed || 0).toFixed(1)} / {(summary.maxSpeed || 0).toFixed(1)} KM/H</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">Avg/Max Heart Rate</span>
                <span className="text-xs font-medium">{Math.round(summary.avgHeartRate || 0)} / {Math.round(summary.maxHeartRate || 0)} BPM</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">Elevation Gain</span>
                <span className="text-xs font-medium">
                  {Math.round(summary.totalAscent || 0)} M
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">Total Work</span>
                <span className="text-xs font-medium">{Math.round(summary.work || 0)} KJ</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-app-muted">BikeScore™</span>
                <span className="text-xs font-medium">{Math.round(summary.bikeScore || 0)} pts</span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button 
                onClick={exportOriginal}
                className="flex items-center justify-center gap-2 py-3 bg-app-card/50 hover:bg-app-card border border-app-border rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                <FileDown className="w-3 h-3 text-orange-500" />
                ORIGINAL
              </button>
              <button 
                onClick={exportGPX}
                className="flex items-center justify-center gap-2 py-3 bg-app-card/50 hover:bg-app-card border border-app-border rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                <Download className="w-3 h-3 text-orange-500" />
                GPX
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
