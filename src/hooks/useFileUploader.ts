import { useState } from 'react';
import FitParser from 'fit-file-parser';
import { ActivitySummary, CyclingDataPoint, FileStatus } from '../types';
import { processActivityData, ProcessingContext } from '../services/activityProcessor';

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
  addToHistory: (s: ActivitySummary, p: CyclingDataPoint[], f: File) => Promise<string | null>,
  workerCalculatePowerCurve: any,
  workerEstimateCPWPrime: any,
  workerCalculateWPrimeBalance: any
) => {
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileStatus[]>([]);

  const processData = async (points: CyclingDataPoint[], fileName: string, lapData?: any[]) => {
    if (points.length === 0) return null;

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
      workerCalculatePowerCurve,
      workerEstimateCPWPrime,
      workerCalculateWPrimeBalance
    };

    try {
      const { summary: newSummary, cpWPrimeResult } = await processActivityData(points, fileName, ctx, lapData);
      setSummary(newSummary);
      setData(points);
      setCpWPrime(cpWPrimeResult);
      setEstimatedCp(cpWPrimeResult?.cp ? Math.round(cpWPrimeResult.cp) : null);
      return newSummary;
    } catch (error) {
      console.error('Error processing activity data:', error);
      return null;
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fitFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.fit'));
    if (fitFiles.length === 0) {
      alert("Only .fit files are supported.");
      return;
    }

    const newFiles = fitFiles.map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      name: f.name,
      progress: 0,
      status: 'pending' as const,
      file: f
    }));

    setUploadQueue(prev => [...prev, ...newFiles]);
    setIsProcessingBatch(true);

    for (const fileItem of newFiles) {
      const { file, id } = fileItem;
      setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'processing', progress: 10 } : item));

      try {
        const result = await new Promise<{ summary: ActivitySummary | null; points: CyclingDataPoint[] }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const fitParser = new FitParser({ force: true, speedUnit: 'km/h', lengthUnit: 'm', temperatureUnit: 'celsius' });
            fitParser.parse(e.target?.result as ArrayBuffer, async (error, fitData) => {
              if (error) reject(error);
              else {
                const parseTimestamp = (ts: any) => {
                  if (ts instanceof Date) return ts;
                  if (typeof ts === 'number') {
                    if (ts < 2000000000) return new Date((ts + 631065600) * 1000);
                    return new Date(ts);
                  }
                  return new Date(ts);
                };

                const points: CyclingDataPoint[] = fitData.records.map((r: any) => ({
                  timestamp: parseTimestamp(r.timestamp),
                  power: r.power,
                  heartRate: r.heart_rate,
                  cadence: r.cadence,
                  speed: r.speed,
                  distance: r.distance,
                  altitude: r.altitude,
                  latitude: r.position_lat,
                  longitude: r.position_long,
                  temperature: r.temperature,
                  leftRightBalance: r.left_right_balance,
                }));
                
                setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 60 } : item));
                const processedLaps = (fitData.laps || []).map((l: any) => ({ ...l, start_time: parseTimestamp(l.start_time) }));
                const summary = await processData(points, file.name, processedLaps);
                resolve({ summary, points });
              }
            });
          };
          reader.readAsArrayBuffer(file);
        });

        if (result.summary) {
          const activityId = await addToHistory(result.summary, result.points, file);
          setCurrentActivityId(activityId);
          setSummary(result.summary);
          setData(result.points);
          setIsEditingName(false);
          setEditedName('');
          setOriginalFile(file);
          setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'completed', progress: 100, summary: result.summary!, data: result.points, historyId: activityId || undefined } : item));
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'error', error: (err as Error).message, progress: 100 } : item));
      }
    }
    
    setIsProcessingBatch(false);
    if (newFiles.length > 0) setShowUploadView(false);
  };

  return { handleFileUpload, uploadQueue, setUploadQueue, isProcessingBatch };
};
