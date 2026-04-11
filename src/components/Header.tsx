import React from 'react';
import { Activity, Zap, Upload, Sun, Moon, BookOpen, LayoutList, Table, Settings, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  estimatedCp: number | null;
  cp: number;
  setCP: (cp: number) => void;
  autoUpdateCP: boolean;
  showUploadView: boolean;
  setShowUploadView: (show: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  setShowAboutModal: (show: boolean) => void;
  areAllPanelsCollapsed: boolean;
  toggleAllPanels: (collapsed: boolean) => void;
  setShowSettings: (show: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  estimatedCp,
  cp,
  setCP,
  autoUpdateCP,
  showUploadView,
  setShowUploadView,
  theme,
  setTheme,
  setShowAboutModal,
  areAllPanelsCollapsed,
  toggleAllPanels,
  setShowSettings
}) => {
  return (
    <header className="border-b border-app-border bg-app-bg/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            VELO<span className="text-orange-500 hidden sm:inline">ANALYTICS</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          {estimatedCp && estimatedCp > cp && !autoUpdateCP && (
            <button 
              onClick={() => setCP(estimatedCp)}
              className="hidden lg:flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-full border border-orange-500/20 transition-all group"
            >
              <Zap className="w-3 h-3 text-orange-500 animate-pulse" />
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                Update CP to {estimatedCp}W?
              </span>
              <ChevronRight className="w-3 h-3 text-orange-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
          <div 
            className="flex items-center gap-1 sm:gap-2 bg-app-card border border-app-border px-2 sm:px-3 py-1 sm:py-1.5 rounded-full"
            title="Critical Power (Watts)"
          >
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
            <span className="text-[10px] sm:text-xs font-medium text-app-muted hidden sm:inline">CP:</span>
            <input 
              type="number" 
              value={cp} 
              onChange={(e) => setCP(parseInt(e.target.value) || 0)}
              className="bg-transparent w-8 sm:w-12 text-[10px] sm:text-xs font-bold focus:outline-none text-orange-400"
            />
            <span className="text-[8px] sm:text-[10px] text-app-muted uppercase tracking-widest">W</span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => setShowUploadView(!showUploadView)}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all",
                showUploadView ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "bg-app-card text-app-muted border border-app-border hover:text-app-text"
              )}
              title={showUploadView ? "Cancel Upload" : "Upload Activity (.fit)"}
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{showUploadView ? 'Cancel' : 'Upload'}</span>
            </button>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors border border-transparent hover:border-app-border"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-app-muted" />
              )}
            </button>
            <button 
              onClick={() => setShowAboutModal(true)}
              className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors border border-transparent hover:border-app-border"
              title="About & Methodology"
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-app-muted" />
            </button>
            <button 
              onClick={() => toggleAllPanels(areAllPanelsCollapsed)}
              className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors border border-transparent hover:border-app-border"
              title={areAllPanelsCollapsed ? "Expand All Panels" : "Collapse All Panels"}
            >
              {areAllPanelsCollapsed ? (
                <LayoutList className="w-4 h-4 sm:w-5 sm:h-5 text-app-muted" />
              ) : (
                <Table className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              )}
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors border border-transparent hover:border-app-border"
              title="Training Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-app-muted" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
