import { useMemo } from 'react';
import { CyclingDataPoint } from '../types';

export const useDataSmoothing = (data: CyclingDataPoint[], smoothingWindow: number) => {
  return useMemo(() => {
    if (smoothingWindow <= 1 || data.length === 0) return data;

    const result = new Array(data.length);
    const halfWindow = Math.floor(smoothingWindow / 2);

    let sumPower = 0;
    let sumSpeed = 0;
    let sumHR = 0;
    let sumCadence = 0;
    let hrCount = 0;
    let cadenceCount = 0;

    const initialEnd = Math.min(data.length - 1, halfWindow);
    for (let i = 0; i <= initialEnd; i++) {
      sumPower += data[i].power || 0;
      sumSpeed += data[i].speed || 0;
      if (data[i].heartRate) {
        sumHR += data[i].heartRate!;
        hrCount++;
      }
      if (data[i].cadence) {
        sumCadence += data[i].cadence!;
        cadenceCount++;
      }
    }

    for (let i = 0; i < data.length; i++) {
      const oldStart = i - halfWindow - 1;
      const newEnd = i + halfWindow;

      if (oldStart >= 0) {
        sumPower -= data[oldStart].power || 0;
        sumSpeed -= data[oldStart].speed || 0;
        if (data[oldStart].heartRate) {
          sumHR -= data[oldStart].heartRate!;
          hrCount--;
        }
        if (data[oldStart].cadence) {
          sumCadence -= data[oldStart].cadence!;
          cadenceCount--;
        }
      }

      if (newEnd < data.length && newEnd > initialEnd) {
        sumPower += data[newEnd].power || 0;
        sumSpeed += data[newEnd].speed || 0;
        if (data[newEnd].heartRate) {
          sumHR += data[newEnd].heartRate!;
          hrCount++;
        }
        if (data[newEnd].cadence) {
          sumCadence += data[newEnd].cadence!;
          cadenceCount++;
        }
      }

      const currentStart = Math.max(0, i - halfWindow);
      const currentEnd = Math.min(data.length - 1, i + halfWindow);
      const windowSize = currentEnd - currentStart + 1;

      result[i] = {
        ...data[i],
        power: sumPower / windowSize,
        speed: sumSpeed / windowSize,
        heartRate: hrCount > 0 ? sumHR / hrCount : data[i].heartRate,
        cadence: cadenceCount > 0 ? sumCadence / cadenceCount : data[i].cadence
      };
    }

    return result;
  }, [data, smoothingWindow]);
};
