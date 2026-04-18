import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Check, 
  TrendingUp, 
  Trash2, 
  ArrowUpDown, 
  Activity,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatDuration } from '../lib/utils';
import { HistoricalActivity, ActivitySummary } from '../types';
import { SectionHeader } from './SectionHeader';

interface HistorySidebarProps {
  isHistoryExpanded: boolean;
  setIsHistoryExpanded: (expanded: boolean) => void;
  selectedHistoryIds: string[];
  setSelectedHistoryIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  history: HistoricalActivity[];
  sortedHistory: HistoricalActivity[];
  summary: ActivitySummary | null;
  historySortOrder: 'newest' | 'oldest';
  setHistorySortOrder: (order: 'newest' | 'oldest' | ((prev: 'newest' | 'oldest') => 'newest' | 'oldest')) => void;
  handleCompare: () => void;
  loadFromHistory: (id: string) => void;
  removeFromHistory: (id: string) => void;
  removeMultipleFromHistory: (ids: string[]) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const HistorySidebar = React.memo(({
  isHistoryExpanded,
  setIsHistoryExpanded,
  selectedHistoryIds,
  setSelectedHistoryIds,
  history,
  sortedHistory,
  summary,
  historySortOrder,
  setHistorySortOrder,
  handleCompare,
  loadFromHistory,
  removeFromHistory,
  removeMultipleFromHistory,
  isOpen,
  onClose
}: HistorySidebarProps) => {
  const isMobileView = isOpen !== undefined;

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileView && isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "bg-app-card border border-app-border rounded-3xl p-6 sm:p-8 transition-all duration-300 relative",
        isMobileView ? cn(
          "fixed top-0 right-0 h-full w-[85%] sm:w-[400px] z-[70] rounded-none border-l shadow-2xl overflow-y-auto md:relative md:w-auto md:h-auto md:rounded-3xl md:border md:shadow-none md:z-auto md:p-8",
          isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        ) : ""
      )}>
        {isMobileView && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-app-bg rounded-full text-app-muted md:hidden z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <SectionHeader 
          icon={History}
          title="Activity History"
          description="Manage and compare activities"
          isExpanded={isHistoryExpanded}
          onToggle={() => setIsHistoryExpanded(!isHistoryExpanded)}
          infoContent={{
            title: "Activity History",
            description: "Your local database of rides. You can select multiple activities to compare power curves, view historical training load trends in the PMC, or permanently delete rides using the trash icon."
          }}
        />
                
      <AnimatePresence>
        {isHistoryExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-4">
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={() => {
                        if (selectedHistoryIds.length === history.length && history.length > 0) {
                          setSelectedHistoryIds([]);
                        } else {
                          setSelectedHistoryIds(history.map(h => h.id));
                        }
                      }}
                      className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all",
                        selectedHistoryIds.length === history.length && history.length > 0 ? "bg-orange-500 border-orange-500" : "border-app-border bg-app-bg"
                      )}
                      title={selectedHistoryIds.length === history.length ? "Deselect All" : "Select All"}
                    >
                      {selectedHistoryIds.length === history.length && history.length > 0 && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Select All</span>
                  </div>
                </div>
          
                <div className="flex flex-wrap items-center gap-2">
                  {selectedHistoryIds.length >= 2 && (
                    <button 
                      onClick={handleCompare}
                      className="bg-orange-500 text-black px-3 sm:px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border border-orange-500 shadow-lg shadow-orange-500/20 animate-in fade-in zoom-in duration-300 flex items-center gap-2"
                    >
                      <TrendingUp className="w-3 h-3" />
                      Compare {selectedHistoryIds.length}
                    </button>
                  )}
                  {selectedHistoryIds.length > 0 && (
                    <button 
                      onClick={() => removeMultipleFromHistory(selectedHistoryIds)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 sm:px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border border-red-500/20 animate-in fade-in zoom-in duration-300 flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete {selectedHistoryIds.length}
                    </button>
                  )}
                  {history.length > 0 && (
                    <button 
                      onClick={() => setHistorySortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                      className="flex items-center gap-2 px-3 py-1 bg-app-card border border-app-border rounded-full text-[10px] font-bold uppercase tracking-widest text-app-muted hover:text-app-text transition-all"
                      title={historySortOrder === 'newest' ? "Switch to Oldest First" : "Switch to Newest First"}
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      {historySortOrder === 'newest' ? 'NEWEST' : 'OLDEST'}
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {sortedHistory.length > 0 ? (
                  sortedHistory.map(h => (
                    <div 
                      key={h.id} 
                      onClick={() => loadFromHistory(h.id)}
                      className={cn(
                        "bg-app-card border rounded-xl p-3 sm:p-4 flex items-center justify-between group cursor-pointer transition-all",
                        summary?.startTime && h.date === summary.startTime.toISOString().split('T')[0] && h.name === summary.name ? "border-orange-500 ring-1 ring-orange-500" : "border-app-border hover:border-app-border/80"
                      )}
                    >
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHistoryIds(prev => 
                              prev.includes(h.id) ? prev.filter(id => id !== h.id) : [...prev, h.id]
                            );
                          }}
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0",
                            selectedHistoryIds.includes(h.id) ? "bg-orange-500 border-orange-500" : "border-app-border bg-app-bg"
                          )}
                        >
                          {selectedHistoryIds.includes(h.id) && <Check className="w-3 h-3 text-black" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{h.name}</div>
                          <div className="text-[10px] text-app-muted truncate">
                            {format(new Date(h.date), 'MMM d, yyyy')} • {formatDuration(h.duration)}
                            {h.avgPower !== undefined && ` • ${Math.round(h.avgPower)} W AVG`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                          <div className="text-right hidden sm:block font-bold">
                            <div className="text-xs text-orange-500">{Math.round(h.bikeScore || 0)}</div>
                            <div className="text-[10px] text-app-muted uppercase tracking-widest">BIKESCORE</div>
                          </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); loadFromHistory(h.id); }}
                            className="px-2 sm:px-3 py-1 bg-orange-500 text-black rounded-full text-[10px] font-bold uppercase tracking-widest transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shadow-lg shadow-orange-500/20"
                          >
                            VIEW
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromHistory(h.id);
                            }}
                            className="p-1.5 sm:p-2 hover:bg-red-500/20 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-50 bg-app-card/30 rounded-2xl border border-dashed border-app-border">
                    <div className="w-12 h-12 bg-app-card rounded-full flex items-center justify-center mb-4 border border-app-border">
                      <Activity className="w-6 h-6 text-app-muted" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest font-bold mb-2">No activities yet</p>
                    <p className="text-[10px] text-app-muted max-w-[200px]">Upload a FIT file to start analyzing your performance data.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
});

HistorySidebar.displayName = 'HistorySidebar';
