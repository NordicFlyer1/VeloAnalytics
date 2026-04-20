import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Info, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onExport?: () => void;
  exportTitle?: string;
  renderRight?: React.ReactNode;
  className?: string;
  infoContent?: {
    title: string;
    description: string;
  };
}

export const SectionHeader = ({ 
  icon: Icon, 
  title, 
  description, 
  isExpanded, 
  onToggle, 
  onExport,
  exportTitle,
  renderRight,
  className,
  infoContent
}: SectionHeaderProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExport) {
      setIsExporting(true);
      try {
        await onExport();
      } finally {
        setIsExporting(false);
      }
    }
  };

  return (
    <div className={cn("mb-4 sm:mb-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-orange-500/10 rounded-xl">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-app-text">{title}</h3>
              {infoContent && (
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className={cn(
                    "p-1 rounded-md transition-all cursor-help",
                    showInfo ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "text-app-muted hover:text-orange-500 hover:bg-orange-500/5 focus:outline-none"
                  )}
                  title={`What is ${title}?`}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {description && <p className="text-xs text-app-muted font-medium">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {renderRight}
          {onExport && isExpanded && (
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className={cn(
                "p-2 bg-app-card border border-app-border rounded-full text-orange-500/60 hover:text-orange-500 hover:border-orange-500/30 transition-all flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed",
                isExporting && "animate-pulse"
              )}
              title={exportTitle || "Download as PNG"}
            >
              <Download className={cn("w-3.5 h-3.5 group-hover:scale-110 transition-transform", isExporting && "animate-bounce")} />
            </button>
          )}
          <button 
            onClick={onToggle}
            className="px-3 py-1.5 bg-app-card border border-app-border rounded-full text-[10px] font-bold uppercase tracking-widest text-orange-500/60 hover:text-orange-500 hover:border-orange-500/30 transition-all flex items-center gap-2 group"
          >
            {isExpanded ? (
              <>
                <span className="hidden sm:inline">Collapse</span>
                <ChevronUp className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Expand</span>
                <ChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showInfo && infoContent && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6 relative">
              <button 
                onClick={() => setShowInfo(false)}
                className="absolute top-4 right-4 text-orange-500/40 hover:text-orange-500 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                  <Info className="w-4 h-4 text-black" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Metric Guide: {infoContent.title}</h4>
                  <p className="text-sm text-app-text/80 leading-relaxed font-medium">
                    {infoContent.description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
