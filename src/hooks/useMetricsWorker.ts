import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to interact with the Metrics Web Worker.
 * Provides a promise-based interface for heavy calculations.
 */
export function useMetricsWorker() {
  const workerRef = useRef<Worker | null>(null);
  const requestsRef = useRef<Map<string, { resolve: (val: any) => void, reject: (err: any) => void }>>(new Map());

  useEffect(() => {
    // Initialize worker using Vite's worker constructor
    const worker = new Worker(new URL('../workers/metrics.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (e: MessageEvent) => {
      const { type, payload, id, error } = e.data;
      const request = requestsRef.current.get(id);

      if (request) {
        if (type === 'ERROR' || error) {
          request.reject(payload || error);
        } else {
          request.resolve(payload);
        }
        requestsRef.current.delete(id);
      }
    };

    worker.onerror = (e) => {
      console.error('Metrics Worker Error:', e);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const runTask = useCallback((type: string, payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = Math.random().toString(36).substring(2, 15);
      requestsRef.current.set(id, { resolve, reject });

      workerRef.current.postMessage({ type, payload, id });
    });
  }, []);

  const calculatePowerCurve = useCallback((data: any[]) => {
    return runTask('CALCULATE_POWER_CURVE', { data });
  }, [runTask]);

  const calculateWPrimeBalance = useCallback((data: any[], cp: number, wPrime: number) => {
    return runTask('CALCULATE_WPRIME_BALANCE', { data, cp, wPrime });
  }, [runTask]);

  const calculatePMC = useCallback((history: any[]) => {
    return runTask('CALCULATE_PMC', { history });
  }, [runTask]);

  const estimateCPWPrime = useCallback((data: any[]) => {
    return runTask('ESTIMATE_CP_WPRIME', { data });
  }, [runTask]);

  return {
    calculatePowerCurve,
    calculateWPrimeBalance,
    calculatePMC,
    estimateCPWPrime
  };
}
