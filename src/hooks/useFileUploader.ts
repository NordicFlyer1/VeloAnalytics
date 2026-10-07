import { useState } from 'react';
import FitParser from 'fit-file-parser';
import { ActivitySummary, CyclingDataPoint, FileStatus } from '../types';
import { processActivityData, ProcessingContext } from '../services/activityProcessor';
import { parseCyclingCsv } from '../lib/csvParser';

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
    
    const validFiles = Array.from(files).filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.fit') || name.endsWith('.csv');
    });
    if (validFiles.length === 0) {
      alert("Only .fit and .csv files are supported.");
      return;
    }

    const newFiles = validFiles.map(f => ({
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
        const isCsv = file.name.toLowerCase().endsWith('.csv');

        const result = await new Promise<{ summary: ActivitySummary | null; points: CyclingDataPoint[] }>((resolve, reject) => {
          const reader = new FileReader();

          if (isCsv) {
            reader.onload = async (e) => {
              try {
                const text = e.target?.result as string;
                const points = parseCyclingCsv(text);
                if (points.length === 0) {
                  reject(new Error("No valid data records found in .csv file."));
                  return;
                }
                setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 60 } : item));
                const summary = await processData(points, file.name);
                resolve({ summary, points });
              } catch (err) {
                reject(err);
              }
            };
            reader.readAsText(file);
          } else {
            reader.onload = (e) => {
              const fitParser = new FitParser({ force: true, speedUnit: 'km/h', lengthUnit: 'm', temperatureUnit: 'celsius' });
              fitParser.parse(e.target?.result as ArrayBuffer, async (error, fitData) => {
                if (error) reject(error);
                else {
                  if (!fitData || !fitData.records || fitData.records.length === 0) {
                    reject(new Error("No valid data records found in .fit file."));
                    return;
                  }

                  const parseTimestamp = (ts: any, fallbackIndex: number) => {
                    if (ts instanceof Date && !isNaN(ts.getTime())) return ts;
                    if (typeof ts === 'number') {
                      // Garmin FIT epoch start is Dec 31, 1989 00:00:00 UTC (631065600 seconds)
                      if (ts < 2000000000) {
                        const d = new Date((ts + 631065600) * 1000);
                        if (!isNaN(d.getTime())) return d;
                      }
                      const d = new Date(ts);
                      if (!isNaN(d.getTime())) return d;
                    }
                    if (typeof ts === 'string') {
                      const d = new Date(ts);
                      if (!isNaN(d.getTime())) return d;
                    }
                    // Fallback synthesis if timestamp is missing from corrupt record
                    return new Date(Date.now() + fallbackIndex * 1000);
                  };

                  const validRecords = fitData.records.filter((r: any) => r && typeof r === 'object');
                  if (validRecords.length === 0) {
                    reject(new Error("No valid records found in .fit file."));
                    return;
                  }

                  const parseDegrees = (val: any): number | undefined => {
                    if (val === null || val === undefined) return undefined;
                    if (typeof val === 'string') {
                      const n = Number(val.trim());
                      if (Number.isFinite(n)) val = n;
                      else return undefined;
                    }
                    if (typeof val === 'number' && Number.isFinite(val)) {
                      let deg = val;
                      if (deg > 360 && deg <= 65535) {
                        deg = (val * 360) / 65536; // Garmin 16-bit uint angle
                      }
                      return Math.round(((deg % 360) + 360) % 360 * 10) / 10;
                    }
                    return undefined;
                  };

                  const extractAnglePair = (raw: any, fallbackEnd?: any): [number | undefined, number | undefined] => {
                    if (!raw && !fallbackEnd) return [undefined, undefined];
                    if (Array.isArray(raw)) {
                      return [parseDegrees(raw[0]), parseDegrees(raw[1] ?? fallbackEnd)];
                    }
                    if (typeof raw === 'string') {
                      const trimmed = raw.trim().replace(/^["']|["']$/g, '');
                      const parts = trimmed.split(',').map(s => s.trim());
                      if (parts.length >= 2) {
                        return [parseDegrees(parts[0]), parseDegrees(parts[1])];
                      }
                      return [parseDegrees(parts[0]), parseDegrees(fallbackEnd)];
                    }
                    return [parseDegrees(raw), parseDegrees(fallbackEnd)];
                  };

                  const parsePco = (val: any): number | undefined => {
                    if (val === null || val === undefined) return undefined;
                    if (typeof val === 'number' && Number.isFinite(val)) return val;
                    if (typeof val === 'string') {
                      const n = Number(val.trim());
                      if (Number.isFinite(n)) return n;
                    }
                    return undefined;
                  };

                  const parseBalance = (val: any): number | undefined => {
                    if (val === null || val === undefined) return undefined;

                    // 0. Garmin SDK string format: "58,right" or "46,left" or plain "52"
                    if (typeof val === 'string') {
                      const trimmed = val.trim().replace(/^["']|["']$/g, '');
                      const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*,\s*(right|left)$/i);
                      if (match) {
                        const num = Number(match[1]);
                        const side = match[2].toLowerCase();
                        if (Number.isFinite(num) && num >= 0 && num <= 100) {
                          return side === 'right' ? Math.round((100 - num) * 10) / 10 : Math.round(num * 10) / 10;
                        }
                      }
                      const plainNum = Number(trimmed);
                      if (Number.isFinite(plainNum) && plainNum >= 0 && plainNum <= 100) {
                        return Math.round(plainNum * 10) / 10;
                      }
                    }

                    // 1. fit-file-parser masked object: { value: 52, right: true } or { value: 5200, right: true }
                    if (typeof val === 'object') {
                      if (typeof val.value === 'number' && Number.isFinite(val.value)) {
                        const num = val.value > 100 ? val.value / 100 : val.value;
                        if (num >= 0 && num <= 100) {
                          // If val.right is true, num represents % Right -> % Left is (100 - num)
                          const isRight = val.right === true;
                          const leftPct = isRight ? (100 - num) : num;
                          return Math.round(leftPct * 10) / 10;
                        }
                      }
                      if (typeof val.left === 'number' && Number.isFinite(val.left)) return Math.round(val.left * 10) / 10;
                      if (typeof val.right === 'number' && Number.isFinite(val.right)) return Math.round((100 - val.right) * 10) / 10;
                    }

                    // 2. Raw unmasked or integer FIT byte/uint16
                    if (typeof val === 'number' && Number.isFinite(val)) {
                      // 16-bit uint left_right_balance_100 (mask 0x8000 for right side, value in lower 14 bits / 100)
                      if ((val & 0x8000) || val > 1000) {
                        const isRight = (val & 0x8000) !== 0;
                        const num = (val & 0x3FFF) / 100;
                        if (num >= 0 && num <= 100) {
                          return Math.round((isRight ? (100 - num) : num) * 10) / 10;
                        }
                      }
                      // 8-bit uint left_right_balance (mask 0x80 for right side, percentage in lower 7 bits)
                      if (val > 100 || (val & 0x80)) {
                        const isRight = (val & 0x80) !== 0;
                        const pct = val & 0x7F;
                        if (pct >= 0 && pct <= 100) {
                          return Math.round((isRight ? (100 - pct) : pct) * 10) / 10;
                        }
                      }
                      if (val >= 0 && val <= 100) return Math.round(val * 10) / 10;
                    }

                    return undefined;
                  };

                  // Check for rider position events if present in fitData.events
                  const positionEvents: { timeMs: number; position: 'seated' | 'standing' }[] = [];
                  if (Array.isArray(fitData.events)) {
                    fitData.events.forEach((ev: any) => {
                      if (ev.event === 'rider_position_change' || ev.event_type === 'rider_position_change' || ev.data === 'rider_position_change') {
                        const time = parseTimestamp(ev.timestamp, 0).getTime();
                        const pos = (ev.data === 1 || ev.position === 1 || ev.data === 'standing') ? 'standing' : 'seated';
                        positionEvents.push({ timeMs: time, position: pos });
                      }
                    });
                    positionEvents.sort((a, b) => a.timeMs - b.timeMs);
                  }

                  // Track state for cadence-gated sample-and-hold during active pedaling
                  let lastActiveBalance: number | undefined = undefined;
                  let lastActiveLeftPco: number | undefined = undefined;
                  let lastActiveRightPco: number | undefined = undefined;
                  let lastActiveLeftPPStart: number | undefined = undefined;
                  let lastActiveLeftPPEnd: number | undefined = undefined;
                  let lastActiveLeftPPPStart: number | undefined = undefined;
                  let lastActiveLeftPPPEnd: number | undefined = undefined;
                  let lastActiveRightPPStart: number | undefined = undefined;
                  let lastActiveRightPPEnd: number | undefined = undefined;
                  let lastActiveRightPPPStart: number | undefined = undefined;
                  let lastActiveRightPPPEnd: number | undefined = undefined;
                  let lastPedalingTimeMs = 0;
                  let currentRiderPosition: 'seated' | 'standing' = 'seated';

                  const points: CyclingDataPoint[] = validRecords.map((r: any, idx: number) => {
                    const recordTime = parseTimestamp(r.timestamp, idx);
                    const recordTimeMs = recordTime.getTime();

                    // Check active pedaling state
                    const isCadencePositive = typeof r.cadence === 'number' && r.cadence > 0;
                    const isPowerPositive = typeof r.power === 'number' && r.power > 0;
                    const isActivelyPedaling = isCadencePositive || isPowerPositive;

                    // Power Phase parsing: handle array [start, end], 4-element array [start, end, peak_start, peak_end], paired strings ("10,204"), or separate fields
                    const rawLeftPP = r.left_power_phase ?? r.leftPowerPhase ?? r.left_power_phase_degrees;
                    const rawLeftPPP = r.left_power_phase_peak ?? r.leftPowerPhasePeak ?? r.left_power_phase_peak_degrees;
                    const leftPPEndFallback = r.left_power_phase_end ?? r.leftPowerPhaseEnd ?? r.left_power_phase_end_degrees;
                    
                    let lpps: number | undefined;
                    let lppe: number | undefined;
                    let lppps: number | undefined;
                    let lpppe: number | undefined;

                    if (Array.isArray(rawLeftPP) && rawLeftPP.length >= 4) {
                      lpps = parseDegrees(rawLeftPP[0]);
                      lppe = parseDegrees(rawLeftPP[1]);
                      lppps = parseDegrees(rawLeftPP[2]);
                      lpppe = parseDegrees(rawLeftPP[3]);
                    } else {
                      [lpps, lppe] = extractAnglePair(rawLeftPP, leftPPEndFallback);
                      [lppps, lpppe] = extractAnglePair(rawLeftPPP, r.left_power_phase_peak_end ?? r.leftPowerPhasePeakEnd);
                    }

                    const rawRightPP = r.right_power_phase ?? r.rightPowerPhase ?? r.right_power_phase_degrees;
                    const rawRightPPP = r.right_power_phase_peak ?? r.rightPowerPhasePeak ?? r.right_power_phase_peak_degrees;
                    const rightPPEndFallback = r.right_power_phase_end ?? r.rightPowerPhaseEnd ?? r.right_power_phase_end_degrees;

                    let rpps: number | undefined;
                    let rppe: number | undefined;
                    let rppps: number | undefined;
                    let rpppe: number | undefined;

                    if (Array.isArray(rawRightPP) && rawRightPP.length >= 4) {
                      rpps = parseDegrees(rawRightPP[0]);
                      rppe = parseDegrees(rawRightPP[1]);
                      rppps = parseDegrees(rawRightPP[2]);
                      rpppe = parseDegrees(rawRightPP[3]);
                    } else {
                      [rpps, rppe] = extractAnglePair(rawRightPP, rightPPEndFallback);
                      [rppps, rpppe] = extractAnglePair(rawRightPPP, r.right_power_phase_peak_end ?? r.rightPowerPhasePeakEnd);
                    }

                    // Rider position: sample-and-hold state machine
                    const rawPos = r.position ?? r.rider_position ?? r.position_at_value;
                    if (rawPos === 'standing' || rawPos === 1 || rawPos === 'stand') {
                      currentRiderPosition = 'standing';
                    } else if (rawPos === 'seated' || rawPos === 0 || rawPos === 'seat') {
                      currentRiderPosition = 'seated';
                    } else if (positionEvents.length > 0) {
                      for (let i = positionEvents.length - 1; i >= 0; i--) {
                        if (positionEvents[i].timeMs <= recordTimeMs) {
                          currentRiderPosition = positionEvents[i].position;
                          break;
                        }
                      }
                    }

                    // Raw stroke dynamic readings
                    let bal = parseBalance(r.left_right_balance ?? r.leftRightBalance ?? r.balance ?? r.left_right_balance_100 ?? r.left_power_percentage ?? r.left_balance);
                    if (bal === undefined && typeof r.right_balance === 'number' && Number.isFinite(r.right_balance)) {
                      bal = Math.round((100 - r.right_balance) * 10) / 10;
                    }
                    let lp = parsePco(r.left_pco ?? r.left_platform_center_offset);
                    let rp = parsePco(r.right_pco ?? r.right_platform_center_offset);

                    // Cadence-gated sample-and-hold:
                    // During active pedaling (cadence > 0), bridge sub-second packet drop gaps (<= 2.5s)
                    // During coasting / stop (cadence == 0), reset hold and output true blank/gap
                    if (isActivelyPedaling) {
                      if (bal !== undefined) {
                        lastActiveBalance = bal;
                        lastPedalingTimeMs = recordTimeMs;
                      } else if (lastActiveBalance !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) {
                        bal = lastActiveBalance;
                      }

                      if (lp !== undefined) {
                        lastActiveLeftPco = lp;
                      } else if (lastActiveLeftPco !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) {
                        lp = lastActiveLeftPco;
                      }

                      if (rp !== undefined) {
                        lastActiveRightPco = rp;
                      } else if (lastActiveRightPco !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) {
                        rp = lastActiveRightPco;
                      }

                      if (lpps !== undefined) lastActiveLeftPPStart = lpps;
                      else if (lastActiveLeftPPStart !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) lpps = lastActiveLeftPPStart;

                      if (lppe !== undefined) lastActiveLeftPPEnd = lppe;
                      else if (lastActiveLeftPPEnd !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) lppe = lastActiveLeftPPEnd;

                      if (lppps !== undefined) lastActiveLeftPPPStart = lppps;
                      else if (lastActiveLeftPPPStart !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) lppps = lastActiveLeftPPPStart;

                      if (lpppe !== undefined) lastActiveLeftPPPEnd = lpppe;
                      else if (lastActiveLeftPPPEnd !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) lpppe = lastActiveLeftPPPEnd;

                      if (rpps !== undefined) lastActiveRightPPStart = rpps;
                      else if (lastActiveRightPPStart !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) rpps = lastActiveRightPPStart;

                      if (rppe !== undefined) lastActiveRightPPEnd = rppe;
                      else if (lastActiveRightPPEnd !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) rppe = lastActiveRightPPEnd;

                      if (rppps !== undefined) lastActiveRightPPPStart = rppps;
                      else if (lastActiveRightPPPStart !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) rppps = lastActiveRightPPPStart;

                      if (rpppe !== undefined) lastActiveRightPPPEnd = rpppe;
                      else if (lastActiveRightPPPEnd !== undefined && (recordTimeMs - lastPedalingTimeMs <= 2500)) rpppe = lastActiveRightPPPEnd;
                    } else {
                      // Coasting / stopped: clear active stroke buffer so coasting segments have no false dots
                      lastActiveBalance = undefined;
                      lastActiveLeftPco = undefined;
                      lastActiveRightPco = undefined;
                      lastActiveLeftPPStart = undefined;
                      lastActiveLeftPPEnd = undefined;
                      lastActiveLeftPPPStart = undefined;
                      lastActiveLeftPPPEnd = undefined;
                      lastActiveRightPPStart = undefined;
                      lastActiveRightPPEnd = undefined;
                      lastActiveRightPPPStart = undefined;
                      lastActiveRightPPPEnd = undefined;
                    }

                    return {
                      timestamp: recordTime,
                      power: typeof r.power === 'number' && Number.isFinite(r.power) ? r.power : undefined,
                      heartRate: typeof r.heart_rate === 'number' && Number.isFinite(r.heart_rate) ? r.heart_rate : undefined,
                      cadence: typeof r.cadence === 'number' && Number.isFinite(r.cadence) ? r.cadence : undefined,
                      speed: typeof r.speed === 'number' && Number.isFinite(r.speed) ? r.speed : undefined,
                      distance: typeof r.distance === 'number' && Number.isFinite(r.distance) ? r.distance : undefined,
                      altitude: typeof r.altitude === 'number' && Number.isFinite(r.altitude) ? r.altitude : undefined,
                      latitude: typeof r.position_lat === 'number' && Number.isFinite(r.position_lat) ? r.position_lat : undefined,
                      longitude: typeof r.position_long === 'number' && Number.isFinite(r.position_long) ? r.position_long : undefined,
                      temperature: typeof r.temperature === 'number' && Number.isFinite(r.temperature) ? r.temperature : undefined,
                      leftRightBalance: bal,
                      // Cycling Dynamics
                      leftPco: lp,
                      rightPco: rp,
                      leftPowerPhaseStart: lpps,
                      leftPowerPhaseEnd: lppe,
                      leftPowerPhasePeakStart: lppps,
                      leftPowerPhasePeakEnd: lpppe,
                      rightPowerPhaseStart: rpps,
                      rightPowerPhaseEnd: rppe,
                      rightPowerPhasePeakStart: rppps,
                      rightPowerPhasePeakEnd: rpppe,
                      leftTorqueEffectiveness: typeof r.left_torque_effectiveness === 'number' && Number.isFinite(r.left_torque_effectiveness) ? r.left_torque_effectiveness : undefined,
                      rightTorqueEffectiveness: typeof r.right_torque_effectiveness === 'number' && Number.isFinite(r.right_torque_effectiveness) ? r.right_torque_effectiveness : undefined,
                      leftPedalSmoothness: typeof r.left_pedal_smoothness === 'number' && Number.isFinite(r.left_pedal_smoothness) ? r.left_pedal_smoothness : undefined,
                      rightPedalSmoothness: typeof r.right_pedal_smoothness === 'number' && Number.isFinite(r.right_pedal_smoothness) ? r.right_pedal_smoothness : undefined,
                      respirationRate: typeof r.enhanced_respiration_rate === 'number' ? r.enhanced_respiration_rate : (typeof r.respiration_rate === 'number' ? r.respiration_rate : undefined),
                      stamina: typeof r.stamina === 'number' ? r.stamina : undefined,
                      riderPosition: (positionEvents.length > 0 || rawPos !== undefined) ? currentRiderPosition : undefined,
                    };
                  });

                  // Ensure records are ordered chronologically
                  points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                  
                  setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 60 } : item));
                  const processedLaps = (fitData.laps || []).map((l: any, lapIdx: number) => ({ ...l, start_time: parseTimestamp(l.start_time, lapIdx) }));
                  const summary = await processData(points, file.name, processedLaps);
                  resolve({ summary, points });
                }
              });
            };
            reader.readAsArrayBuffer(file);
          }
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
