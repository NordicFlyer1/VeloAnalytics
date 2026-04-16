import { 
  calculatePowerCurve, 
  calculateWPrimeBalance, 
  calculatePMC, 
  estimateCPWPrime 
} from '../services/metrics';
import { CyclingDataPoint } from '../types';

/**
 * Web Worker for heavy cycling metric calculations.
 * This prevents the main thread from blocking during large dataset processing.
 */

self.onmessage = (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    switch (type) {
      case 'PING': {
        self.postMessage({ type: 'PONG' });
        break;
      }

      case 'CALCULATE_POWER_CURVE': {
        const result = calculatePowerCurve(payload.data);
        self.postMessage({ type: 'POWER_CURVE_RESULT', payload: result, id });
        break;
      }

      case 'CALCULATE_WPRIME_BALANCE': {
        const { data, cp, wPrime } = payload;
        const result = calculateWPrimeBalance(data, cp, wPrime);
        self.postMessage({ type: 'WPRIME_BALANCE_RESULT', payload: result, id });
        break;
      }

      case 'CALCULATE_PMC': {
        const result = calculatePMC(payload.history);
        self.postMessage({ type: 'PMC_RESULT', payload: result, id });
        break;
      }

      case 'ESTIMATE_CP_WPRIME': {
        const result = estimateCPWPrime(payload.data);
        self.postMessage({ type: 'ESTIMATE_CP_WPRIME_RESULT', payload: result, id });
        break;
      }

      default:
        console.warn(`Unknown worker message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      payload: error instanceof Error ? error.message : String(error), 
      id 
    });
  }
};
