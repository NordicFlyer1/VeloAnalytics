import React from 'react';
import { 
  Activity, 
  Zap, 
  Upload, 
  Sun, 
  Moon, 
  BookOpen, 
  LayoutList, 
  Table, 
  Settings, 
  ChevronRight,
  History as HistoryIcon,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';

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
  toggleHistorySidebar: () => void;
  onActivityHistoryClick: () => void;
  isHistorySidebarOpen: boolean;
  showIntelligence: boolean;
  setShowIntelligence: (show: boolean) => void;
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
  setShowSettings,
  toggleHistorySidebar,
  onActivityHistoryClick,
  isHistorySidebarOpen,
  showIntelligence,
  setShowIntelligence
}) => {
  return (
    <header className="border-b border-app-border bg-app-bg/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:h-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
          {/* Title Row */}
          <div className="flex items-center justify-start gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              VELO<span className="text-orange-500">ANALYTICS</span>
            </h1>
          </div>
          
          {/* Controls Row */}
          <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-4 md:gap-6">
            {/* Group 1: Data & Performance */}
            <div className="flex items-center gap-1 sm:gap-2 bg-app-card/50 border border-app-border p-1 rounded-full shadow-sm">
              <div 
                className="flex items-center gap-1 sm:gap-2 px-2 py-1 rounded-full hover:bg-app-card transition-colors"
                title="Critical Power (Watts)"
              >
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
                <input 
                  type="number" 
                  value={cp} 
                  onChange={(e) => setCP(parseInt(e.target.value) || 0)}
                  className="bg-transparent w-9 sm:w-12 text-[10px] sm:text-xs font-bold focus:outline-none text-orange-400"
                />
                <span className="text-[8px] sm:text-[10px] text-app-muted uppercase tracking-widest font-bold">W</span>
              </div>
              
              <div className="w-[1px] h-3 bg-app-border" />

              <button 
                onClick={() => setShowUploadView(!showUploadView)}
                className={cn(
                  "p-1.5 sm:p-2 sm:px-4 rounded-full transition-all flex items-center gap-2",
                  showUploadView ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "text-app-muted hover:text-orange-500 hover:bg-orange-500/5"
                )}
                title={showUploadView ? "Cancel" : "Upload"}
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-widest">{showUploadView ? 'Cancel' : 'Upload'}</span>
              </button>

              <button 
                onClick={() => onActivityHistoryClick()}
                className={cn(
                  "p-1.5 sm:p-2 rounded-full transition-all",
                  isHistorySidebarOpen ? "bg-orange-500/10 text-orange-500" : "text-app-muted hover:text-orange-500 hover:bg-orange-500/5"
                )}
                title="History"
              >
                <HistoryIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            {/* Group 2: View & Settings */}
            <div className="flex items-center gap-1 bg-app-card/50 border border-app-border p-1 rounded-full shadow-sm">
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors text-app-muted hover:text-orange-500"
                title="Theme"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> : <Moon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />}
              </button>
              
              <button 
                onClick={() => toggleAllPanels(areAllPanelsCollapsed)}
                className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors text-app-muted hover:text-orange-500"
                title="Toggle Panels"
              >
                {areAllPanelsCollapsed ? <LayoutList className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> : <Table className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-orange-500" />}
              </button>

              <button 
                onClick={() => setShowIntelligence(!showIntelligence)}
                className={cn(
                  "p-1.5 sm:p-2 sm:px-3 rounded-full transition-all flex items-center gap-1.5",
                  showIntelligence 
                    ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                    : "text-app-muted hover:text-orange-500 hover:bg-orange-500/5"
                )}
                title="Velo Coach"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                <span className="hidden lg:inline text-[9px] font-bold uppercase tracking-widest">Coach</span>
              </button>

              <button 
                onClick={() => setShowSettings(true)}
                className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors text-app-muted hover:text-orange-500"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>
              
              <button 
                onClick={() => setShowAboutModal(true)}
                className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors text-app-muted hover:text-orange-500"
                title="About"
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
