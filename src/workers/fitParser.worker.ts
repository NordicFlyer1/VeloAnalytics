import { Buffer } from 'buffer';

// Polyfill Buffer in Worker global scope for fit-file-parser dependency
if (typeof (self as any).Buffer === 'undefined') {
  (self as any).Buffer = Buffer;
}
if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

import FitParser from 'fit-file-parser';
import { normalizeFitData } from '../lib/fitParserUtils';

/**
 * Universal Web Worker for asynchronous, off-thread binary FIT file parsing.
 * Decodes raw binary ArrayBuffers, normalizes telemetry, Garmin SDK bitmasks,
 * power phase arcs, and seated/standing transitions off the main UI thread.
 */

self.onmessage = (e: MessageEvent) => {
  const { type, buffer, id, fileName } = e.data;

  try {
    switch (type) {
      case 'PING': {
        self.postMessage({ type: 'PONG' });
        break;
      }

      case 'PARSE_FIT': {
        if (!buffer || !(buffer instanceof ArrayBuffer)) {
          self.postMessage({
            type: 'PARSE_FIT_ERROR',
            id,
            error: 'Invalid binary buffer provided for FIT parsing.'
          });
          return;
        }

        const fitParser = new FitParser({
          force: true,
          speedUnit: 'km/h',
          lengthUnit: 'm',
          temperatureUnit: 'celsius'
        });

        fitParser.parse(buffer, (error: any, fitData: any) => {
          if (error) {
            self.postMessage({
              type: 'PARSE_FIT_ERROR',
              id,
              error: error instanceof Error ? error.message : String(error)
            });
            return;
          }

          try {
            const { points, laps } = normalizeFitData(fitData);
            self.postMessage({
              type: 'PARSE_FIT_SUCCESS',
              id,
              points,
              laps,
              fileName
            });
          } catch (normError: any) {
            self.postMessage({
              type: 'PARSE_FIT_ERROR',
              id,
              error: normError instanceof Error ? normError.message : String(normError)
            });
          }
        });
        break;
      }

      default:
        console.warn(`[FitParserWorker] Unknown message type: ${type}`);
    }
  } catch (err: any) {
    self.postMessage({
      type: 'PARSE_FIT_ERROR',
      id,
      error: err instanceof Error ? err.message : String(err)
    });
  }
};
