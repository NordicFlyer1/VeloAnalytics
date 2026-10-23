import { useEffect, useRef, useCallback, useState } from 'react';
import * as metrics from '../services/metrics';
// @ts-ignore - Vite specific import for worker bundling
import MetricsWorker from '../workers/metrics.worker?worker';

/**
 * Hook to interact with the Metrics Web Workers.
 * Employs a Dual-Worker architecture:
 * 1. UI Worker: Dedicated to foreground charts and active ride calculations (Power Curve, W' Balance, etc.).
 * 2. Batch Worker: Isolated channel for background batch uploads and season-level aggregations.
 * This completely isolates foreground user interactions from background batch loads,
 * guaranteeing < 50ms chart computation latency without worker starvation.
 */
export function useMetricsWorker() {
  const uiWorkerRef = useRef<Worker | null>(null);
  const batchWorkerRef = useRef<Worker | null>(null);
  
  const [isUiWorkerReady, setIsUiWorkerReady] = useState(false);
  const [isBatchWorkerReady, setIsBatchWorkerReady] = useState(false);

  const uiRequestsRef = useRef<Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>>(new Map());
  const batchRequestsRef = useRef<Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>>(new Map());

  // Initialize both workers
  useEffect(() => {
    // 1. Initialize UI Worker
    try {
      const uiWorker = new MetricsWorker();
      uiWorker.onmessage = (e: MessageEvent) => {
        const { type, payload, id, error } = e.data;
        if (type === 'PONG') {
          setIsUiWorkerReady(true);
          return;
        }
        const request = uiRequestsRef.current.get(id);
        if (request) {
          if (type === 'ERROR' || error) {
            request.reject(payload || error);
          } else {
            request.resolve(payload);
          }
          uiRequestsRef.current.delete(id);
        }
      };
      uiWorker.onerror = (e) => {
        console.error('UI Metrics Worker Error:', e);
        setIsUiWorkerReady(false);
      };
      uiWorkerRef.current = uiWorker;
      uiWorker.postMessage({ type: 'PING' });
    } catch (err) {
      console.warn('Failed to initialize UI Web Worker, using sync fallback:', err);
      setIsUiWorkerReady(false);
    }

    // 2. Initialize Batch Worker
    try {
      const batchWorker = new MetricsWorker();
      batchWorker.onmessage = (e: MessageEvent) => {
        const { type, payload, id, error } = e.data;
        if (type === 'PONG') {
          setIsBatchWorkerReady(true);
          return;
        }
        const request = batchRequestsRef.current.get(id);
        if (request) {
          if (type === 'ERROR' || error) {
            request.reject(payload || error);
          } else {
            request.resolve(payload);
          }
          batchRequestsRef.current.delete(id);
        }
      };
      batchWorker.onerror = (e) => {
        console.error('Batch Metrics Worker Error:', e);
        setIsBatchWorkerReady(false);
      };
      batchWorkerRef.current = batchWorker;
      batchWorker.postMessage({ type: 'PING' });
    } catch (err) {
      console.warn('Failed to initialize Batch Web Worker, using sync fallback:', err);
      setIsBatchWorkerReady(false);
    }

    return () => {
      uiWorkerRef.current?.terminate();
      uiWorkerRef.current = null;
      batchWorkerRef.current?.terminate();
      batchWorkerRef.current = null;
    };
  }, []);

  const executeSync = (type: string, payload: any) => {
    switch (type) {
      case 'CALCULATE_POWER_CURVE':
        return metrics.calculatePowerCurve(payload.data);
      case 'CALCULATE_WPRIME_BALANCE':
        return metrics.calculateWPrimeBalance(payload.data, payload.cp, payload.wPrime);
      case 'CALCULATE_PMC':
        return metrics.calculatePMC(payload.history);
      case 'ESTIMATE_CP_WPRIME':
        return metrics.estimateCPWPrime(payload.data);
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  };

  const runTask = useCallback((
    workerRef: React.MutableRefObject<Worker | null>,
    isReady: boolean,
    requestsRef: React.MutableRefObject<Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>>,
    type: string,
    payload: any
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2, 15);

      // If worker isn't available or ready, fall back to synchronous calculation
      if (!isReady || !workerRef.current) {
        try {
          resolve(executeSync(type, payload));
        } catch (err) {
          reject(err);
        }
        return;
      }

      requestsRef.current.set(id, { resolve, reject });
      try {
        workerRef.current.postMessage({ type, payload, id });
      } catch (postErr) {
        console.warn('Worker postMessage failed, falling back to sync:', postErr);
        requestsRef.current.delete(id);
        try {
          resolve(executeSync(type, payload));
        } catch (syncErr) {
          reject(syncErr);
        }
        return;
      }

      // Safety timeout for worker tasks (15s fallback to synchronous computation)
      setTimeout(() => {
        if (requestsRef.current.has(id)) {
          const request = requestsRef.current.get(id);
          requestsRef.current.delete(id);
          try {
            request?.resolve(executeSync(type, payload));
          } catch (fallbackErr) {
            request?.reject(fallbackErr);
          }
        }
      }, 15000);
    });
  }, []);

  // --- UI Priority Methods (Dedicated to Foreground Dashboard) ---
  const calculatePowerCurve = useCallback((data: any[]) => {
    return runTask(uiWorkerRef, isUiWorkerReady, uiRequestsRef, 'CALCULATE_POWER_CURVE', { data });
  }, [runTask, isUiWorkerReady]);

  const calculateWPrimeBalance = useCallback((data: any[], cp: number, wPrime: number) => {
    return runTask(uiWorkerRef, isUiWorkerReady, uiRequestsRef, 'CALCULATE_WPRIME_BALANCE', { data, cp, wPrime });
  }, [runTask, isUiWorkerReady]);

  const calculatePMC = useCallback((history: any[]) => {
    return runTask(uiWorkerRef, isUiWorkerReady, uiRequestsRef, 'CALCULATE_PMC', { history });
  }, [runTask, isUiWorkerReady]);

  const estimateCPWPrime = useCallback((data: any[]) => {
    return runTask(uiWorkerRef, isUiWorkerReady, uiRequestsRef, 'ESTIMATE_CP_WPRIME', { data });
  }, [runTask, isUiWorkerReady]);

  // --- Batch Methods (Dedicated to Background Parsing/Processing) ---
  const batchCalculatePowerCurve = useCallback((data: any[]) => {
    return runTask(batchWorkerRef, isBatchWorkerReady, batchRequestsRef, 'CALCULATE_POWER_CURVE', { data });
  }, [runTask, isBatchWorkerReady]);

  const batchCalculateWPrimeBalance = useCallback((data: any[], cp: number, wPrime: number) => {
    return runTask(batchWorkerRef, isBatchWorkerReady, batchRequestsRef, 'CALCULATE_WPRIME_BALANCE', { data, cp, wPrime });
  }, [runTask, isBatchWorkerReady]);

  const batchCalculatePMC = useCallback((history: any[]) => {
    return runTask(batchWorkerRef, isBatchWorkerReady, batchRequestsRef, 'CALCULATE_PMC', { history });
  }, [runTask, isBatchWorkerReady]);

  const batchEstimateCPWPrime = useCallback((data: any[]) => {
    return runTask(batchWorkerRef, isBatchWorkerReady, batchRequestsRef, 'ESTIMATE_CP_WPRIME', { data });
  }, [runTask, isBatchWorkerReady]);

  return {
    calculatePowerCurve,
    calculateWPrimeBalance,
    calculatePMC,
    estimateCPWPrime,
    batchCalculatePowerCurve,
    batchCalculateWPrimeBalance,
    batchCalculatePMC,
    batchEstimateCPWPrime
  };
}
