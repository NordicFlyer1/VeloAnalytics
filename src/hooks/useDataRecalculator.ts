import { useEffect, useState } from 'react';
import { ActivitySummary, CyclingDataPoint, ZoneDefinition } from '../types';
import { 
  calculateXPower, 
  calculateRI, 
  calculateBikeScore, 
  calculateZones, 
  getZonesFromDefinitions 
} from '../services/metrics';

const DEFAULT_FALLBACK_CP = 250;
const DEFAULT_FALLBACK_WPRIME = 20000;

export const useDataRecalculator = (
  data: CyclingDataPoint[],
  setData: React.Dispatch<React.SetStateAction<CyclingDataPoint[]>>,
  summary: ActivitySummary | null,
  setSummary: React.Dispatch<React.SetStateAction<ActivitySummary | null>>,
  settings: any,
  cpWPrime: any,
  workerCalculateWPrimeBalance: any
) => {
  const {
    cp,
    maxHR,
    powerZoneDefinitions,
    hrZoneDefinitions,
    cpMode,
    manualCP,
    manualWPrime
  } = settings;

  // Recalculate summary metrics when settings change
  useEffect(() => {
    if (data.length === 0 || !summary) return;

    const powers = data.map(p => p.power || 0);
    const heartRates = data.map(p => p.heartRate || 0).filter(h => h > 0);
    const durationCount = (data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime()) / 1000;
    const safeDuration = Number.isFinite(durationCount) ? durationCount : 0;
    
    const xPower = calculateXPower(data);
    const safeCP = (cp && cp > 0) ? cp : 250;
    const relativeIntensity = xPower !== undefined ? calculateRI(xPower, safeCP) : undefined;
    const bikeScore = (xPower !== undefined && relativeIntensity !== undefined) ? calculateBikeScore(safeDuration, xPower, relativeIntensity, safeCP) : undefined;

    const pZones = calculateZones(powers, getZonesFromDefinitions(powerZoneDefinitions, safeCP));
    const hZones = heartRates.length > 0 ? calculateZones(heartRates, getZonesFromDefinitions(hrZoneDefinitions, maxHR)) : undefined;

    setSummary(prev => prev ? ({
      ...prev,
      xPower: xPower !== undefined ? xPower : prev.xPower,
      relativeIntensity: relativeIntensity !== undefined ? relativeIntensity : prev.relativeIntensity,
      bikeScore: bikeScore !== undefined ? bikeScore : prev.bikeScore,
      powerZones: pZones,
      hrZones: hZones
    }) : null);
  }, [cp, maxHR, powerZoneDefinitions, hrZoneDefinitions, data]);

  // Recalculate W' Balance when CP mode or manual values change
  useEffect(() => {
    if (data.length === 0) return;

    const calculateNewWBal = async () => {
      let targetCP: number;
      let targetWPrime: number;

      if (cpMode === 'manual') {
        targetCP = (manualCP && manualCP > 0) ? manualCP : (cpWPrime?.cp || DEFAULT_FALLBACK_CP);
        targetWPrime = (manualWPrime && manualWPrime > 0) ? manualWPrime : (cpWPrime?.wPrime || DEFAULT_FALLBACK_WPRIME);
      } else {
        targetCP = cpWPrime?.cp || DEFAULT_FALLBACK_CP;
        targetWPrime = cpWPrime?.wPrime || DEFAULT_FALLBACK_WPRIME;
      }

      try {
        const wBal = await workerCalculateWPrimeBalance(data, targetCP, targetWPrime);
        setData(prev => {
          if (prev.length !== data.length || (prev[0]?.timestamp.getTime() !== data[0]?.timestamp.getTime())) {
            return prev;
          }
          return prev.map((p, i) => ({
            ...p,
            wPrimeBalance: wBal[i]
          }));
        });
      } catch (err) {
        console.error('Failed to recalculate W\' balance:', err);
      }
    };

    calculateNewWBal();
  }, [cpMode, manualCP, manualWPrime, cpWPrime, data.length]);
};
