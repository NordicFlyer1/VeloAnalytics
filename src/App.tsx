import React, { useState, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Map as MapIcon, 
  BarChart3, 
  Upload, 
  Zap, 
  Clock, 
  Navigation,
  ChevronRight,
  Settings,
  BookOpen,
  Download,
  FileDown,
  History,
  TrendingUp,
  Heart,
  Timer,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
  ArrowLeft,
  Check,
  ArrowUpDown,
  TrafficCone,
  Bike,
  Bus,
  CloudSun,
  Cloud,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  Maximize,
  Expand,
  Table,
  LayoutList,
  Pencil,
  ChevronUp,
  ChevronDown,
  Info,
  Calendar,
  LineChart as LineChartIcon
} from 'lucide-react';
import { 
  LineChart, 
  BarChart,
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  Bar,
  ComposedChart
} from 'recharts';

import { Header } from './components/Header';
import { MetricAnalysis } from './components/MetricAnalysis';
import { ActivityDetails } from './components/ActivityDetails';
import { WPrimeAnalysis } from './components/WPrimeAnalysis';
import { PowerCurveAnalysis } from './components/PowerCurveAnalysis';
import { ZonesAnalysis } from './components/ZonesAnalysis';
import { LapBreakdown } from './components/LapBreakdown';
import { PmcAnalysis } from './components/PmcAnalysis';
import { VolumeTrendsAnalysis } from './components/VolumeTrendsAnalysis';
import { TrainingLoadAnalysis } from './components/TrainingLoadAnalysis';
import { AboutModal } from './components/AboutModal';
import { SettingsModal } from './components/SettingsModal';
import { UploadView } from './components/UploadView';
import { EmptyHistoryView } from './components/EmptyHistoryView';
import { WeatherCard } from './components/WeatherCard';
import { SectionHeader } from './components/SectionHeader';
import { MetricLane } from './components/MetricLane';
import { SummaryCards } from './components/SummaryCards';
import { HistorySidebar } from './components/HistorySidebar';

const ActivityMap = React.lazy(() => import('./components/ActivityMap').then(m => ({ default: m.ActivityMap })));

