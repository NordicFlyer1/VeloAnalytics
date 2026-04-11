import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export const SectionHeader = ({ 
  icon: Icon, 
  title, 
  description, 
  isExpanded, 
  onToggle, 
  className 
}: SectionHeaderProps) => (
  <div className={cn("flex items-center justify-between mb-6", className)}>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-orange-500/10 rounded-xl">
        <Icon className="w-5 h-5 text-orange-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-app-text">{title}</h3>
        {description && <p className="text-xs text-app-muted font-medium">{description}</p>}
      </div>
    </div>
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
);
