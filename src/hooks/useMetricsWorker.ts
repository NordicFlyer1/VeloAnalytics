import { useEffect, useRef, useCallback, useState } from 'react';
import * as metrics from '../services/metrics';
// @ts-ignore - Vite specific import for worker bundling
import MetricsWorker from '../workers/metrics.worker?worker';

/**
 * Hook to interact with the Metrics Web Worker.
 * Provides a promise-based interface for heavy calculations.
 * Includes a synchronous fallback if the worker environment is restricted.
 */
export function useMetricsWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const requestsRef = useRef<Map<string, { resolve: (val: any) => void, reject: (err: any) => void }>>(new Map());

  useEffect(() => {
    try {
      // Initialize worker using Vite's ?worker import
      // This is more reliable for bundling and path resolution in proxied environments
      const worker = new MetricsWorker();

      worker.onmessage = (e: MessageEvent) => {
        const { type, payload, id, error } = e.data;
        
        if (type === 'PONG') {
          setIsWorkerReady(true);
          return;
        }

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
        // Fallback to sync mode if worker crashes
        setIsWorkerReady(false);
      };

      workerRef.current = worker;
      
      // Ping worker to check readiness
      worker.postMessage({ type: 'PING' });

    } catch (err) {
      console.error('Failed to initialize Web Worker, falling back to synchronous execution:', err);
      setIsWorkerReady(false);
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const runTask = useCallback((type: string, payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2, 15);

      // If worker isn't ready, use synchronous fallback
      if (!isWorkerReady || !workerRef.current) {
        try {
          let result;
          switch (type) {
            case 'CALCULATE_POWER_CURVE':
              result = metrics.calculatePowerCurve(payload.data);
              break;
            case 'CALCULATE_WPRIME_BALANCE':
              result = metrics.calculateWPrimeBalance(payload.data, payload.cp, payload.wPrime);
              break;
            case 'CALCULATE_PMC':
              result = metrics.calculatePMC(payload.history);
              break;
            case 'ESTIMATE_CP_WPRIME':
              result = metrics.estimateCPWPrime(payload.data);
              break;
            default:
              throw new Error(`Unknown task type: ${type}`);
          }
          resolve(result);
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
          let result;
          switch (type) {
            case 'CALCULATE_POWER_CURVE':
              result = metrics.calculatePowerCurve(payload.data);
              break;
            case 'CALCULATE_WPRIME_BALANCE':
              result = metrics.calculateWPrimeBalance(payload.data, payload.cp, payload.wPrime);
              break;
            case 'CALCULATE_PMC':
              result = metrics.calculatePMC(payload.history);
              break;
            case 'ESTIMATE_CP_WPRIME':
              result = metrics.estimateCPWPrime(payload.data);
              break;
            default:
              throw new Error(`Unknown task type: ${type}`);
          }
          resolve(result);
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
            let result;
            switch (type) {
              case 'CALCULATE_POWER_CURVE':
                result = metrics.calculatePowerCurve(payload.data);
                break;
              case 'CALCULATE_WPRIME_BALANCE':
                result = metrics.calculateWPrimeBalance(payload.data, payload.cp, payload.wPrime);
                break;
              case 'CALCULATE_PMC':
                result = metrics.calculatePMC(payload.history);
                break;
              case 'ESTIMATE_CP_WPRIME':
                result = metrics.estimateCPWPrime(payload.data);
                break;
              default:
                throw new Error(`Unknown task type: ${type}`);
            }
            request?.resolve(result);
          } catch (fallbackErr) {
            request?.reject(fallbackErr);
          }
        }
      }, 15000);
    });
  }, [isWorkerReady]);

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
