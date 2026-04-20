import React from 'react';
import { History } from 'lucide-react';
import { HistoricalActivity } from '../../types';

interface EmptyHistoryViewProps {
  summary: any;
  history: HistoricalActivity[];
  selectedHistoryIds: string[];
  loadFromHistory: (id: string) => void;
  onOpenHistory: () => void;
}

export const EmptyHistoryView: React.FC<EmptyHistoryViewProps> = ({
  summary,
  history,
  selectedHistoryIds,
  loadFromHistory,
  onOpenHistory
}) => {
  if (summary || history.length === 0 || selectedHistoryIds.length >= 2) return null;

  return (
    <div 
      onClick={onOpenHistory}
      className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 cursor-pointer group hover:bg-white/[0.02] rounded-3xl transition-all"
    >
      <div className="w-24 h-24 bg-app-card rounded-full flex items-center justify-center mb-8 shadow-2xl border border-app-border group-hover:border-orange-500/50 group-hover:scale-110 transition-all duration-500">
        <History className="w-10 h-10 text-orange-500" />
      </div>
      <h2 className="text-3xl font-bold mb-4 tracking-tight group-hover:text-orange-500 transition-colors uppercase">SELECT AN ACTIVITY</h2>
      <p className="text-app-muted mb-10 max-w-md leading-relaxed group-hover:text-app-text transition-colors text-[10px] uppercase font-bold tracking-widest">
        Your history is ready. Click anywhere here to open your activity list and select a ride.
      </p>
    </div>
  );
};