import { MapContainer, TileLayer, Polyline as LeafletPolyline, useMap as useLeafletMap, CircleMarker } from 'react-leaflet';
import { APIProvider, Map as GoogleMap, useMap as useGoogleMap } from '@vis.gl/react-google-maps';
import FitParser from 'fit-file-parser';
import { format, subDays, startOfDay, endOfDay, isSameDay, startOfWeek, endOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { cn, formatDuration, formatNumericalDuration } from './lib/utils';
import { CyclingDataPoint, ActivitySummary, Lap, ZoneDistribution, ZoneDefinition, PMCDataPoint, HistoricalActivity, FileStatus, WeatherData } from './types';
import { useMetricsWorker } from './hooks/useMetricsWorker';
import { useSharedSettings } from './hooks/useSharedSettings';
import { useActivityHistory } from './hooks/useActivityHistory';

import { 
  calculateXPower, 
  calculateRI, 
  calculateBikeScore, 
  calculateLapSummary, 
  calculateZones, 
  getZonesFromDefinitions, 
  DEFAULT_POWER_ZONES, 
  DEFAULT_HR_ZONES, 
  calculateAerobicDecoupling 
} from './services/metrics';
import { saveActivityData, getActivityData, deleteActivityData } from './services/storage';
import { processActivityData, ProcessingContext } from './services/activityProcessor';

// Fix for Leaflet icons in React
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function App() {
  const workers = useMetricsWorker();
  const { 
    calculatePowerCurve: workerCalculatePowerCurve, 
    estimateCPWPrime: workerEstimateCPWPrime, 
    calculateWPrimeBalance: workerCalculateWPrimeBalance,
    calculatePMC: workerCalculatePMC
  } = workers;
  const settings = useSharedSettings();
  
  const {
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
    removeFromHistory: baseRemoveFromHistory,
    removeMultipleFromHistory: baseRemoveMultipleFromHistory,
    updateActivityName: baseUpdateActivityName
  } = useActivityHistory({ workers, settings });

  const {
    cp, setCP,
    autoUpdateCP, setAutoUpdateCP,
    manualCP, setManualCP,
    manualWPrime, setManualWPrime,
    userWeight, setUserWeight,
    weightUnit, setWeightUnit,
    maxHR, setMaxHR,
    theme, setTheme, toggleTheme,
    smoothingWindow, setSmoothingWindow,
    cpMode, setCpMode,
    powerZoneDefinitions, setPowerZoneDefinitions,
    hrZoneDefinitions, setHrZoneDefinitions
  } = settings;

  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileStatus[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ active: boolean; type: string; progress: number }>({
    active: false,
    type: '',
    progress: 0
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [activeMetrics, setActiveMetrics] = useState<string[]>(['power', 'wPrimeBalance']);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [historySortOrder, setHistorySortOrder] = useState<'newest' | 'oldest'>('newest');
  const mmpCurveRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);

  const handleCompare = () => {
    mmpCurveRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleActivityHistoryClick = () => {
    if (window.innerWidth < 768) {
      setIsHistorySidebarOpen(true);
    } else {
      const element = document.getElementById('history-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  React.useEffect(() => {
    if (autoUpdateCP && estimatedCp && estimatedCp > cp) {
      setCP(estimatedCp);
    }
  }, [autoUpdateCP, estimatedCp, cp]);

  const removeFromHistory = async (id: string) => {
    await baseRemoveFromHistory(id);
    setSelectedHistoryIds(prev => prev.filter(selectedId => selectedId !== id));
  };
  
  const removeMultipleFromHistory = async (ids: string[]) => {
    await baseRemoveMultipleFromHistory(ids);
    setSelectedHistoryIds([]);
  };

  const updateActivityName = (id: string, newName: string) => {
    baseUpdateActivityName(id, newName);
  };

  const smoothedData = React.useMemo(() => {
    if (smoothingWindow <= 1 || data.length === 0) return data;

    const result = new Array(data.length);
    const halfWindow = Math.floor(smoothingWindow / 2);

    // Using a sliding window sum for O(N) performance
    let sumPower = 0;
    let sumSpeed = 0;
    let sumHR = 0;
    let sumCadence = 0;
    let hrCount = 0;
    let cadenceCount = 0;

    // Initial window setup
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

      // Remove point that just left the window
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

      // Add point that just entered the window (if not already added in initial setup)
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
        cadence: cadenceCount > 0 ? sumCadence / cadenceCount : data[i].cadence,
      };
    }
    return result;
  }, [data, smoothingWindow]);

  const getComparisonCurves = React.useCallback(() => {
    return history
      .filter(h => selectedHistoryIds.includes(h.id))
      .map(h => ({
        name: h.name,
        curve: h.powerCurve || h.fullSummary?.powerCurve || []
      }))
      .filter(h => h.curve.length > 0);
  }, [history, selectedHistoryIds]);

  const trainingLoadStats = React.useMemo(() => {
    if (trainingLoadData.length === 0) return { totalBikeScore: 0, avgBikeScore: 0, totalWork: 0, totalDuration: 0 };
    
    const totalBikeScore = trainingLoadData.reduce((sum, d) => sum + d.bikeScore, 0);
    const totalWork = trainingLoadData.reduce((sum, d) => sum + d.work, 0);
    const totalDuration = trainingLoadData.reduce((sum, d) => sum + d.duration, 0);
    
    return {
      totalBikeScore,
      avgBikeScore: totalBikeScore / trainingLoadData.length,
      totalWork,
      totalDuration
    };
  }, [trainingLoadData]);

  const sortedHistory = React.useMemo(() => {
    return [...history].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return historySortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [history, historySortOrder]);

  const [showSettings, setShowSettings] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [mapProvider, setMapProvider] = useState<'osm' | 'google'>('osm');
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const lastActivePointUpdate = React.useRef<number>(0);

  const throttledSetActivePoint = React.useCallback((index: number | null) => {
    const now = Date.now();
    // Throttle to roughly 30fps (32ms) to keep main thread fluid
    if (now - lastActivePointUpdate.current > 32 || index === null) {
      setActivePoint(index);
      lastActivePointUpdate.current = now;
    }
  }, []);
  const [isPointLocked, setIsPointLocked] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [lapMode, setLapMode] = useState<'file' | '1km' | '5km' | '10km' | '1min' | '5min' | '10min'>('file');
  const [isLapsExpanded, setIsLapsExpanded] = useState(true);

  const currentLaps = React.useMemo(() => {
    if (!summary || !data || data.length === 0) return [];
    if (lapMode === 'file') return summary.laps || [];

    const laps: Lap[] = [];
    let currentLapPoints: CyclingDataPoint[] = [];
    let lapId = 1;

    if (lapMode.endsWith('km')) {
      const distanceThreshold = parseInt(lapMode) * 1000;
      let lastDistance = data[0].distance || 0;
      
      data.forEach((p, idx) => {
        currentLapPoints.push(p);
        const currentDistance = p.distance || 0;
        if (currentDistance - lastDistance >= distanceThreshold || idx === data.length - 1) {
          if (currentLapPoints.length > 0) {
            laps.push(calculateLapSummary(currentLapPoints, lapId++));
          }
          currentLapPoints = [];
          lastDistance = currentDistance;
        }
      });
    } else if (lapMode.endsWith('min')) {
      const timeThreshold = parseInt(lapMode) * 60;
      let lapStartTime = data[0].timestamp.getTime();

      data.forEach((p, idx) => {
        currentLapPoints.push(p);
        const currentTime = p.timestamp.getTime();
        if ((currentTime - lapStartTime) / 1000 >= timeThreshold || idx === data.length - 1) {
          if (currentLapPoints.length > 0) {
            laps.push(calculateLapSummary(currentLapPoints, lapId++));
          }
          currentLapPoints = [];
          lapStartTime = currentTime;
        }
      });
    }

    return laps;
  }, [summary, data, lapMode]);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
    if (!apiKey) return;

    setIsWeatherLoading(true);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
      );
      const data = await response.json();
      if (data.main) {
        setWeather({
          temp: data.main.temp,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          windSpeed: data.wind.speed,
          humidity: data.main.humidity,
          locationName: data.name
        });
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setIsWeatherLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (data.length > 0) {
      const point = activePoint !== null ? data[activePoint] : data[0];
      if (point.latitude && point.longitude) {
        const timer = setTimeout(() => {
          fetchWeather(point.latitude!, point.longitude!);
        }, 800); // Debounce to avoid excessive API calls
        return () => clearTimeout(timer);
      }
    }
  }, [activePoint, data, fetchWeather]);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>('roadmap');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showBicycling, setShowBicycling] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [isWPrimeExpanded, setIsWPrimeExpanded] = useState(true);
  const [isPowerCurveExpanded, setIsPowerCurveExpanded] = useState(true);
  const [isZonesExpanded, setIsZonesExpanded] = useState(true);
  const [isPmcExpanded, setIsPmcExpanded] = useState(true);
  const [isTrainingLoadExpanded, setIsTrainingLoadExpanded] = useState(true);
  const [isVolumeTrendsExpanded, setIsVolumeTrendsExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const [showUploadView, setShowUploadView] = useState(false);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (!mapContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      mapContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
  };

  const toggleAllPanels = (expand: boolean) => {
    setIsOverviewExpanded(expand);
    setIsChartExpanded(expand);
    setIsMapExpanded(expand);
    setIsDetailsExpanded(expand);
    setIsLapsExpanded(expand);
    setIsWPrimeExpanded(expand);
    setIsPowerCurveExpanded(expand);
    setIsZonesExpanded(expand);
    setIsPmcExpanded(expand);
    setIsTrainingLoadExpanded(expand);
    setIsVolumeTrendsExpanded(expand);
    setIsHistoryExpanded(expand);
  };

  const areAllPanelsCollapsed = !isOverviewExpanded && !isChartExpanded && !isMapExpanded && !isDetailsExpanded && !isLapsExpanded && !isWPrimeExpanded && !isPowerCurveExpanded && !isZonesExpanded && !isPmcExpanded && !isTrainingLoadExpanded && !isVolumeTrendsExpanded && !isHistoryExpanded;

  // Recalculate summary metrics when settings change
  React.useEffect(() => {
    if (data.length === 0 || !summary) return;

    const powers = data.map(p => p.power || 0);
    const heartRates = data.map(p => p.heartRate || 0).filter(h => h > 0);
    const duration = (data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime()) / 1000;
    
    const xPower = calculateXPower(data);
    const relativeIntensity = xPower ? calculateRI(xPower, cp) : undefined;
    const bikeScore = (xPower && relativeIntensity) ? calculateBikeScore(duration, xPower, relativeIntensity, cp) : undefined;

    const pZones = calculateZones(powers, getZonesFromDefinitions(powerZoneDefinitions, cp));
    const hZones = heartRates.length > 0 ? calculateZones(heartRates, getZonesFromDefinitions(hrZoneDefinitions, maxHR)) : undefined;

    setSummary(prev => prev ? ({
      ...prev,
      xPower,
      relativeIntensity,
      bikeScore,
      powerZones: pZones,
      hrZones: hZones
    }) : null);
  }, [cp, maxHR, powerZoneDefinitions, hrZoneDefinitions]);

  const processData = useCallback(async (points: CyclingDataPoint[], fileName: string, lapData?: any[]) => {
    if (points.length === 0) return null;

    const ctx: ProcessingContext = {
      cp,
      maxHR,
      manualCP,
      manualWPrime,
      powerZoneDefinitions,
      hrZoneDefinitions,
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
  }, [cp, maxHR, manualCP, manualWPrime, powerZoneDefinitions, hrZoneDefinitions, workerCalculatePowerCurve, workerEstimateCPWPrime, workerCalculateWPrimeBalance]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const allFiles = Array.from(files);
    const fitFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.fit'));
    
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
      
      setUploadQueue(prev => prev.map(item => 
        item.id === id ? { ...item, status: 'processing', progress: 10 } : item
      ));

      try {
        const result = await new Promise<{ summary: ActivitySummary | null; points: CyclingDataPoint[] }>((resolve, reject) => {
          const reader = new FileReader();
          
          if (file.name.toLowerCase().endsWith('.fit')) {
            reader.onload = (e) => {
              const fitParser = new FitParser({
                force: true,
                speedUnit: 'km/h',
                lengthUnit: 'm',
                temperatureUnit: 'celsius',
              });
              fitParser.parse(e.target?.result as ArrayBuffer, async (error, fitData) => {
                if (error) reject(error);
                else {
                  const parseTimestamp = (ts: any) => {
                    if (ts instanceof Date) return ts;
                    if (typeof ts === 'number') {
                      // fit-file-parser usually returns timestamps in seconds since Garmin epoch (1989-12-31)
                      // or milliseconds since Unix epoch. 
                      // Garmin epoch offset is 631065600 seconds.
                      if (ts < 2000000000) { 
                        return new Date((ts + 631065600) * 1000);
                      }
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
                  
                  // Ensure lap timestamps are also parsed correctly
                  const processedLaps = (fitData.laps || []).map((l: any) => ({
                    ...l,
                    start_time: parseTimestamp(l.start_time)
                  }));

                  const summary = await processData(points, file.name, processedLaps);
                  resolve({ summary, points });
                }
              });
            };
            reader.readAsArrayBuffer(file);
          } else {
            reject(new Error("Unsupported file format"));
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
          setUploadQueue(prev => prev.map(item => 
            item.id === id ? { ...item, status: 'completed', progress: 100, summary: result.summary!, data: result.points, historyId: activityId || undefined } : item
          ));
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        setUploadQueue(prev => prev.map(item => 
          item.id === id ? { ...item, status: 'error', error: (err as Error).message, progress: 100 } : item
        ));
      }
    }
    
    setIsProcessingBatch(false);
    if (newFiles.length > 0) {
      setShowUploadView(false);
    }
  };

  const exportOriginal = async () => {
    let fileToExport = originalFile;
    
    // If originalFile is missing, try to fetch it from IndexedDB using currentActivityId
    if (!fileToExport && currentActivityId) {
      try {
        const stored = await getActivityData(currentActivityId);
        if (stored && stored.originalFile) {
          const fileName = stored.originalFileName || summary?.name || 'activity.fit';
          // Ensure we have a valid File object for export
          const blob = stored.originalFile instanceof Blob ? stored.originalFile : new Blob([stored.originalFile]);
          fileToExport = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
          setOriginalFile(fileToExport);
        }
      } catch (e) {
        console.error('Failed to fetch original file from IndexedDB for export:', e);
      }
    }

    if (!fileToExport) {
      console.error('No original file available for export');
      return;
    }

    setExportStatus({ active: true, type: 'Original', progress: 0 });
    
    try {
      // Simulate a bit of prep time for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setExportStatus(prev => ({ ...prev, progress: 50 }));
      
      const url = URL.createObjectURL(fileToExport);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileToExport.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportStatus(prev => ({ ...prev, progress: 100 }));
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
    }
  };

  const exportGPX = async () => {
    if (data.length === 0) return;
    setExportStatus({ active: true, type: 'GPX', progress: 0 });
    
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VeloAnalytics Pro" 
  xmlns="http://www.topografix.com/GPX/1/1" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd">
  <metadata>
    <name>${summary?.name || 'Activity'}</name>
    <time>${data[0].timestamp && !isNaN(data[0].timestamp.getTime()) ? data[0].timestamp.toISOString() : new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${summary?.name || 'Activity'}</name>
    <trkseg>`;

    const chunkSize = 500;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      chunk.forEach(p => {
        if (p.latitude && p.longitude && p.timestamp && !isNaN(p.timestamp.getTime())) {
          gpx += `
      <trkpt lat="${p.latitude}" lon="${p.longitude}">
        ${p.altitude !== undefined ? `<ele>${p.altitude}</ele>` : ''}
        <time>${p.timestamp.toISOString()}</time>
        <extensions>
          ${p.power !== undefined ? `<power>${Math.round(p.power)}</power>` : ''}
          <gpxtpx:TrackPointExtension>
            ${p.heartRate !== undefined ? `<gpxtpx:hr>${Math.round(p.heartRate)}</gpxtpx:hr>` : ''}
            ${p.cadence !== undefined ? `<gpxtpx:cad>${Math.round(p.cadence)}</gpxtpx:cad>` : ''}
            ${p.temperature !== undefined ? `<gpxtpx:atemp>${Math.round(p.temperature)}</gpxtpx:atemp>` : ''}
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>`;
        }
      });
      
      setExportStatus(prev => ({ ...prev, progress: Math.round((i / data.length) * 90) }));
      // Yield to UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    gpx += `
    </trkseg>
  </trk>
</gpx>`;

    setExportStatus(prev => ({ ...prev, progress: 95 }));

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary?.name || 'activity'}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setExportStatus(prev => ({ ...prev, progress: 100 }));
    setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
  };

  const gpsPoints = React.useMemo(() => data
    .filter(p => p.latitude && p.longitude)
    .map(p => [p.latitude!, p.longitude!] as [number, number]), [data]);

  const metricsConfig = React.useMemo((): Record<string, { label: string, color: string, unit: string }> => ({
    power: { label: 'POWER', color: '#f97316', unit: 'W' },
    wPrimeBalance: { label: "W' BALANCE", color: '#a855f7', unit: 'J' },
    heartRate: { label: 'HEART RATE', color: '#ef4444', unit: 'BPM' },
    cadence: { label: 'CADENCE', color: '#22c55e', unit: 'RPM' },
    speed: { label: 'SPEED', color: '#06b6d4', unit: 'KM/H' },
    altitude: { label: 'ALTITUDE', color: '#f59e0b', unit: 'M' },
    slope: { label: 'SLOPE', color: '#64748b', unit: '%' },
  }), []);

  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans selection:bg-orange-500/30 transition-colors duration-300">
      {/* Export Progress Indicator */}
      <AnimatePresence>
        {exportStatus.active && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[100] bg-app-card border border-app-border p-4 rounded-2xl shadow-2xl w-72"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-app-muted">
                  Exporting {exportStatus.type}
                </span>
              </div>
              <span className="text-[10px] font-mono text-app-muted">
                {exportStatus.progress}%
              </span>
            </div>
            
            <div className="h-1.5 w-full bg-app-bg rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${exportStatus.progress}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              />
            </div>
            
            <p className="mt-2 text-[10px] text-app-muted italic">
              {exportStatus.progress === 100 ? 'Download complete!' : 'Preparing your file...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <Header 
        estimatedCp={estimatedCp}
        cp={cp}
        setCP={setCP}
        autoUpdateCP={autoUpdateCP}
        showUploadView={showUploadView}
        setShowUploadView={setShowUploadView}
        theme={theme}
        setTheme={setTheme}
        setShowAboutModal={setShowAboutModal}
        areAllPanelsCollapsed={areAllPanelsCollapsed}
        toggleAllPanels={toggleAllPanels}
        setShowSettings={setShowSettings}
        toggleHistorySidebar={() => setIsHistorySidebarOpen(!isHistorySidebarOpen)}
        onActivityHistoryClick={handleActivityHistoryClick}
        isHistorySidebarOpen={isHistorySidebarOpen}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <UploadView 
          showUploadView={showUploadView}
          setShowUploadView={setShowUploadView}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          handleFileUpload={handleFileUpload}
          uploadQueue={uploadQueue}
          setUploadQueue={setUploadQueue}
          setSummary={setSummary}
          setData={setData}
          setIsEditingName={setIsEditingName}
          setEditedName={setEditedName}
          setOriginalFile={setOriginalFile}
          setCurrentActivityId={setCurrentActivityId}
          setCpWPrime={setCpWPrime}
          setEstimatedCp={setEstimatedCp}
          setActivePoint={setActivePoint}
          setIsPointLocked={setIsPointLocked}
          history={history}
          summary={summary}
        />

        {(!showUploadView && (summary || history.length > 0)) && (
          <div className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <EmptyHistoryView 
              summary={summary}
              history={history}
              selectedHistoryIds={selectedHistoryIds}
              loadFromHistory={loadFromHistory}
              onOpenHistory={handleActivityHistoryClick}
            />

            {summary && (
              <>
                {/* Overview Section */}
                <div className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-8">
                  <SectionHeader 
                    icon={LayoutList}
                    title="Activity Overview"
                    description="High-level performance summary and key metrics"
                    isExpanded={isOverviewExpanded}
                    onToggle={() => setIsOverviewExpanded(!isOverviewExpanded)}
                  />
                  
                  <AnimatePresence>
                    {isOverviewExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <SummaryCards 
                          summary={summary}
                          data={data}
                          currentPMC={currentPMC}
                          history={history}
                          userWeight={userWeight}
                          weightUnit={weightUnit}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-4 sm:gap-8">
              {/* Main Analysis Area */}
              <div className="space-y-4 sm:space-y-8">
                <div className="space-y-4 sm:space-y-8">
                  {/* Metrics Section */}
                  <MetricAnalysis 
                    isChartExpanded={isChartExpanded}
                    setIsChartExpanded={setIsChartExpanded}
                    metricsConfig={metricsConfig}
                    activeMetrics={activeMetrics}
                    setActiveMetrics={setActiveMetrics}
                    smoothingWindow={smoothingWindow}
                    setSmoothingWindow={setSmoothingWindow}
                    smoothedData={smoothedData}
                    activePoint={activePoint}
                    setActivePoint={throttledSetActivePoint}
                    isPointLocked={isPointLocked}
                    setIsPointLocked={setIsPointLocked}
                    estimatedCp={estimatedCp}
                    cp={cp}
                    manualCP={manualCP}
                    powerZoneDefinitions={powerZoneDefinitions}
                    hrZoneDefinitions={hrZoneDefinitions}
                    maxHR={maxHR}
                    cpMode={cpMode}
                    setCpMode={setCpMode}
                  />

                <Suspense fallback={
                  <div className="bg-app-card border border-app-border rounded-3xl p-4 sm:p-8 h-[450px] sm:h-[600px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Loading Map Engine...</span>
                    </div>
                  </div>
                }>
                  <ActivityMap 
                    isMapExpanded={isMapExpanded}
                    setIsMapExpanded={setIsMapExpanded}
                    mapContainerRef={mapContainerRef}
                    isMapMaximized={isMapMaximized}
                    setIsMapMaximized={setIsMapMaximized}
                    toggleFullScreen={toggleFullScreen}
                    setActivePoint={throttledSetActivePoint}
                    setIsPointLocked={setIsPointLocked}
                    mapProvider={mapProvider}
                    setMapProvider={setMapProvider}
                    weather={weather}
                    isWeatherLoading={isWeatherLoading}
                    gpsPoints={gpsPoints}
                    activePoint={activePoint}
                    isPointLocked={isPointLocked}
                    mapType={mapType}
                    setMapType={setMapType}
                    theme={theme}
                    data={data}
                    showTraffic={showTraffic}
                    setShowTraffic={setShowTraffic}
                    showBicycling={showBicycling}
                    setShowBicycling={setShowBicycling}
                    showTransit={showTransit}
                    setShowTransit={setShowTransit}
                    googleMapRef={googleMapRef}
                  />
                </Suspense>
                
                {/* Activity Details Section */}
                <ActivityDetails 
                  isDetailsExpanded={isDetailsExpanded}
                  setIsDetailsExpanded={setIsDetailsExpanded}
                  summary={summary}
                  isEditingName={isEditingName}
                  setIsEditingName={setIsEditingName}
                  editedName={editedName}
                  setEditedName={setEditedName}
                  updateActivityName={updateActivityName}
                  currentActivityId={currentActivityId}
                  estimatedCp={estimatedCp}
                  userWeight={userWeight}
                  weightUnit={weightUnit}
                  exportOriginal={exportOriginal}
                  exportGPX={exportGPX}
                />

                <WPrimeAnalysis 
                  isWPrimeExpanded={isWPrimeExpanded}
                  setIsWPrimeExpanded={setIsWPrimeExpanded}
                  cpWPrime={cpWPrime}
                  manualCP={manualCP}
                  manualWPrime={manualWPrime}
                  smoothedData={smoothedData}
                  activePoint={activePoint}
                  setActivePoint={throttledSetActivePoint}
                  isPointLocked={isPointLocked}
                  setIsPointLocked={setIsPointLocked}
                  cp={cp}
                  cpMode={cpMode}
                  setCpMode={setCpMode}
                />

                <PowerCurveAnalysis 
                  isPowerCurveExpanded={isPowerCurveExpanded}
                  setIsPowerCurveExpanded={setIsPowerCurveExpanded}
                  selectedHistoryIds={selectedHistoryIds}
                  setSelectedHistoryIds={setSelectedHistoryIds}
                  summary={summary}
                  allTimeBestCurve={allTimeBestCurve}
                  rolling90DayBestCurve={rolling90DayBestCurve}
                  getComparisonCurves={getComparisonCurves}
                  mmpCurveRef={mmpCurveRef}
                  theme={theme}
                />

                <ZonesAnalysis 
                  isZonesExpanded={isZonesExpanded}
                  setIsZonesExpanded={setIsZonesExpanded}
                  summary={summary}
                />

                <LapBreakdown 
                  isLapsExpanded={isLapsExpanded}
                  setIsLapsExpanded={setIsLapsExpanded}
                  currentLaps={currentLaps}
                  lapMode={lapMode}
                  setLapMode={setLapMode}
                />

                <PmcAnalysis 
                  isPmcExpanded={isPmcExpanded}
                  setIsPmcExpanded={setIsPmcExpanded}
                  currentPMC={currentPMC}
                  pmcData={pmcData}
                  pmcFocus={pmcFocus}
                  setPmcFocus={setPmcFocus}
                  pmcDateRange={pmcDateRange}
                  setPmcDateRange={setPmcDateRange}
                />

                <TrainingLoadAnalysis 
                  isTrainingLoadExpanded={isTrainingLoadExpanded}
                  setIsTrainingLoadExpanded={setIsTrainingLoadExpanded}
                  trainingLoadRange={trainingLoadRange}
                  setTrainingLoadRange={setTrainingLoadRange}
                  trainingLoadData={trainingLoadData}
                  trainingLoadStats={trainingLoadStats}
                />

                <VolumeTrendsAnalysis 
                  isExpanded={isVolumeTrendsExpanded}
                  setIsExpanded={setIsVolumeTrendsExpanded}
                  range={volumeTrendsRange}
                  setRange={setVolumeTrendsRange}
                  data={volumeTrendsData}
                />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Activity History Section */}
        <HistorySidebar 
          isHistoryExpanded={isHistoryExpanded}
          setIsHistoryExpanded={setIsHistoryExpanded}
          selectedHistoryIds={selectedHistoryIds}
          setSelectedHistoryIds={setSelectedHistoryIds}
          history={history}
          sortedHistory={sortedHistory}
          summary={summary}
          historySortOrder={historySortOrder}
          setHistorySortOrder={setHistorySortOrder}
          handleCompare={handleCompare}
          loadFromHistory={(id) => {
            loadFromHistory(id);
            setIsHistorySidebarOpen(false);
          }}
          removeFromHistory={removeFromHistory}
          removeMultipleFromHistory={removeMultipleFromHistory}
          isOpen={isHistorySidebarOpen}
          onClose={() => setIsHistorySidebarOpen(false)}
        />
                </div>
              )}
            </main>

      {/* About Modal */}
      <AboutModal showAboutModal={showAboutModal} setShowAboutModal={setShowAboutModal} />

        <SettingsModal 
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          cp={cp}
          setCP={setCP}
          autoUpdateCP={autoUpdateCP}
          setAutoUpdateCP={setAutoUpdateCP}
          maxHR={maxHR}
          setMaxHR={setMaxHR}
          manualCP={manualCP}
          setManualCP={setManualCP}
          manualWPrime={manualWPrime}
          setManualWPrime={setManualWPrime}
          userWeight={userWeight}
          setUserWeight={setUserWeight}
          weightUnit={weightUnit}
          setWeightUnit={setWeightUnit}
          cpWPrime={cpWPrime}
          powerZoneDefinitions={powerZoneDefinitions}
          setPowerZoneDefinitions={setPowerZoneDefinitions}
          hrZoneDefinitions={hrZoneDefinitions}
          setHrZoneDefinitions={setHrZoneDefinitions}
        />
    </div>
  );
}

