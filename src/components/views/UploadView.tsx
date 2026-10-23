import React from 'react';
import { Upload, Loader2, CheckCircle2, XCircle, Activity, X, Pause, Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FileStatus, ActivitySummary, CyclingDataPoint } from '../../types';
import { estimateCPWPrime } from '../../services/metrics';

interface UploadViewProps {
  showUploadView: boolean;
  setShowUploadView: (show: boolean) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  handleFileUpload: (files: FileList | File[] | null) => void;
  uploadQueue: FileStatus[];
  setUploadQueue: React.Dispatch<React.SetStateAction<FileStatus[]>>;
  setSummary: (summary: ActivitySummary) => void;
  setData: (data: CyclingDataPoint[]) => void;
  setIsEditingName: (editing: boolean) => void;
  setEditedName: (name: string) => void;
  setOriginalFile: (file: File | null) => void;
  setCurrentActivityId: (id: string | null) => void;
  setCpWPrime: (res: any) => void;
  setEstimatedCp: (cp: number | null) => void;
  setActivePoint: (point: number | null) => void;
  setIsPointLocked: (locked: boolean) => void;
  history: any[];
  summary: ActivitySummary | null;
  loadFromHistory?: (id: string) => Promise<any> | void;
  onUserSelectRide?: () => void;
  pauseBatch?: (delayMs?: number) => void;
  resumeBatch?: () => void;
  togglePauseResume?: () => void;
  isBatchPaused?: boolean;
  isProcessingBatch?: boolean;
}

export const UploadView: React.FC<UploadViewProps> = ({
  showUploadView,
  setShowUploadView,
  isDragging,
  setIsDragging,
  handleFileUpload,
  uploadQueue,
  setUploadQueue,
  setSummary,
  setData,
  setIsEditingName,
  setEditedName,
  setOriginalFile,
  setCurrentActivityId,
  setCpWPrime,
  setEstimatedCp,
  setActivePoint,
  setIsPointLocked,
  history,
  summary,
  loadFromHistory,
  onUserSelectRide,
  pauseBatch,
  resumeBatch,
  togglePauseResume,
  isBatchPaused,
  isProcessingBatch
}) => {
  if (!showUploadView && (summary || history.length > 0)) return null;

  const isModal = Boolean(summary || history.length > 0);

  const mainBox = (
    <div 
      className={cn(
        "border-2 border-dashed rounded-3xl p-8 sm:p-14 flex flex-col items-center justify-center transition-all duration-300 relative w-full",
        isModal 
          ? "max-w-2xl bg-white dark:bg-[#121212] border-app-border shadow-2xl animate-in zoom-in-95 duration-200" 
          : "mt-12",
        isDragging 
          ? "border-orange-500 bg-orange-500/15 dark:bg-orange-500/5 scale-[1.01]" 
          : "border-app-border/40 bg-app-card hover:bg-app-card/80"
      )}
      onDragOver={(e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        setIsDragging(false); 
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileUpload(e.dataTransfer.files); 
        }
      }}
    >
      {isModal && (
        <button 
          onClick={() => setShowUploadView(false)}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-app-muted hover:text-app-text transition-colors"
          title="Close queue"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      <div className="w-20 h-20 bg-app-card rounded-full flex items-center justify-center mb-6">
        <Upload className="w-10 h-10 text-app-muted" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Drop your activity files</h2>
      <p className="text-app-muted mb-8 max-w-md text-center">
        Support for Garmin <span className="text-app-text/60">.fit</span> and <span className="text-app-text/60">.csv</span> activity files.
      </p>
      <label className="bg-orange-500 hover:bg-orange-600 text-black px-8 py-3 rounded-full font-bold transition-all cursor-pointer shadow-xl shadow-orange-500/20 active:scale-95">
        Select Files
        <input 
          type="file" 
          className="hidden" 
          accept=".fit,.csv" 
          multiple 
          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileUpload(e.target.files);
            }
            e.target.value = '';
          }} 
        />
      </label>
      
      {uploadQueue.length > 0 && (
        <div className="mt-12 w-full max-w-2xl bg-app-card border border-app-border rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="px-6 py-4 border-b border-app-border flex items-center justify-between bg-app-card/50">
            <div className="flex items-center gap-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Processing Queue</h3>
              {isBatchPaused && (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Paused for Active View
                </span>
              )}
              {isProcessingBatch && togglePauseResume && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePauseResume();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm",
                    isBatchPaused
                      ? "bg-orange-500 text-black shadow-orange-500/20 hover:bg-orange-400"
                      : "bg-app-card border border-app-border text-app-muted hover:text-app-text hover:border-orange-500/40"
                  )}
                >
                  {isBatchPaused ? (
                    <>
                      <Play className="w-2.5 h-2.5 fill-current" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-2.5 h-2.5 fill-current" />
                      Pause
                    </>
                  )}
                </button>
              )}
            </div>
            <button 
              onClick={() => setUploadQueue([])}
              className="text-[10px] font-bold uppercase tracking-widest text-app-muted/50 hover:text-app-muted transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto divide-y divide-app-border/50">
            {uploadQueue.map((item) => (
              <div key={item.id} className="px-6 py-4 flex items-center gap-4 group">
                <div className="w-8 h-8 rounded-full bg-app-card flex items-center justify-center shrink-0">
                  {item.status === 'processing' ? (
                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                  ) : item.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : item.status === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Activity className="w-4 h-4 text-app-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium truncate pr-4">{item.name}</span>
                    <span className="text-[10px] text-app-muted font-mono">{item.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-app-card rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        item.status === 'error' ? "bg-red-500" : "bg-orange-500"
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.error && (
                    <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">{item.error}</p>
                  )}
                </div>
                {item.status === 'completed' && (
                  <button 
                    onClick={async () => {
                      onUserSelectRide?.();
                      pauseBatch?.(0); // Indefinite pause: background yields 100% CPU to active ride!
                      if (item.historyId && loadFromHistory) {
                        await loadFromHistory(item.historyId);
                        setActivePoint(null);
                        setIsPointLocked(false);
                        setShowUploadView(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else if (item.summary && item.data) {
                        setSummary(item.summary);
                        setData(item.data);
                        setIsEditingName(false);
                        setEditedName('');
                        setOriginalFile(item.file || null);
                        setCurrentActivityId(item.historyId || null);
                        const cpWPrimeResult = estimateCPWPrime(item.data);
                        setCpWPrime(cpWPrimeResult);
                        setEstimatedCp(cpWPrimeResult?.cp ? Math.round(cpWPrimeResult.cp) : null);
                        setActivePoint(null);
                        setIsPointLocked(false);
                        setShowUploadView(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="ml-4 px-4 py-1.5 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-black rounded-full text-[10px] font-bold uppercase tracking-widest border border-orange-500/20 transition-all shadow-lg hover:shadow-orange-500/20 cursor-pointer"
                  >
                    View
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-12 flex gap-8 opacity-40">
        <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> <span className="text-xs uppercase tracking-widest">FIT</span></div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-orange-500/10 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowUploadView(false);
        }}
      >
        {mainBox}
      </div>
    );
  }

  return mainBox;
};
