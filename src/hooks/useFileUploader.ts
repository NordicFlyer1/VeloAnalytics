import { useState, useRef, useEffect, useCallback } from 'react';
// @ts-ignore - Vite specific import for worker bundling
import FitParserWorker from '../workers/fitParser.worker?worker';
import FitParser from 'fit-file-parser';
import { ActivitySummary, CyclingDataPoint, FileStatus } from '../types';
import { processActivityData, ProcessingContext } from '../services/activityProcessor';
import { parseCyclingCsv } from '../lib/csvParser';
import { normalizeFitData } from '../lib/fitParserUtils';

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('FileReader failed to read ArrayBuffer.'));
    reader.readAsArrayBuffer(file);
  });
};

const readFileAsText = (file: File): Promise<string> => {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('FileReader failed to read text.'));
    reader.readAsText(file);
  });
};

export const useFileUploader = (
  settings: any,
  setSummary: (s: ActivitySummary | null) => void,
  setData: (p: CyclingDataPoint[]) => void,
  setCpWPrime: (c: any) => void,
  setEstimatedCp: (e: number | null) => void,
  setCurrentActivityId: (id: string | null) => void,
  setOriginalFile: (f: File | null) => void,
  setIsEditingName: (e: boolean) => void,
  setEditedName: (n: string) => void,
  setShowUploadView: (v: boolean) => void,
  addToHistory: (s: ActivitySummary, p: CyclingDataPoint[], f: File, opts?: { debounceCommit?: boolean }) => Promise<string | null>,
  workerCalculatePowerCurve: any,
  workerEstimateCPWPrime: any,
  workerCalculateWPrimeBalance: any,
  addBatchToHistory?: (items: Array<{ summary: ActivitySummary; data: CyclingDataPoint[]; file?: File }>) => Promise<string[]>,
  batchWorkers?: {
    batchCalculatePowerCurve?: any;
    batchEstimateCPWPrime?: any;
    batchCalculateWPrimeBalance?: any;
  },
  flushHistoryBuffer?: () => void,
  loadFromHistory?: (id: string) => Promise<any> | void
) => {
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isBatchPaused, setIsBatchPaused] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileStatus[]>([]);
  
  const workerRef = useRef<Worker | null>(null);
  const userLockedViewRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const pauseTimeoutRef = useRef<any>(null);

  const setUserLockedView = useCallback((locked: boolean) => {
    userLockedViewRef.current = locked;
  }, []);

  const pauseBatch = useCallback((autoResumeDelayMs: number = 0) => {
    isPausedRef.current = true;
    setIsBatchPaused(true);
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    // Only auto-resume if explicitly passed a positive delay
    if (autoResumeDelayMs > 0) {
      pauseTimeoutRef.current = setTimeout(() => {
        resumeBatch();
      }, autoResumeDelayMs);
    }
  }, []);

  const resumeBatch = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    isPausedRef.current = false;
    setIsBatchPaused(false);
  }, []);

  const togglePauseResume = useCallback(() => {
    if (isPausedRef.current) {
      resumeBatch();
    } else {
      pauseBatch(0);
    }
  }, [pauseBatch, resumeBatch]);

  // Lazy initialization of the Web Worker with clean teardown
  const getWorker = useCallback((): Worker | null => {
    if (typeof Worker === 'undefined') return null;
    if (!workerRef.current) {
      try {
        workerRef.current = new FitParserWorker();
      } catch (e) {
        console.warn('Failed to initialize FitParserWorker, falling back to main-thread parser:', e);
        return null;
      }
    }
    return workerRef.current;
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Synchronous / main-thread FIT file parsing fallback.
   * Invoked if Web Workers are unavailable or encounter a runtime error.
   */
  const parseFitFileMainThread = useCallback(async (
    buffer: ArrayBuffer,
    fileName: string
  ): Promise<{ points: CyclingDataPoint[]; laps: any[] }> => {
    return new Promise((resolve, reject) => {
      try {
        const fitParser = new FitParser({
          force: true,
          speedUnit: 'km/h',
          lengthUnit: 'm',
          temperatureUnit: 'celsius'
        });
        fitParser.parse(buffer, (err: any, fitData: any) => {
          if (err) {
            return reject(err instanceof Error ? err : new Error(String(err)));
          }
          try {
            const res = normalizeFitData(fitData);
            resolve(res);
          } catch (normErr) {
            reject(normErr instanceof Error ? normErr : new Error(String(normErr)));
          }
        });
      } catch (syncErr) {
        reject(syncErr instanceof Error ? syncErr : new Error(String(syncErr)));
      }
    });
  }, []);

  /**
   * Parses binary FIT file data.
   * Dispatches decoding and normalization to background Web Worker using zero-copy Transferable ArrayBuffer.
   * If Worker execution encounters any error or timeout, falls back seamlessly to main-thread parsing.
   */
  const parseFitFile = async (
    buffer: ArrayBuffer,
    fileName: string,
    fileId: string
  ): Promise<{ points: CyclingDataPoint[]; laps: any[] }> => {
    // Retain an untouched clone of the ArrayBuffer so that if worker transfer detaches
    // the worker's copy, the fallback copy remains 100% valid for main-thread parsing.
    const fallbackBuffer = buffer.slice(0);

    const runWorkerParse = (): Promise<{ points: CyclingDataPoint[]; laps: any[] }> => {
      return new Promise((resolve, reject) => {
        const worker = getWorker();
        if (!worker) {
          return reject(new Error('Web Worker not available in environment.'));
        }

        let isSettled = false;
        let timeoutId: any = null;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
        };

        // 20-second timeout per file
        timeoutId = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            cleanup();
            try {
              workerRef.current?.terminate();
            } catch (_) {}
            workerRef.current = null;
            reject(new Error(`Worker timeout parsing ${fileName}.`));
          }
        }, 20000);

        const handleMessage = (e: MessageEvent) => {
          const data = e.data;
          if (!data || data.id !== fileId) return;

          if (isSettled) return;
          isSettled = true;
          cleanup();

          if (data.type === 'PARSE_FIT_SUCCESS') {
            const points: CyclingDataPoint[] = (data.points || []).map((p: any) => ({
              ...p,
              timestamp: p.timestamp instanceof Date && !isNaN(p.timestamp.getTime()) ? p.timestamp : new Date(p.timestamp)
            }));
            const laps = (data.laps || []).map((l: any) => ({
              ...l,
              start_time: l.start_time instanceof Date && !isNaN(l.start_time.getTime()) ? l.start_time : new Date(l.start_time)
            }));
            resolve({ points, laps });
          } else if (data.type === 'PARSE_FIT_ERROR') {
            reject(new Error(data.error || 'Failed to parse .fit file in background worker.'));
          }
        };

        const handleError = (e: ErrorEvent) => {
          if (isSettled) return;
          isSettled = true;
          cleanup();
          console.warn('[FitParserWorker] Error event:', e);
          try {
            workerRef.current?.terminate();
          } catch (_) {}
          workerRef.current = null;
          reject(new Error(e.message || 'Background worker error while parsing .fit file.'));
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);

        // Pass sliced ArrayBuffer as Transferable (zero-copy memory transfer)
        const workerTransferBuffer = buffer.slice(0);
        worker.postMessage(
          { type: 'PARSE_FIT', buffer: workerTransferBuffer, fileName, id: fileId },
          [workerTransferBuffer]
        );
      });
    };

    try {
      return await runWorkerParse();
    } catch (workerError) {
      console.warn(`[FitParser] Worker failed for ${fileName}, seamlessly falling back to main-thread parser:`, workerError);
      return await parseFitFileMainThread(fallbackBuffer, fileName);
    }
  };

  /**
   * Pure calculation of activity summary and CP/W' without touching global React UI state.
   * Utilizes batch worker channel if available to protect active UI responsiveness.
   */
  const computeActivityMetrics = async (
    points: CyclingDataPoint[], 
    fileName: string, 
    lapData?: any[],
    isBatchTask: boolean = false
  ) => {
    if (points.length === 0) return null;

    const calcPowerCurve = (isBatchTask && batchWorkers?.batchCalculatePowerCurve) 
      ? batchWorkers.batchCalculatePowerCurve 
      : workerCalculatePowerCurve;

    const calcCPWPrime = (isBatchTask && batchWorkers?.batchEstimateCPWPrime)
      ? batchWorkers.batchEstimateCPWPrime
      : workerEstimateCPWPrime;

    const calcWPrimeBalance = (isBatchTask && batchWorkers?.batchCalculateWPrimeBalance)
      ? batchWorkers.batchCalculateWPrimeBalance
      : workerCalculateWPrimeBalance;

    const ctx: ProcessingContext = {
      cp: settings.cp,
      maxHR: settings.maxHR,
      manualCP: settings.manualCP,
      manualWPrime: settings.manualWPrime,
      cpMode: settings.cpMode,
      userWeight: settings.userWeight,
      weightUnit: settings.weightUnit,
      bikeWeight: settings.bikeWeight,
      enableVirtualPower: settings.enableVirtualPower,
      ridingPosition: settings.ridingPosition,
      surfaceType: settings.surfaceType,
      powerZoneDefinitions: settings.powerZoneDefinitions,
      hrZoneDefinitions: settings.hrZoneDefinitions,
      workerCalculatePowerCurve: calcPowerCurve,
      workerEstimateCPWPrime: calcCPWPrime,
      workerCalculateWPrimeBalance: calcWPrimeBalance
    };

    try {
      const { summary: newSummary, cpWPrimeResult } = await processActivityData(points, fileName, ctx, lapData);
      return { summary: newSummary, cpWPrimeResult };
    } catch (error) {
      console.error('Error calculating activity metrics:', error);
      return null;
    }
  };

  const handleFileUpload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    
    const validFiles = Array.from(files).filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.fit') || name.endsWith('.csv');
    });
    if (validFiles.length === 0) {
      console.warn("Only .fit and .csv files are supported.");
      return;
    }

    const isBatch = validFiles.length > 1;

    const newFiles: FileStatus[] = validFiles.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: f.name,
      progress: 0,
      status: 'pending' as const,
      file: f
    }));

    setUploadQueue(prev => [...prev, ...newFiles]);
    setIsProcessingBatch(true);

    // Yield microtask so browser paints pending queue UI
    await new Promise(r => setTimeout(r, 16));

    let lastCompletedActivityId: string | null = null;
    userLockedViewRef.current = false;

    for (const fileItem of newFiles) {
      const { file, id } = fileItem;

      // 1. Foreground Priority Check: If user clicked "View" on an activity, pause background work!
      while (isPausedRef.current) {
        await new Promise(r => setTimeout(r, 200));
      }

      setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'processing', progress: isBatch ? 30 : 10 } : item));
      await new Promise(r => setTimeout(r, 0));

      try {
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        let points: CyclingDataPoint[];
        let laps: any[] | undefined;

        if (isCsv) {
          const text = await readFileAsText(file);
          if (!isBatch) setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 40 } : item));
          points = parseCyclingCsv(text);
          if (points.length === 0) {
            throw new Error("No valid data records found in .csv file.");
          }
        } else {
          if (!isBatch) setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 20 } : item));
          const buffer = await readFileAsArrayBuffer(file);
          if (!isBatch) setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 40 } : item));
          const parsed = await parseFitFile(buffer, file.name, id);
          points = parsed.points;
          laps = parsed.laps;
        }

        // Check pause again before heavy computation
        while (isPausedRef.current) {
          await new Promise(r => setTimeout(r, 200));
        }

        if (!isBatch) setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 70 } : item));

        const computed = await computeActivityMetrics(points, file.name, laps, isBatch);
        if (!computed || !computed.summary) {
          throw new Error("Failed to generate activity summary.");
        }
        const { summary, cpWPrimeResult } = computed;

        if (!isBatch) setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 90 } : item));

        // Immediately persist to IndexedDB. In batch mode, debounce season-level PMC/MMP recalculations!
        const activityId = await addToHistory(summary, points, file, { debounceCommit: isBatch });

        if (!isBatch) {
          // Single file upload: immediate save and dashboard activation
          setCurrentActivityId(activityId);
          setSummary(summary);
          setData(points);
          setCpWPrime(cpWPrimeResult);
          setEstimatedCp(cpWPrimeResult?.cp ? Math.round(cpWPrimeResult.cp) : null);
          setIsEditingName(false);
          setEditedName('');
          setOriginalFile(file);
        } else {
          lastCompletedActivityId = activityId;
        }

        // Update queue with completed status and lightweight summary.
        // CRITICAL RAM DEALLOCATION: Do NOT keep raw points array in uploadQueue state!
        // IndexedDB safely stores telemetry data, avoiding browser heap exhaustion on <= 8GB RAM.
        setUploadQueue(prev => prev.map(item => item.id === id ? {
          ...item,
          status: 'completed',
          progress: 100,
          summary,
          data: undefined,
          historyId: activityId || undefined
        } : item));

        // Clear local reference so JS garbage collector can deallocate immediately
        (points as any) = null;

      } catch (err: any) {
        console.error(`Error processing ${file.name}:`, err);
        setUploadQueue(prev => prev.map(item => item.id === id ? {
          ...item,
          status: 'error',
          error: err?.message || 'Processing failed',
          progress: 100
        } : item));
      }

      // Polite scheduling yield between batch files:
      // Allows browser garbage collection and UI 60 FPS frames to render cleanly.
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        await new Promise(resolve => {
          (window as any).requestIdleCallback(() => resolve(true), { timeout: 350 });
        });
      } else {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Flush any pending buffered activities into history state
    flushHistoryBuffer?.();

    // In batch mode, activate the last ride if the user did not manually pick one
    if (isBatch && lastCompletedActivityId && !userLockedViewRef.current && loadFromHistory) {
      await loadFromHistory(lastCompletedActivityId);
    }
    
    setIsProcessingBatch(false);
    resumeBatch();
  };

  return { 
    handleFileUpload, 
    uploadQueue, 
    setUploadQueue, 
    isProcessingBatch, 
    isBatchPaused,
    pauseBatch,
    resumeBatch,
    togglePauseResume,
    setUserLockedView 
  };
};
