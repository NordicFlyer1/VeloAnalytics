import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface ExportProgressProps {
  active: boolean;
  type: string;
  progress: number;
}

export const ExportProgress: React.FC<ExportProgressProps> = ({
  active,
  type,
  progress
}) => {
  if (!active) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-8 fade-in duration-500">
      <div className="bg-app-card/90 backdrop-blur-xl border border-orange-500/30 p-5 rounded-3xl shadow-2xl min-w-[280px]">
         <div className="flex items-center gap-4 mb-4">
           <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center animate-pulse">
             <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
           </div>
           <div>
             <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500 mb-0.5">Exporting Task</div>
             <div className="text-xs font-bold text-app-text">{type} Format</div>
           </div>
         </div>
         <div className="h-1.5 w-full bg-app-bg/50 rounded-full overflow-hidden">
           <motion.div 
             initial={{ width: 0 }} 
             animate={{ width: `${progress}%` }} 
             className="h-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]" 
           />
         </div>
      </div>
    </div>
  );
};
