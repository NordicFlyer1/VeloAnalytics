import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Activity, 
  Moon, 
  ExternalLink, 
  Settings as SettingsIcon,
  Check,
  ChevronRight,
  Database
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { HistoricalActivity, SleepMetric, HRVMetric } from '../../types';
import { 
  getGarminApiKey, 
  getGarminSettings, 
  saveGarminSettings 
} from '../../services/garmin/garminAuth';
import { 
  syncGarminActivities 
} from '../../services/garmin/garminActivities';
import { 
  syncGarminHealth 
} from '../../services/garmin/garminHealth';
import { 
  GarminSyncProgress, 
  GarminSyncResult 
} from '../../services/garmin/types';

interface GarminSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: (tab?: 'general' | 'zones' | 'equipment' | 'intelligence' | 'garmin' | 'maintenance' | 'experimental') => void;
  existingHistory: HistoricalActivity[];
  existingSleep: SleepMetric[];
  existingHrv: HRVMetric[];
  onActivitiesDownloaded: (files: File[]) => Promise<void> | void;
  onHealthSynced: (sleep: SleepMetric[], hrv: HRVMetric[]) => void;
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
}

export const GarminSyncModal: React.FC<GarminSyncModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  existingHistory,
  existingSleep,
  existingHrv,
  onActivitiesDownloaded,
  onHealthSynced,
  isSyncing,
  setIsSyncing
}) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [syncActivitiesEnabled, setSyncActivitiesEnabled] = useState(true);
  const [syncHealthEnabled, setSyncHealthEnabled] = useState(true);
  const [activityLimit, setActivityLimit] = useState<number>(20);
  const [healthDays, setHealthDays] = useState<number>(14);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | undefined>(undefined);

  // Sync execution states
  const [progress, setProgress] = useState<GarminSyncProgress | null>(null);
  const [syncResult, setSyncResult] = useState<GarminSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Refresh settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const key = getGarminApiKey();
      setApiKey(key);
      const settings = getGarminSettings();
      setSyncActivitiesEnabled(settings.syncActivities !== false);
      setSyncHealthEnabled(settings.syncHealth !== false);
      setActivityLimit(settings.activityLimit || 20);
      setHealthDays(settings.healthDaysBack || 14);
      setLastSyncTimestamp(settings.lastSyncTimestamp);
      setSyncError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    if (isSyncing) return;
    if (!apiKey) {
      setSyncError('Please set your Garmin Connect API Key in Settings first.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    const overallResult: GarminSyncResult = {
      activitiesSynced: 0,
      activitiesSkipped: 0,
      healthDaysSynced: 0,
      errors: []
    };

    try {
      // 1. Sync Activities if enabled
      if (syncActivitiesEnabled) {
        setProgress({
          phase: 'discovering',
          message: 'Connecting to Garmin Connect for cycling activities...'
        });

        const actResult = await syncGarminActivities({
          limit: activityLimit,
          existingHistory,
          onProgress: (p) => setProgress(p),
          onFilesReady: async (files) => {
            await onActivitiesDownloaded(files);
          }
        });

        overallResult.activitiesSynced = actResult.activitiesSynced;
        overallResult.activitiesSkipped = actResult.activitiesSkipped;
        if (actResult.errors.length > 0) {
          overallResult.errors.push(...actResult.errors);
        }
      }

      // 2. Sync Health (Sleep & HRV) if enabled
      if (syncHealthEnabled) {
        setProgress({
          phase: 'downloading',
          message: 'Fetching Garmin sleep & HRV recovery metrics...'
        });

        const healthRes = await syncGarminHealth({
          daysBack: healthDays,
          existingSleep,
          existingHrv,
          syncSleep: true,
          syncHrv: true,
          onProgress: (p) => setProgress(p)
        });

        overallResult.healthDaysSynced = Math.max(healthRes.sleepRecordsSynced, healthRes.hrvRecordsSynced);
        onHealthSynced(healthRes.mergedSleep, healthRes.mergedHrv);
      }

      // Update last sync timestamp
      const updatedTimestamp = Date.now();
      saveGarminSettings({
        ...getGarminSettings(),
        lastSyncTimestamp: updatedTimestamp,
        activityLimit,
        healthDaysBack: healthDays,
        syncActivities: syncActivitiesEnabled,
        syncHealth: syncHealthEnabled
      });
      setLastSyncTimestamp(updatedTimestamp);

      setProgress({
        phase: 'done',
        message: 'Garmin synchronization complete!'
      });
      setSyncResult(overallResult);
    } catch (err: any) {
      const msg = err?.message || 'Synchronization failed. Please check your network and API key.';
      setSyncError(msg);
      setProgress({
        phase: 'error',
        message: msg
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (ts?: number) => {
    if (!ts) return 'Never synced';
    const date = new Date(ts);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-app-card border border-app-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-app-border bg-app-card/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-inner">
              <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin text-orange-500")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-app-text">Garmin Connect Sync</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Personal API
                </span>
              </div>
              <p className="text-[10px] text-app-muted uppercase tracking-widest font-bold mt-0.5">
                Last synced: {formatLastSync(lastSyncTimestamp)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isSyncing}
            className="p-2 hover:bg-app-card rounded-full transition-colors text-app-muted hover:text-app-text disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Missing API Key State */}
          {!apiKey ? (
            <div className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/20 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400">
                    Garmin API Key Required
                  </h3>
                  <p className="text-xs text-app-muted leading-relaxed">
                    To automatically synchronize your rides, sleep stages, and overnight HRV, generate a personal token from Garmin Connect Developer Program and enter it in Settings.
                  </p>
                </div>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings('garmin');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-orange-500 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-orange-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  Configure Key in Settings
                </button>
                <a
                  href="https://developer.garmin.com/gc-developer-program/personal/personal-faq/"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-app-border bg-app-card hover:bg-white/5 text-app-text text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Garmin FAQ</span>
                  <ExternalLink className="w-3 h-3 text-app-muted" />
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Sync Scope Selection */}
              <div className="space-y-4">
                <div className="text-[10px] uppercase tracking-widest font-bold text-app-muted">
                  Sync Data Streams
                </div>

                {/* Stream 1: Cycling Activities */}
                <div className="p-4 rounded-2xl border border-app-border bg-app-card/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-app-text">Cycling Activities</div>
                        <div className="text-[10px] text-app-muted uppercase tracking-widest">
                          Original .FIT Files • Dynamics &amp; Sensors
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSyncActivitiesEnabled(!syncActivitiesEnabled)}
                      disabled={isSyncing}
                      className={cn(
                        "w-8 h-4 rounded-full transition-all relative cursor-pointer",
                        syncActivitiesEnabled ? "bg-orange-500" : "bg-app-border"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                        syncActivitiesEnabled ? "left-4.5" : "left-0.5"
                      )} />
                    </button>
                  </div>

                  {syncActivitiesEnabled && (
                    <div className="pt-2 border-t border-app-border/40 flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-app-muted font-bold">
                        Fetch Recent:
                      </span>
                      <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border">
                        {[10, 20, 50].map(count => (
                          <button
                            key={count}
                            onClick={() => setActivityLimit(count)}
                            disabled={isSyncing}
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                              activityLimit === count 
                                ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                                : "text-app-muted hover:text-app-text"
                            )}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stream 2: Health & Sleep */}
                <div className="p-4 rounded-2xl border border-app-border bg-app-card/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-app-text">Health &amp; Recovery</div>
                        <div className="text-[10px] text-app-muted uppercase tracking-widest">
                          Sleep Stages, Scores &amp; Overnight HRV
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSyncHealthEnabled(!syncHealthEnabled)}
                      disabled={isSyncing}
                      className={cn(
                        "w-8 h-4 rounded-full transition-all relative cursor-pointer",
                        syncHealthEnabled ? "bg-orange-500" : "bg-app-border"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                        syncHealthEnabled ? "left-4.5" : "left-0.5"
                      )} />
                    </button>
                  </div>

                  {syncHealthEnabled && (
                    <div className="pt-2 border-t border-app-border/40 flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-app-muted font-bold">
                        Lookback Range:
                      </span>
                      <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border">
                        {[7, 14, 30].map(days => (
                          <button
                            key={days}
                            onClick={() => setHealthDays(days)}
                            disabled={isSyncing}
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                              healthDays === days 
                                ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                                : "text-app-muted hover:text-app-text"
                            )}
                          >
                            {days} Days
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress & Live Status Box */}
              {progress && (
                <div className="p-4 rounded-2xl bg-app-bg/60 border border-app-border space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-app-text">
                      {isSyncing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                      ) : progress.phase === 'done' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className="capitalize">{progress.phase}</span>
                    </span>
                    {progress.total && progress.current && (
                      <span className="text-[10px] font-mono text-app-muted uppercase tracking-widest font-bold">
                        {progress.current} / {progress.total}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {progress.total && progress.current && (
                    <div className="w-full h-1.5 bg-app-card rounded-full overflow-hidden border border-app-border">
                      <div 
                        className="h-full bg-orange-500 transition-all duration-300"
                        style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                      />
                    </div>
                  )}

                  <p className="text-xs text-app-muted leading-relaxed font-mono">
                    {progress.message}
                  </p>
                </div>
              )}

              {/* Results Summary Box */}
              {syncResult && (
                <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-green-400 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sync Completed Successfully</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-app-card/60 border border-app-border">
                      <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Activities</div>
                      <div className="text-base font-bold text-app-text mt-0.5">
                        +{syncResult.activitiesSynced} <span className="text-[10px] text-app-muted font-normal">({syncResult.activitiesSkipped} existed)</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-app-card/60 border border-app-border">
                      <div className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Health Nights</div>
                      <div className="text-base font-bold text-app-text mt-0.5">
                        +{syncResult.healthDaysSynced} <span className="text-[10px] text-app-muted font-normal">updated</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Box */}
              {syncError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-300 leading-relaxed">
                    {syncError}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-app-border bg-app-card/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenSettings('garmin');
            }}
            className="text-[10px] uppercase font-bold tracking-widest text-app-muted hover:text-orange-500 flex items-center gap-1.5 transition-colors order-2 sm:order-1"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Garmin Settings</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            <button
              onClick={onClose}
              disabled={isSyncing}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-app-border bg-app-card hover:bg-white/5 text-app-muted hover:text-app-text text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
            >
              Close
            </button>
            {apiKey && (
              <button
                onClick={handleStartSync}
                disabled={isSyncing || (!syncActivitiesEnabled && !syncHealthEnabled)}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Garmin</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
