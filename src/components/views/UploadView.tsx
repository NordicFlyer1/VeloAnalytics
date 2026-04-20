import React from 'react';
import { Upload, Loader2, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FileStatus, ActivitySummary, CyclingDataPoint } from '../../types';
import { estimateCPWPrime } from '../../services/metrics';

interface UploadViewProps {
  showUploadView: boolean;
  setShowUploadView: (show: boolean) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  handleFileUpload: (files: FileList | null) => void;
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
  summary
}) => {
  if (!showUploadView && (summary || history.length > 0)) return null;

  return (
    <div 
      className={cn(
        "mt-12 border-2 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center transition-all duration-300",
        isDragging ? "border-orange-500 bg-orange-500/5 scale-[1.01]" : "border-white/10 bg-white/2 hover:bg-white/[0.04]"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
    >
      <div className="w-20 h-20 bg-app-card rounded-full flex items-center justify-center mb-6">
        <Upload className="w-10 h-10 text-app-muted" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Drop your activity files</h2>
      <p className="text-app-muted mb-8 max-w-md text-center">
        Support for Garmin <span className="text-app-text/60">.fit</span> files.
      </p>
      <label className="bg-orange-500 hover:bg-orange-600 text-black px-8 py-3 rounded-full font-bold transition-all cursor-pointer shadow-xl shadow-orange-500/20 active:scale-95">
        Select Files
        <input type="file" className="hidden" accept=".fit" multiple onChange={(e) => handleFileUpload(e.target.files)} />
      </label>
      
      {uploadQueue.length > 0 && (
        <div className="mt-12 w-full max-w-2xl bg-app-card border border-app-border rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="px-6 py-4 border-b border-app-border flex items-center justify-between bg-app-card/50">
            <div className="flex items-center gap-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Processing Queue</h3>
            </div>
            <button 
              onClick={() => setUploadQueue([])}
              className="text-[10px] font-bold uppercase tracking-widest text-app-muted/50 hover:text-app-muted transition-colors"
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
                    onClick={() => {
                      setSummary(item.summary!);
                      setData(item.data!);
                      setIsEditingName(false);
                      setEditedName('');
                      setOriginalFile(item.file || null);
                      setCurrentActivityId(item.historyId || null);
                      const cpWPrimeResult = estimateCPWPrime(item.data!);
                      setCpWPrime(cpWPrimeResult);
                      setEstimatedCp(cpWPrimeResult?.cp ? Math.round(cpWPrimeResult.cp) : null);
                      setActivePoint(null);
                      setIsPointLocked(false);
                      setShowUploadView(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="ml-4 px-4 py-1.5 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-black rounded-full text-[10px] font-bold uppercase tracking-widest border border-orange-500/20 transition-all shadow-lg hover:shadow-orange-500/20"
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
};
