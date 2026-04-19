import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { subDays, startOfWeek, endOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { 
  HistoricalActivity, 
  ActivitySummary, 
  CyclingDataPoint, 
  PMCDataPoint, 
  Lap 
} from '../types';
import { saveActivityData, getActivityData, deleteActivityData } from '../services/storage';
import { processActivityData, ProcessingContext } from '../services/activityProcessor';
import { calculateAerobicDecoupling } from '../services/metrics';

interface HistoryHookDeps {
  workers: any;
  settings: any; // Result of useSharedSettings
}

export function useActivityHistory({ workers, settings }: HistoryHookDeps) {
  const [history, setHistory] = useState<HistoricalActivity[]>(() => {
    const saved = localStorage.getItem('veloanalytics_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [data, setData] = useState<CyclingDataPoint[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [estimatedCp, setEstimatedCp] = useState<number | null>(null);
  const [cpWPrime, setCpWPrime] = useState<{ cp: number; wPrime: number } | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(null);
  
  const [pmcData, setPmcData] = useState<PMCDataPoint[]>([]);
  const [isCalculatingPmc, setIsCalculatingPmc] = useState(false);
  const [pmcDateRange, setPmcDateRange] = useState<'all' | '1year' | '6months' | '3months' | '6weeks'>('all');
  const [pmcFocus, setPmcFocus] = useState<string | null>(null);

  const [trainingLoadRange, setTrainingLoadRange] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [volumeTrendsRange, setVolumeTrendsRange] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [bikeScoreSummaryView, setBikeScoreSummaryView] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  // Sync history to localStorage (stripped version)
  useEffect(() => {
    try {
      const strippedHistory = history.map(({ fullSummary, fullData, originalFile, ...rest }) => rest);
      localStorage.setItem('veloanalytics_history', JSON.stringify(strippedHistory));
    } catch (e) {
      console.error('Failed to save history to localStorage:', e);
    }
  }, [history]);

  // PMC Calculation logic
  useEffect(() => {
    if (history.length === 0) {
      setPmcData([]);
      return;
    }

    const calculatePmcAsync = async () => {
      setIsCalculatingPmc(true);
      try {
        const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));
        const historyData = sortedHistory.map(h => ({ 
          date: h.date, 
          bikeScore: Number.isFinite(h.bikeScore) ? h.bikeScore : 0 
        }));
        
        let allData = await workers.calculatePMC(historyData);
        
        if (pmcDateRange !== 'all') {
          const now = new Date();
          let filterDate: Date | null = null;
          if (pmcDateRange === '6weeks') filterDate = subDays(now, 42);
          else if (pmcDateRange === '3months') filterDate = subDays(now, 90);
          else if (pmcDateRange === '6months') filterDate = subDays(now, 180);
          else if (pmcDateRange === '1year') filterDate = subDays(now, 365);

          if (filterDate) {
            const filterStr = filterDate.toISOString().split('T')[0];
            allData = allData.filter(d => d.date >= filterStr);
          }
        }
        
        setPmcData(allData);
      } catch (err) {
        console.error('Failed to calculate PMC in worker:', err);
      } finally {
        setIsCalculatingPmc(false);
      }
    };

    calculatePmcAsync();
  }, [history, pmcDateRange, workers.calculatePMC]);

  const currentPMC = useMemo(() => {
    if (pmcData.length === 0) return null;
    return pmcData[pmcData.length - 1];
  }, [pmcData]);

  // Stats and Curves
  const allTimeBestCurve = useMemo(() => {
    if (history.length === 0) return [];
    const durations = [1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600];
    return durations.map(d => {
      let maxPower = 0;
      history.forEach(h => {
        const curve = h.powerCurve || h.fullSummary?.powerCurve;
        const point = curve?.find(p => p.duration === d);
        if (point && point.power > maxPower) maxPower = point.power;
      });
      const labelMap: Record<number, string> = {
        1: '1s', 2: '2s', 5: '5s', 10: '10s', 20: '20s', 30: '30s', 
        60: '1m', 120: '2m', 300: '5m', 600: '10m', 1200: '20m', 
        1800: '30m', 3600: '60m'
      };
      return { duration: d, power: maxPower, label: labelMap[d] || `${d}s` };
    }).filter(p => p.power > 0);
  }, [history]);

  const rolling90DayBestCurve = useMemo(() => {
    if (history.length === 0) return [];
    const ninetyDaysAgo = subDays(new Date(), 90);
    const recentHistory = history.filter(h => new Date(h.date) >= ninetyDaysAgo);
    
    const durations = [1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600];
    return durations.map(d => {
      let maxPower = 0;
      recentHistory.forEach(h => {
        const curve = h.powerCurve || h.fullSummary?.powerCurve;
        const point = curve?.find(p => p.duration === d);
        if (point && point.power > maxPower) maxPower = point.power;
      });
      const labelMap: Record<number, string> = {
        1: '1s', 2: '2s', 5: '5s', 10: '10s', 20: '20s', 30: '30s', 
        60: '1m', 120: '2m', 300: '5m', 600: '10m', 1200: '20m', 
        1800: '30m', 3600: '60m'
      };
      return { duration: d, power: maxPower, label: labelMap[d] || `${d}s` };
    }).filter(p => p.power > 0);
  }, [history]);

  const trainingLoadData = useMemo(() => {
    if (history.length === 0) return [];
    const now = new Date();
    const data: any[] = [];
    
    if (trainingLoadRange === 'weekly') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - (i * 7));
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const weekActivities = history.filter(h => {
          const ad = new Date(h.date);
          return ad >= weekStart && ad <= weekEnd;
        });
        data.push({
          label: `W${format(weekStart, 'w')}`,
          bikeScore: weekActivities.reduce((sum, a) => sum + (Number.isFinite(a.bikeScore) ? a.bikeScore : 0), 0),
          work: weekActivities.reduce((sum, a) => sum + (Number.isFinite(a.work) ? a.work : (Number.isFinite(a.avgPower) ? (a.avgPower || 0) * (a.duration / 1000) : 0)), 0),
          duration: weekActivities.reduce((sum, a) => sum + (Number.isFinite(a.duration) ? a.duration : 0), 0)
        });
      }
    } else if (trainingLoadRange === 'monthly') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthActivities = history.filter(h => {
          const ad = new Date(h.date);
          return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
        });
        data.push({
          label: format(d, 'MMM'),
          bikeScore: monthActivities.reduce((sum, a) => sum + (Number.isFinite(a.bikeScore) ? a.bikeScore : 0), 0),
          work: monthActivities.reduce((sum, a) => sum + (Number.isFinite(a.work) ? a.work : (Number.isFinite(a.avgPower) ? (a.avgPower || 0) * (a.duration / 1000) : 0)), 0),
          duration: monthActivities.reduce((sum, a) => sum + (Number.isFinite(a.duration) ? a.duration : 0), 0)
        });
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearActivities = history.filter(h => new Date(h.date).getFullYear() === year);
        data.push({
          label: year.toString(),
          bikeScore: yearActivities.reduce((sum, a) => sum + (Number.isFinite(a.bikeScore) ? a.bikeScore : 0), 0),
          work: yearActivities.reduce((sum, a) => sum + (Number.isFinite(a.work) ? a.work : (Number.isFinite(a.avgPower) ? (a.avgPower || 0) * (a.duration / 1000) : 0)), 0),
          duration: yearActivities.reduce((sum, a) => sum + (Number.isFinite(a.duration) ? a.duration : 0), 0)
        });
      }
    }
    return data;
  }, [history, trainingLoadRange]);

  const volumeTrendsData = useMemo(() => {
    if (history.length === 0) return [];
    const now = new Date();
    const data: any[] = [];
    
    if (volumeTrendsRange === 'weekly') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - (i * 7));
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekActivities = history.filter(h => {
          const ad = new Date(h.date);
          return ad >= weekStart && ad <= weekEnd;
        });
        data.push({
          label: `W${format(weekStart, 'w')}`,
          distance: weekActivities.reduce((sum, a) => sum + (a.distance || 0), 0),
          duration: weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0),
          elevation: weekActivities.reduce((sum, a) => sum + (a.totalAscent || 0), 0)
        });
      }
    } else if (volumeTrendsRange === 'monthly') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthActivities = history.filter(h => {
          const ad = new Date(h.date);
          return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
        });
        data.push({
          label: format(d, 'MMM'),
          distance: monthActivities.reduce((sum, a) => sum + (a.distance || 0), 0),
          duration: monthActivities.reduce((sum, a) => sum + (a.duration || 0), 0),
          elevation: monthActivities.reduce((sum, a) => sum + (a.totalAscent || 0), 0)
        });
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearActivities = history.filter(h => new Date(h.date).getFullYear() === year);
        data.push({
          label: year.toString(),
          distance: yearActivities.reduce((sum, a) => sum + (a.distance || 0), 0),
          duration: yearActivities.reduce((sum, a) => sum + (a.duration || 0), 0),
          elevation: yearActivities.reduce((sum, a) => sum + (a.totalAscent || 0), 0)
        });
      }
    }
    return data;
  }, [history, volumeTrendsRange]);

  const bikeScoreSummaryData = useMemo(() => {
    if (history.length === 0) return [];
    const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const summary: Record<string, { date: Date, bikeScore: number, label: string }> = {};

    sortedHistory.forEach(h => {
      const date = new Date(h.date);
      let key = '';
      let label = '';
      let startOfPeriod: Date;

      if (bikeScoreSummaryView === 'weekly') {
        startOfPeriod = startOfWeek(date, { weekStartsOn: 1 });
        key = format(startOfPeriod, 'yyyy-ww');
        label = `Wk ${format(startOfPeriod, 'ww, yyyy')}`;
      } else if (bikeScoreSummaryView === 'monthly') {
        startOfPeriod = startOfMonth(date);
        key = format(startOfPeriod, 'yyyy-MM');
        label = format(startOfPeriod, 'MMM yyyy');
      } else {
        startOfPeriod = startOfYear(date);
        key = format(startOfPeriod, 'yyyy');
        label = format(startOfPeriod, 'yyyy');
      }

      if (!summary[key]) {
        summary[key] = { date: startOfPeriod, bikeScore: 0, label };
      }
      const score = Number.isFinite(h.bikeScore) ? h.bikeScore : 0;
      summary[key].bikeScore += score;
    });
    return Object.values(summary).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [history, bikeScoreSummaryView]);

  // Handlers
  const addToHistory = useCallback(async (activitySummary?: ActivitySummary, activityData?: CyclingDataPoint[], file?: File) => {
    const target = activitySummary || summary;
    const targetData = activityData || data;
    const targetFile = file || originalFile;
    
    if (!target || !target.startTime || isNaN(target.startTime.getTime())) return null;
    const dateStr = target.startTime.toISOString().split('T')[0];
    const id = `${dateStr}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newActivity: HistoricalActivity = {
      id,
      date: dateStr,
      name: target.name,
      bikeScore: target.bikeScore || 0,
      duration: target.duration,
      distance: target.distance,
      avgPower: target.avgPower,
      maxPower: target.maxPower,
      xPower: target.xPower,
      relativeIntensity: target.relativeIntensity,
      avgHeartRate: target.avgHeartRate,
      maxHeartRate: target.maxHeartRate,
      avgCadence: target.avgCadence,
      maxCadence: target.maxCadence,
      avgSpeed: target.avgSpeed,
      totalAscent: target.totalAscent,
      work: target.work,
      aerobicDecoupling: target.aerobicDecoupling,
      cp: settings.cp,
      powerCurve: target.powerCurve,
      fullSummary: target,
      fullData: targetData,
      originalFile: targetFile || undefined,
      originalFileName: targetFile?.name || undefined
    };

    try {
      await saveActivityData(id, { 
        fullSummary: target, 
        fullData: targetData,
        originalFile: targetFile || undefined,
        originalFileName: targetFile?.name || undefined
      });
    } catch (e) {
      console.error('Failed to save activity data to IndexedDB:', e);
    }

    setHistory(prev => [...prev, newActivity]);
    return id;
  }, [summary, data, originalFile, settings.cp]);

  const loadFromHistory = useCallback(async (id: string) => {
    let activity = history.find(h => h.id === id);
    if (!activity) return;

    let fullSummary = activity.fullSummary;
    let fullData = activity.fullData;
    let originalFileBlob = activity.originalFile;
    let originalFileName = activity.originalFileName;

    if (!fullSummary || !fullData || !originalFileBlob) {
      try {
        const stored = await getActivityData(id);
        if (stored) {
          fullSummary = stored.fullSummary;
          fullData = stored.fullData;
          originalFileBlob = stored.originalFile;
          originalFileName = stored.originalFileName;
        }
      } catch (e) {
        console.error('Failed to fetch activity data from IndexedDB:', e);
      }
    }

    if (fullSummary && fullData) {
      const restoredSummary = {
        ...fullSummary,
        startTime: new Date(fullSummary.startTime),
        laps: fullSummary.laps?.map(l => ({ ...l, startTime: new Date(l.startTime) }))
      };
      const restoredData = fullData.map(p => ({ ...p, timestamp: new Date(p.timestamp) }));

      let cpWPrimeResult = null;
      if (restoredData.length > 0) {
        const ctx: ProcessingContext = {
          cp: settings.cp,
          maxHR: settings.maxHR,
          manualCP: settings.manualCP,
          manualWPrime: settings.manualWPrime,
          cpMode: settings.cpMode,
          userWeight: settings.userWeight,
          bikeWeight: settings.bikeWeight,
          enableVirtualPower: settings.enableVirtualPower,
          ridingPosition: settings.ridingPosition,
          surfaceType: settings.surfaceType,
          powerZoneDefinitions: settings.powerZoneDefinitions,
          hrZoneDefinitions: settings.hrZoneDefinitions,
          workerCalculatePowerCurve: workers.calculatePowerCurve,
          workerEstimateCPWPrime: workers.estimateCPWPrime,
          workerCalculateWPrimeBalance: workers.calculateWPrimeBalance
        };
        const processed = await processActivityData(restoredData, restoredSummary.name, ctx, restoredSummary.laps);
        cpWPrimeResult = processed.cpWPrimeResult;
      }

      if (restoredSummary.aerobicDecoupling === undefined) {
        restoredSummary.aerobicDecoupling = calculateAerobicDecoupling(restoredData);
      }

      setCurrentActivityId(id);
      setSummary(restoredSummary);
      setData(restoredData);
      setCpWPrime(cpWPrimeResult);
      setEstimatedCp(cpWPrimeResult?.cp ? Math.round(cpWPrimeResult.cp) : null);
      
      if (originalFileBlob) {
        if (originalFileBlob instanceof Blob && !(originalFileBlob instanceof File)) {
          const fileName = originalFileName || restoredSummary.name || 'activity.fit';
          setOriginalFile(new File([originalFileBlob], fileName, { type: originalFileBlob.type }));
        } else {
          setOriginalFile(originalFileBlob as File);
        }
      } else {
        setOriginalFile(null);
      }
      return true;
    }
    return false;
  }, [history, settings, workers, processActivityData]);

  const removeFromHistory = useCallback(async (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    try {
      await deleteActivityData(id);
    } catch (e) {
      console.error('Failed to delete activity data from IndexedDB:', e);
    }
  }, []);

  const removeMultipleFromHistory = useCallback(async (ids: string[]) => {
    setHistory(prev => prev.filter(h => !ids.includes(h.id)));
    try {
      for (const id of ids) {
        await deleteActivityData(id);
      }
    } catch (e) {
      console.error('Failed to delete multiple activity data from IndexedDB:', e);
    }
  }, []);

  const updateActivityName = useCallback((id: string, newName: string) => {
    setHistory(prev => prev.map(h => {
      if (h.id === id) {
        const updated = { ...h, name: newName };
        if (updated.fullSummary) updated.fullSummary = { ...updated.fullSummary, name: newName };
        return updated;
      }
      return h;
    }));
    if (currentActivityId === id && summary) {
      setSummary(prev => prev ? { ...prev, name: newName } : null);
    }
  }, [currentActivityId, summary]);

  return {
    history, setHistory,
    data, setData,
    summary, setSummary,
    estimatedCp, setEstimatedCp,
    cpWPrime, setCpWPrime,
    originalFile, setOriginalFile,
    currentActivityId, setCurrentActivityId,
    
    pmcData, setPmcData,
    isCalculatingPmc,
    pmcDateRange, setPmcDateRange,
    pmcFocus, setPmcFocus,
    currentPMC,

    trainingLoadRange, setTrainingLoadRange,
    volumeTrendsRange, setVolumeTrendsRange,
    bikeScoreSummaryView, setBikeScoreSummaryView,
    
    trainingLoadData,
    volumeTrendsData,
    bikeScoreSummaryData,
    allTimeBestCurve,
    rolling90DayBestCurve,
    
    addToHistory,
    loadFromHistory,
    removeFromHistory,
    removeMultipleFromHistory,
    updateActivityName
  };
}
