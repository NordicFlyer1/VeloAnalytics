import React, { useState, useCallback, useRef } from 'react';
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
  Pencil
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
  ReferenceArea,
  ReferenceLine,
  Legend,
  Bar,
  ComposedChart
} from 'recharts';

const ReferenceAreaAny = ReferenceArea as any;
const ReferenceLineAny = ReferenceLine as any;

import { MapContainer, TileLayer, Polyline as LeafletPolyline, useMap as useLeafletMap, CircleMarker } from 'react-leaflet';
import { APIProvider, Map as GoogleMap, useMap as useGoogleMap } from '@vis.gl/react-google-maps';
import FitParser from 'fit-file-parser';
import { format, subDays, startOfDay, endOfDay, isSameDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { cn } from './lib/utils';
import { CyclingDataPoint, ActivitySummary, Lap, ZoneDistribution, ZoneDefinition, PMCDataPoint, HistoricalActivity, FileStatus } from './types';
import { calculateXPower, calculateRI, calculateBikeScore, estimateCPWPrime, calculateSlope, estimateCP, calculateLapSummary, calculateZones, getZonesFromDefinitions, DEFAULT_POWER_ZONES, DEFAULT_HR_ZONES, calculatePowerCurve, calculateWPrimeBalance, calculateAerobicDecoupling } from './services/metrics';
import { saveActivityData, getActivityData, deleteActivityData } from './services/storage';

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

function MapBounds({ points, data, activePoint, isMapExpanded }: { points: [number, number][], data: CyclingDataPoint[], activePoint: number | null, isMapExpanded: boolean }) {
  const map = useLeafletMap();
  
  React.useEffect(() => {
    if (points.length > 0 && activePoint === null) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [100, 100] });
    }
  }, [points, map, activePoint]);

  React.useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      if (points.length > 0 && activePoint === null) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [100, 100] });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map, points, activePoint]);

  React.useEffect(() => {
    if (activePoint !== null && data[activePoint]?.latitude && data[activePoint]?.longitude) {
      map.setView([data[activePoint].latitude!, data[activePoint].longitude!], map.getZoom());
    }
  }, [activePoint, data, map]);

  return null;
}

function GoogleMapPolyline({ points, data, setActivePoint, setIsPointLocked, isMapExpanded }: { points: { lat: number; lng: number }[], data: CyclingDataPoint[], setActivePoint: (index: number | null) => void, setIsPointLocked: (locked: boolean) => void, isMapExpanded: boolean }) {
  const map = useGoogleMap();
  React.useEffect(() => {
    if (!map || points.length === 0) return;

    const polyline = new google.maps.Polyline({
      path: points,
      geodesic: true,
      strokeColor: "#f97316",
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });

    polyline.setMap(map);

    const findClosestPointIndex = (lat: number, lng: number) => {
      let minDistance = Infinity;
      let closestIndex = -1;
      
      data.forEach((p, index) => {
        if (p.latitude !== undefined && p.longitude !== undefined) {
          const d = Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lng, 2);
          if (d < minDistance) {
            minDistance = d;
            closestIndex = index;
          }
        }
      });
      
      return closestIndex;
    };

    const mouseMoveListener = polyline.addListener('mousemove', (e: google.maps.PolyMouseEvent) => {
      if (e.latLng) {
        const index = findClosestPointIndex(e.latLng.lat(), e.latLng.lng());
        if (index !== -1) setActivePoint(index);
      }
    });

    const mouseOutListener = polyline.addListener('mouseout', () => {
      setActivePoint(null);
    });

    const clickListener = polyline.addListener('click', (e: google.maps.PolyMouseEvent) => {
      if (e.latLng) {
        const index = findClosestPointIndex(e.latLng.lat(), e.latLng.lng());
        if (index !== -1) {
          setActivePoint(index);
          setIsPointLocked(true);
        }
      }
    });

    const bounds = new google.maps.LatLngBounds();
    points.forEach(p => bounds.extend(p));
    map.fitBounds(bounds, 100);

    const observer = new ResizeObserver(() => {
      google.maps.event.trigger(map, 'resize');
      map.fitBounds(bounds, 100);
    });
    const container = map.getDiv();
    observer.observe(container);

    return () => {
      polyline.setMap(null);
      google.maps.event.removeListener(mouseMoveListener);
      google.maps.event.removeListener(mouseOutListener);
      google.maps.event.removeListener(clickListener);
      observer.disconnect();
    };
  }, [map, points, data, setActivePoint, setIsPointLocked, isMapExpanded]);

  return null;
}

function GoogleMapTrafficLayer({ enabled }: { enabled: boolean }) {
  const map = useGoogleMap();
  React.useEffect(() => {
    if (!map) return;
    const layer = new google.maps.TrafficLayer();
    if (enabled) layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, enabled]);
  return null;
}

function GoogleMapBicyclingLayer({ enabled }: { enabled: boolean }) {
  const map = useGoogleMap();
  React.useEffect(() => {
    if (!map) return;
    const layer = new google.maps.BicyclingLayer();
    if (enabled) layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, enabled]);
  return null;
}

function GoogleMapTransitLayer({ enabled }: { enabled: boolean }) {
  const map = useGoogleMap();
  React.useEffect(() => {
    if (!map) return;
    const layer = new google.maps.TransitLayer();
    if (enabled) layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, enabled]);
  return null;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  windSpeed: number;
  humidity: number;
  locationName: string;
}

const WeatherCard = ({ weather, isLoading }: { weather: WeatherData | null, isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="bg-app-bg/80 backdrop-blur-md p-3 rounded-2xl border border-app-border flex items-center gap-3 animate-pulse">
        <div className="w-8 h-8 bg-app-card rounded-full" />
        <div className="space-y-2">
          <div className="w-16 h-2 bg-app-card rounded" />
          <div className="w-12 h-2 bg-app-card rounded" />
        </div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-app-bg/80 backdrop-blur-md p-3 rounded-2xl border border-app-border flex items-center gap-4 shadow-xl"
    >
      <div className="flex flex-col items-center">
        <img 
          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} 
          alt={weather.description}
          className="w-10 h-10 -my-2"
          referrerPolicy="no-referrer"
        />
        <span className="text-[8px] font-bold uppercase tracking-tighter text-app-muted">{weather.description}</span>
      </div>
      
      <div className="h-8 w-px bg-app-border" />
      
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <Thermometer className="w-3 h-3 text-orange-500" />
          <span className="text-sm font-bold tracking-tight">{Math.round(weather.temp)}°C</span>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-widest text-app-muted truncate max-w-[80px]">
          {weather.locationName}
        </span>
      </div>

      <div className="h-8 w-px bg-app-border" />

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Wind className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-medium">{Math.round(weather.windSpeed * 3.6)} km/h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-medium">{weather.humidity}%</span>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [data, setData] = useState<CyclingDataPoint[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [cp, setCP] = useState(() => {
    const saved = localStorage.getItem('veloanalytics_cp');
    const parsed = saved ? parseInt(saved) : 250;
    return isNaN(parsed) ? 250 : parsed;
  });
  const [autoUpdateCP, setAutoUpdateCP] = useState(() => {
    const saved = localStorage.getItem('veloanalytics_autoupdate_cp');
    return saved ? saved === 'true' : true;
  });
  const [estimatedCp, setEstimatedCp] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileStatus[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ active: boolean; type: string; progress: number }>({
    active: false,
    type: '',
    progress: 0
  });
  const [cpWPrime, setCpWPrime] = useState<{ cp: number; wPrime: number } | null>(null);
  const [manualCP, setManualCP] = useState<number | null>(() => {
    const saved = localStorage.getItem('veloanalytics_manual_cp');
    return saved ? parseInt(saved) : null;
  });
  const [manualWPrime, setManualWPrime] = useState<number | null>(() => {
    const saved = localStorage.getItem('veloanalytics_manual_wprime');
    return saved ? parseInt(saved) : null;
  });
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [activeMetrics, setActiveMetrics] = useState<string[]>(['power']);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [historySortOrder, setHistorySortOrder] = useState<'newest' | 'oldest'>('newest');
  const mmpCurveRef = useRef<HTMLDivElement>(null);

  const handleCompare = () => {
    mmpCurveRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const [history, setHistory] = useState<HistoricalActivity[]>(() => {
    const saved = localStorage.getItem('veloanalytics_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [trainingLoadRange, setTrainingLoadRange] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('veloanalytics_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  React.useEffect(() => {
    try {
      // Strip out large data before saving to localStorage
      // We keep powerCurve as it's small and useful for aggregate analysis
      const strippedHistory = history.map(({ fullSummary, fullData, originalFile, ...rest }) => rest);
      localStorage.setItem('veloanalytics_history', JSON.stringify(strippedHistory));
    } catch (e) {
      console.error('Failed to save history to localStorage:', e);
    }
  }, [history]);

  React.useEffect(() => {
    localStorage.setItem('veloanalytics_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  React.useEffect(() => {
    localStorage.setItem('veloanalytics_cp', cp.toString());
  }, [cp]);

  React.useEffect(() => {
    localStorage.setItem('veloanalytics_autoupdate_cp', autoUpdateCP.toString());
  }, [autoUpdateCP]);

  React.useEffect(() => {
    if (manualCP !== null) localStorage.setItem('veloanalytics_manual_cp', manualCP.toString());
    else localStorage.removeItem('veloanalytics_manual_cp');
  }, [manualCP]);

  React.useEffect(() => {
    if (manualWPrime !== null) localStorage.setItem('veloanalytics_manual_wprime', manualWPrime.toString());
    else localStorage.removeItem('veloanalytics_manual_wprime');
  }, [manualWPrime]);

  React.useEffect(() => {
    if (autoUpdateCP && estimatedCp && estimatedCp > cp) {
      setCP(estimatedCp);
    }
  }, [autoUpdateCP, estimatedCp, cp]);

  const getComparisonCurves = () => {
    return history
      .filter(h => selectedHistoryIds.includes(h.id))
      .map(h => ({
        name: h.name,
        curve: h.powerCurve || h.fullSummary?.powerCurve || []
      }))
      .filter(h => h.curve.length > 0);
  };

  const trainingLoadData = React.useMemo(() => {
    if (history.length === 0) return [];
    
    const now = new Date();
    const data: any[] = [];
    
    if (trainingLoadRange === 'weekly') {
      // Last 12 weeks
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
          bikeScore: weekActivities.reduce((sum, a) => sum + (a.bikeScore || 0), 0),
          work: weekActivities.reduce((sum, a) => sum + (a.work || (a.avgPower || 0) * (a.duration / 1000)), 0),
          duration: weekActivities.reduce((sum, a) => sum + a.duration, 0)
        });
      }
    } else if (trainingLoadRange === 'monthly') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthActivities = history.filter(h => {
          const ad = new Date(h.date);
          return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
        });
        
        data.push({
          label: format(d, 'MMM'),
          bikeScore: monthActivities.reduce((sum, a) => sum + (a.bikeScore || 0), 0),
          work: monthActivities.reduce((sum, a) => sum + (a.work || (a.avgPower || 0) * (a.duration / 1000)), 0),
          duration: monthActivities.reduce((sum, a) => sum + a.duration, 0)
        });
      }
    } else {
      // Last 5 years
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearActivities = history.filter(h => new Date(h.date).getFullYear() === year);
        
        data.push({
          label: year.toString(),
          bikeScore: yearActivities.reduce((sum, a) => sum + (a.bikeScore || 0), 0),
          work: yearActivities.reduce((sum, a) => sum + (a.work || (a.avgPower || 0) * (a.duration / 1000)), 0),
          duration: yearActivities.reduce((sum, a) => sum + a.duration, 0)
        });
      }
    }
    
    return data;
  }, [history, trainingLoadRange]);

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

  const allTimeBestCurve = React.useMemo(() => {
    if (history.length === 0) return [];
    const durations = [1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600];
    return durations.map(d => {
      let maxPower = 0;
      history.forEach(h => {
        const curve = h.powerCurve || h.fullSummary?.powerCurve;
        const point = curve?.find(p => p.duration === d);
        if (point && point.power > maxPower) maxPower = point.power;
      });
      return { duration: d, power: maxPower };
    }).filter(p => p.power > 0);
  }, [history]);

  const rolling90DayBestCurve = React.useMemo(() => {
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
      return { duration: d, power: maxPower };
    }).filter(p => p.power > 0);
  }, [history]);

  const addToHistory = async (activity?: ActivitySummary | React.MouseEvent, activityData?: CyclingDataPoint[], file?: File) => {
    // If called from onClick, activity will be the event object.
    // We only want to use it if it's a real ActivitySummary.
    const target = (activity && 'startTime' in activity) ? activity : summary;
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
      avgSpeed: target.avgSpeed,
      totalAscent: target.totalAscent,
      work: target.work,
      aerobicDecoupling: target.aerobicDecoupling,
      cp: cp,
      powerCurve: target.powerCurve,
      fullSummary: target,
      fullData: targetData,
      originalFile: targetFile || undefined,
      originalFileName: targetFile?.name || undefined
    };

    // Save large data to IndexedDB
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
  };

  const loadFromHistory = async (id: string) => {
    let activity = history.find(h => h.id === id);
    if (!activity) return;

    let fullSummary = activity.fullSummary;
    let fullData = activity.fullData;
    let originalFileBlob = activity.originalFile;
    let originalFileName = activity.originalFileName;

    // If data is missing (not in localStorage), fetch from IndexedDB
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
      // Ensure dates are correctly parsed as Date objects
      const restoredSummary = {
        ...fullSummary,
        startTime: new Date(fullSummary.startTime),
        laps: fullSummary.laps?.map(l => ({
          ...l,
          startTime: new Date(l.startTime)
        }))
      };
      
      const restoredData = fullData.map(p => ({
        ...p,
        timestamp: new Date(p.timestamp)
      }));

      // Recalculate W' Balance if missing or if manual values are set
      let cpWPrimeResult = null;
      if (restoredData.length > 0) {
        cpWPrimeResult = estimateCPWPrime(restoredData);
        const effectiveCP = manualCP ?? cpWPrimeResult?.cp ?? 0;
        const effectiveWPrime = manualWPrime ?? cpWPrimeResult?.wPrime ?? 0;
        
        if (effectiveCP > 0 && effectiveWPrime > 0) {
          const wBal = calculateWPrimeBalance(restoredData, effectiveCP, effectiveWPrime);
          restoredData.forEach((p, i) => {
            p.wPrimeBalance = wBal[i];
          });
        }
      }

      // Recalculate Aerobic Decoupling if missing
      if (restoredSummary.aerobicDecoupling === undefined) {
        restoredSummary.aerobicDecoupling = calculateAerobicDecoupling(restoredData);
      }

      setCurrentActivityId(id);
      setSummary(restoredSummary);
      setData(restoredData);
      setIsEditingName(false);
      setEditedName('');
      
      // Restore original file if available
      if (originalFileBlob) {
        // If it's a Blob but not a File, convert it back to a File if we have the name
        if (originalFileBlob instanceof Blob && !(originalFileBlob instanceof File)) {
          const fileName = originalFileName || restoredSummary.name || 'activity.fit';
          const restoredFile = new File([originalFileBlob], fileName, { type: originalFileBlob.type });
          setOriginalFile(restoredFile);
        } else {
          setOriginalFile(originalFileBlob as File);
        }
      } else {
        setOriginalFile(null);
      }

      setCpWPrime(cpWPrimeResult);
      setEstimatedCp(cpWPrimeResult?.cp ? Math.round(cpWPrimeResult.cp) : null);
      setActivePoint(null);
      setIsPointLocked(false);
      setShowUploadView(false);
      
      // Scroll to top when loading an activity
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const removeFromHistory = async (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    setSelectedHistoryIds(prev => prev.filter(selectedId => selectedId !== id));
    try {
      await deleteActivityData(id);
    } catch (e) {
      console.error('Failed to delete activity data from IndexedDB:', e);
    }
  };

  const updateActivityName = (id: string, newName: string) => {
    setHistory(prev => prev.map(h => {
      if (h.id === id) {
        const updated = { ...h, name: newName };
        if (updated.fullSummary) {
          updated.fullSummary = { ...updated.fullSummary, name: newName };
        }
        return updated;
      }
      return h;
    }));
    if (currentActivityId === id && summary) {
      setSummary(prev => prev ? { ...prev, name: newName } : null);
    }
  };

  const removeMultipleFromHistory = async (ids: string[]) => {
    setHistory(prev => prev.filter(h => !ids.includes(h.id)));
    setSelectedHistoryIds([]);
    try {
      for (const id of ids) {
        await deleteActivityData(id);
      }
    } catch (e) {
      console.error('Failed to delete multiple activity data from IndexedDB:', e);
    }
  };

  const [pmcFocus, setPmcFocus] = useState<string | null>(null);
  const [pmcDateRange, setPmcDateRange] = useState<'all' | '1year' | '6months' | '3months' | '6weeks'>('all');
  const [bikeScoreSummaryView, setBikeScoreSummaryView] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  const bikeScoreSummaryData = React.useMemo(() => {
    if (history.length === 0) return [];

    const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const summary: Record<string, { date: Date, bikeScore: number, label: string }> = {};

    sortedHistory.forEach(h => {
      const date = new Date(h.date);
      let key = '';
      let label = '';
      let startOfPeriod: Date;

      if (bikeScoreSummaryView === 'weekly') {
        startOfPeriod = startOfWeek(date, { weekStartsOn: 1 }); // Monday
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
      summary[key].bikeScore += (h.bikeScore || 0);
    });

    return Object.values(summary).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [history, bikeScoreSummaryView]);

  const pmcData = React.useMemo(() => {
    if (history.length === 0) return [];
    
    const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const historyByDate = sortedHistory.reduce((acc, h) => {
      acc[h.date] = (acc[h.date] || 0) + (h.bikeScore || 0);
      return acc;
    }, {} as Record<string, number>);

    const startDate = subDays(new Date(sortedHistory[0].date), 42); // Start 42 days before first activity
    const endDate = new Date();
    
    const allData: PMCDataPoint[] = [];
    let currentLTS = 0;
    let currentSTS = 0;
    
    const curr = new Date(startDate);
    while (curr <= endDate) {
      if (isNaN(curr.getTime())) {
        curr.setDate(curr.getDate() + 1);
        continue;
      }
      const dateStr = curr.toISOString().split('T')[0];
      const dayBikeScore = historyByDate[dateStr] || 0;
      
      currentLTS = currentLTS + (dayBikeScore - currentLTS) / 42;
      currentSTS = currentSTS + (dayBikeScore - currentSTS) / 7;
      
      allData.push({
        date: dateStr,
        bikeScore: dayBikeScore,
        lts: currentLTS,
        sts: currentSTS,
        sb: currentLTS - currentSTS
      });
      
      curr.setDate(curr.getDate() + 1);
    }

    // Filter based on pmcDateRange
    if (pmcDateRange === 'all') return allData;

    const now = new Date();
    let filterDate: Date | null = null;

    if (pmcDateRange === '6weeks') filterDate = subDays(now, 42);
    else if (pmcDateRange === '3months') filterDate = subDays(now, 90);
    else if (pmcDateRange === '6months') filterDate = subDays(now, 180);
    else if (pmcDateRange === '1year') filterDate = subDays(now, 365);

    if (filterDate) {
      const filterStr = filterDate.toISOString().split('T')[0];
      return allData.filter(d => d.date >= filterStr);
    }
    
    return allData;
  }, [history, pmcDateRange]);

  const currentPMC = React.useMemo(() => {
    if (pmcData.length === 0) return null;
    return pmcData[pmcData.length - 1];
  }, [pmcData]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };
  const [maxHR, setMaxHR] = useState(() => {
    const saved = localStorage.getItem('veloanalytics_maxhr');
    const parsed = saved ? parseInt(saved) : 190;
    return isNaN(parsed) ? 190 : parsed;
  });

  React.useEffect(() => {
    localStorage.setItem('veloanalytics_maxhr', maxHR.toString());
  }, [maxHR]);
  const [powerZoneDefinitions, setPowerZoneDefinitions] = useState<ZoneDefinition[]>(DEFAULT_POWER_ZONES);
  const [hrZoneDefinitions, setHrZoneDefinitions] = useState<ZoneDefinition[]>(DEFAULT_HR_ZONES);
  const [showSettings, setShowSettings] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [mapProvider, setMapProvider] = useState<'osm' | 'google'>('osm');
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [isPointLocked, setIsPointLocked] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

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
  const [isMapExpanded, setIsMapExpanded] = useState(false);
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

  const processData = useCallback((points: CyclingDataPoint[], fileName: string, lapData?: any[]) => {
    if (points.length === 0) return null;

    // Calculate slope for each point
    for (let i = 1; i < points.length; i++) {
      points[i].slope = calculateSlope(points[i - 1], points[i]);
    }

    const powers = points.map(p => p.power || 0);
    const cadences = points.map(p => p.cadence || 0).filter(c => c > 0);
    const speeds = points.map(p => p.speed || 0);
    const heartRates = points.map(p => p.heartRate || 0).filter(h => h > 0);
    const temperatures = points.map(p => p.temperature || 0).filter(t => t !== 0);
    
    const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
    const maxPower = Math.max(...powers);
    const xPower = calculateXPower(points);
    const duration = (points[points.length - 1].timestamp.getTime() - points[0].timestamp.getTime()) / 1000;
    const distance = points[points.length - 1].distance || 0;
    
    const relativeIntensity = xPower ? calculateRI(xPower, cp) : undefined;
    const bikeScore = (xPower && relativeIntensity) ? calculateBikeScore(duration, xPower, relativeIntensity, cp) : undefined;
    const work = (avgPower * duration) / 1000;

    // Total ascent calculation
    let totalAscent = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].altitude !== undefined && points[i - 1].altitude !== undefined) {
        const diff = points[i].altitude! - points[i - 1].altitude!;
        if (diff > 0) totalAscent += diff;
      }
    }

    // Process Laps
    let laps: Lap[] = [];
    if (lapData && lapData.length > 0) {
      laps = lapData.map((l, idx) => {
        const lapStartTime = l.start_time instanceof Date ? l.start_time : new Date(l.start_time);
        const lapEndTime = new Date(lapStartTime.getTime() + (l.total_elapsed_time || 0) * 1000);
        
        const lapPoints = points.filter(p => 
          p.timestamp >= lapStartTime && 
          p.timestamp <= lapEndTime
        );
        if (lapPoints.length > 0) {
          return calculateLapSummary(lapPoints, idx + 1);
        }
        return {
          id: idx + 1,
          startTime: new Date(l.start_time),
          duration: l.total_elapsed_time,
          distance: l.total_distance,
          avgPower: l.avg_power,
          maxPower: l.max_power,
          avgHeartRate: l.avg_heart_rate,
          avgCadence: l.avg_cadence,
          avgSpeed: l.avg_speed,
          totalAscent: l.total_ascent
        };
      });
    } else {
      // Default single lap if no lap data provided
      laps = [calculateLapSummary(points, 1)];
    }

    // Zone Calculations
    const pZones = calculateZones(powers, getZonesFromDefinitions(powerZoneDefinitions, cp));
    const hZones = heartRates.length > 0 ? calculateZones(heartRates, getZonesFromDefinitions(hrZoneDefinitions, maxHR)) : undefined;
    const powerCurve = calculatePowerCurve(points);

    // Calculate W' Balance
    const cpWPrimeResult = estimateCPWPrime(points);
    const effectiveCP = manualCP ?? cpWPrimeResult?.cp ?? 0;
    const effectiveWPrime = manualWPrime ?? cpWPrimeResult?.wPrime ?? 0;
    
    if (effectiveCP > 0 && effectiveWPrime > 0) {
      const wBal = calculateWPrimeBalance(points, effectiveCP, effectiveWPrime);
      points.forEach((p, i) => {
        p.wPrimeBalance = wBal[i];
      });
    }

    const newSummary: ActivitySummary = {
      name: fileName.replace(/\.[^/.]+$/, ""),
      startTime: points[0].timestamp,
      duration,
      distance,
      avgPower,
      maxPower,
      xPower,
      relativeIntensity,
      bikeScore,
      avgHeartRate: heartRates.length > 0 ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : undefined,
      maxHeartRate: heartRates.length > 0 ? Math.max(...heartRates) : undefined,
      avgCadence: cadences.length > 0 ? cadences.reduce((a, b) => a + b, 0) / cadences.length : undefined,
      maxCadence: cadences.length > 0 ? Math.max(...cadences) : undefined,
      avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : undefined,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : undefined,
      totalAscent,
      avgTemperature: temperatures.length > 0 ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length : undefined,
      work,
      laps,
      powerZones: pZones,
      hrZones: hZones,
      powerCurve,
      aerobicDecoupling: calculateAerobicDecoupling(points),
    };

    setSummary(newSummary);
    setData(points);
    setCpWPrime(cpWPrimeResult);
    setEstimatedCp(cpWPrimeResult?.cp ? Math.round(cpWPrimeResult.cp) : null);

    return newSummary;
  }, [cp, maxHR, powerZoneDefinitions, hrZoneDefinitions, manualCP, manualWPrime]);

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
              fitParser.parse(e.target?.result as ArrayBuffer, (error, fitData) => {
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

                  const summary = processData(points, file.name, processedLaps);
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

  const gpsPoints = data
    .filter(p => p.latitude && p.longitude)
    .map(p => [p.latitude!, p.longitude!] as [number, number]);

  const metricsConfig: Record<string, { label: string, color: string, unit: string }> = {
    power: { label: 'Power', color: '#f97316', unit: 'W' },
    heartRate: { label: 'Heart Rate', color: '#ef4444', unit: 'bpm' },
    cadence: { label: 'Cadence', color: '#a855f7', unit: 'rpm' },
    speed: { label: 'Speed', color: '#22c55e', unit: 'km/h' },
    altitude: { label: 'Altitude', color: '#3b82f6', unit: 'm' },
    slope: { label: 'Slope', color: '#eab308', unit: '%' },
  };

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
      <header className="border-b border-app-border bg-app-bg/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              VELO<span className="text-orange-500 hidden sm:inline">ANALYTICS</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            {estimatedCp && estimatedCp > cp && !autoUpdateCP && (
              <button 
                onClick={() => setCP(estimatedCp)}
                className="hidden lg:flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-full border border-orange-500/20 transition-all group"
              >
                <Zap className="w-3 h-3 text-orange-500 animate-pulse" />
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                  Update CP to {estimatedCp}W?
                </span>
                <ChevronRight className="w-3 h-3 text-orange-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
            <div className="flex items-center gap-1 sm:gap-2 bg-app-card border border-app-border px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
              <span className="text-[10px] sm:text-xs font-medium text-app-muted hidden sm:inline">CP:</span>
              <input 
                type="number" 
                value={cp} 
                onChange={(e) => setCP(parseInt(e.target.value) || 0)}
                className="bg-transparent w-8 sm:w-12 text-[10px] sm:text-xs font-bold focus:outline-none text-orange-400"
              />
              <span className="text-[8px] sm:text-[10px] text-app-muted uppercase tracking-widest">W</span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setShowUploadView(!showUploadView)}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all",
                  showUploadView ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "bg-app-card text-app-muted border border-app-border hover:text-app-text"
                )}
              >
                <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{showUploadView ? 'Cancel' : 'Upload'}</span>
              </button>
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors border border-transparent hover:border-app-border"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-app-muted" />
                )}
              </button>
              <button 
                onClick={() => setShowAboutModal(true)}
                className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors border border-transparent hover:border-app-border"
                title="About & Methodology"
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-app-muted" />
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-1.5 sm:p-2 hover:bg-app-card rounded-full transition-colors border border-transparent hover:border-app-border"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-app-muted" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {(showUploadView || (!summary && history.length === 0)) ? (
          <div 
            className={cn(
              "mt-12 border-2 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center transition-all duration-300",
              isDragging ? "border-orange-500 bg-orange-500/5 scale-[1.01]" : "border-white/10 bg-white/2 hover:bg-white/[0.04]"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
          >
            <div className="w-20 h-20 bg-app-card rounded-full flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-app-muted" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Drop your activity files</h2>
            <p className="text-app-muted mb-8 max-w-md text-center">
              Support for Garmin <span className="text-app-text/60">.fit</span> files.
            </p>
            <label className="bg-orange-500 hover:bg-orange-600 text-black px-8 py-3 rounded-full font-bold transition-all cursor-pointer shadow-xl shadow-orange-500/20 active:scale-95">
              Select Files
              <input type="file" className="hidden" accept=".fit" multiple onChange={(e) => handleFileUpload(e.target.files)} />
            </label>
            
            {uploadQueue.length > 0 && (
              <div className="mt-12 w-full max-w-2xl bg-app-card border border-app-border rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="px-6 py-4 border-b border-app-border flex items-center justify-between bg-app-card/50">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Processing Queue</h3>
                  </div>
                  <button 
                    onClick={() => setUploadQueue([])}
                    className="text-[10px] font-bold uppercase tracking-widest text-app-muted/50 hover:text-app-muted transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto divide-y divide-app-border/50">
                  {uploadQueue.map((item) => (
                    <div key={item.id} className="px-6 py-4 flex items-center gap-4 group">
                      <div className="w-8 h-8 rounded-full bg-app-card flex items-center justify-center shrink-0">
                        {item.status === 'processing' ? (
                          <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                        ) : item.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : item.status === 'error' ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Activity className="w-4 h-4 text-app-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium truncate pr-4">{item.name}</span>
                          <span className="text-[10px] text-app-muted font-mono">{item.progress}%</span>
                        </div>
                        <div className="h-1 w-full bg-app-card rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              item.status === 'error' ? "bg-red-500" : "bg-orange-500"
                            )}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        {item.error && (
                          <p className="text-[8px] text-red-400 mt-1 uppercase tracking-widest">{item.error}</p>
                        )}
                      </div>
                      {item.status === 'completed' && (
                        <button 
                          onClick={() => {
                            setSummary(item.summary!);
                            setData(item.data!);
                            setIsEditingName(false);
                            setEditedName('');
                            setOriginalFile(item.file || null);
                            setCurrentActivityId(item.historyId || null);
                            const cpWPrimeResult = estimateCPWPrime(item.data!);
                            setCpWPrime(cpWPrimeResult);
                            setEstimatedCp(cpWPrimeResult?.cp ? Math.round(cpWPrimeResult.cp) : null);
                            setActivePoint(null);
                            setIsPointLocked(false);
                            setShowUploadView(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="ml-4 px-3 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-[8px] font-bold uppercase tracking-widest border border-orange-500/20 transition-all"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-12 flex gap-8 opacity-40">
              <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> <span className="text-xs uppercase tracking-widest">FIT</span></div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {!summary && history.length > 0 && selectedHistoryIds.length < 2 && (
              <div 
                onClick={() => {
                  const latest = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                  if (latest) loadFromHistory(latest.id);
                }}
                className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 cursor-pointer group hover:bg-white/[0.02] rounded-3xl transition-all"
              >
                <div className="w-24 h-24 bg-app-card rounded-full flex items-center justify-center mb-8 shadow-2xl border border-app-border group-hover:border-orange-500/50 group-hover:scale-110 transition-all duration-500">
                  <History className="w-10 h-10 text-orange-500" />
                </div>
                <h2 className="text-3xl font-bold mb-4 tracking-tight group-hover:text-orange-500 transition-colors">Select an Activity</h2>
                <p className="text-app-muted mb-10 max-w-md leading-relaxed group-hover:text-app-text transition-colors">
                  Your history is ready. Click here to view your latest activity, or select one from the history list below.
                </p>
              </div>
            )}

            {summary && (
              <>
                {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Duration & Work</span>
                      <Timer className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-light tracking-tighter">{formatDuration(summary.duration)}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                      Work: {Math.round((summary.avgPower || 0) * summary.duration / 1000)} kJ
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Power Metrics</span>
                      <Zap className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light tracking-tighter">{Math.round(summary.xPower || 0)}</span>
                      <span className="text-xs text-app-muted font-medium">W (xPower)</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[10px] text-app-muted font-bold uppercase tracking-widest">
                      <span>Avg: {Math.round(summary.avgPower || 0)}W | Max: {Math.round(summary.maxPower || 0)}W</span>
                      {data.some(p => p.leftRightBalance !== undefined) && (
                        <span>L/R: {(() => {
                          const balances = data.filter(p => p.leftRightBalance !== undefined).map(p => p.leftRightBalance!);
                          if (balances.length === 0) return '50/50';
                          const avg = balances.reduce((a, b) => a + b, 0) / balances.length;
                          // Simple assumption: value is % left or right depending on device
                          // Most modern devices return it as % left.
                          return `${Math.round(avg)}/${100 - Math.round(avg)}`;
                        })()}</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Training Stress</span>
                      <Activity className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light tracking-tighter">{Math.round(summary.bikeScore || 0)}</span>
                      <span className="text-xs text-app-muted font-medium">BikeScore</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                      RI: {(summary.relativeIntensity || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Heart Rate</span>
                      <Heart className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light tracking-tighter">{Math.round(summary.avgHeartRate || 0)}</span>
                      <span className="text-xs text-app-muted font-medium">BPM</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                      Max: {Math.round(summary.maxHeartRate || 0)} bpm
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Elevation & Distance</span>
                      <Navigation className="w-4 h-4 text-green-400 rotate-45" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light tracking-tighter">{Math.round(summary.totalAscent || 0)}</span>
                      <span className="text-xs text-app-muted font-medium">M</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                      Dist: {(summary.distance / 1000).toFixed(1)}km
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Speed</span>
                      <Clock className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light tracking-tighter">{(summary.avgSpeed || 0).toFixed(1)}</span>
                      <span className="text-xs text-app-muted font-medium">KM/H</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                      Max: {(summary.maxSpeed || 0).toFixed(1)}km/h
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Cadence</span>
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light tracking-tighter">{Math.round(summary.avgCadence || 0)}</span>
                      <span className="text-xs text-app-muted font-medium">RPM</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                      Max: {Math.round(summary.maxCadence || 0)} rpm
                    </div>
                  </div>

                  {summary.aerobicDecoupling !== undefined && (
                    <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Aerobic Decoupling</span>
                        <TrendingUp className={cn(
                          "w-4 h-4",
                          summary.aerobicDecoupling < 5 ? "text-green-500" :
                          summary.aerobicDecoupling < 10 ? "text-orange-500" : "text-red-500"
                        )} />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-4xl font-light tracking-tighter",
                          summary.aerobicDecoupling < 5 ? "text-green-500" :
                          summary.aerobicDecoupling < 10 ? "text-orange-500" : "text-red-500"
                        )}>
                          {(summary.aerobicDecoupling || 0).toFixed(1)}%
                        </span>
                        <span className="text-xs text-app-muted font-medium">Pw:HR</span>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                        {summary.aerobicDecoupling < 5 ? "Good Efficiency" : 
                         summary.aerobicDecoupling < 10 ? "Moderate Drift" : "High Drift"}
                      </div>
                    </div>
                  )}

                  {summary.avgTemperature !== undefined && (
                    <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Temperature</span>
                        <Thermometer className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-light tracking-tighter">{Math.round(summary.avgTemperature || 0)}</span>
                        <span className="text-xs text-app-muted font-medium">°C</span>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                        Avg Temp
                      </div>
                    </div>
                  )}
              {history.length > 0 && currentPMC && (
                <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Performance (PMC)</span>
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-light tracking-tighter">{Math.round(currentPMC.lts || 0)}</span>
                    <span className="text-xs text-app-muted font-medium">LTS (Fitness)</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                    STS: {Math.round(currentPMC.sts || 0)} | SB: {Math.round(currentPMC.sb || 0)}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-8">
              {/* Main Analysis Area */}
              <div className="space-y-8">
                <div className="space-y-8">
                  {/* Metrics Section */}
                  <div className="bg-app-card border border-app-border rounded-3xl p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-500" />
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Activity Metrics</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(metricsConfig).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() => {
                              setActiveMetrics(prev => 
                                prev.includes(key) 
                                  ? (prev.length > 1 ? prev.filter(m => m !== key) : prev)
                                  : [...prev, key]
                              );
                            }}
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                              activeMetrics.includes(key) 
                                ? "bg-orange-500 text-black border-orange-500" 
                                : "bg-app-card text-app-muted border-app-border hover:bg-app-card/80"
                            )}
                          >
                            {config.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                          data={data}
                          onMouseMove={(e) => {
                            if (!isPointLocked && e && e.activeTooltipIndex !== undefined) {
                              setActivePoint(e.activeTooltipIndex);
                            }
                          }}
                          onMouseLeave={() => {
                            if (!isPointLocked) setActivePoint(null);
                          }}
                          onClick={(e) => {
                            if (e && e.activeTooltipIndex !== undefined) {
                              setActivePoint(e.activeTooltipIndex);
                              setIsPointLocked(true);
                            } else {
                              setIsPointLocked(false);
                              setActivePoint(null);
                            }
                          }}
                        >
                          <defs>
                            {activeMetrics.map(metric => (
                              <linearGradient key={`grad-${metric}`} id={`color-${metric}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={metricsConfig[metric].color} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={metricsConfig[metric].color} stopOpacity={0}/>
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis 
                            dataKey="timestamp" 
                            hide 
                          />
                          {activePoint !== null && data[activePoint] && (
                            <ReferenceLineAny 
                              x={data[activePoint].timestamp} 
                              stroke="#f97316" 
                              strokeDasharray="3 3" 
                              label={{ value: 'Active', position: 'top', fill: '#f97316', fontSize: 10 }}
                            />
                          )}
                          {activeMetrics.map((metric, index) => (
                            <YAxis 
                              key={`yaxis-${metric}`}
                              yAxisId={metric}
                              hide={index > 0} // Only show the first Y-axis to keep it clean, but each has its own scale
                              stroke={metricsConfig[metric].color}
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              domain={['auto', 'auto']}
                            />
                          ))}
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: '12px', fontSize: '10px', color: 'var(--app-text)' }}
                            labelStyle={{ color: 'var(--app-muted)', marginBottom: '4px' }}
                            formatter={(value: any, name: string) => {
                              const config = Object.values(metricsConfig).find(c => c.label === name);
                              return [`${value} ${config?.unit || ''}`, name];
                            }}
                          />
                          <Legend 
                            verticalAlign="top" 
                            align="right" 
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '10px' }}
                          />
                          
                          {/* Zone Highlighting (only for primary metric if it's power or HR) */}
                          {activeMetrics[0] === 'power' && getZonesFromDefinitions(powerZoneDefinitions, cp).map((z) => (
                            <ReferenceAreaAny 
                              key={z.name} 
                              yAxisId="power"
                              y1={z.min} 
                              y2={z.max >= 9999 ? 10000 : z.max} 
                              fill={z.color} 
                              fillOpacity={0.05} 
                              stroke="none"
                            />
                          ))}
                          {activeMetrics[0] === 'heartRate' && getZonesFromDefinitions(hrZoneDefinitions, maxHR).map((z) => (
                            <ReferenceAreaAny 
                              key={z.name} 
                              yAxisId="heartRate"
                              y1={z.min} 
                              y2={z.max >= 9999 ? 1000 : z.max} 
                              fill={z.color} 
                              fillOpacity={0.05} 
                              stroke="none"
                            />
                          ))}

                          {activeMetrics.map(metric => (
                            <Area 
                              key={metric}
                              yAxisId={metric}
                              type="monotone" 
                              dataKey={metric} 
                              name={metricsConfig[metric].label}
                              stroke={metricsConfig[metric].color} 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill={`url(#color-${metric})`} 
                              connectNulls
                            />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>                  {/* Map Section */}
                  <div 
                    ref={mapContainerRef}
                    className={cn(
                      "bg-app-card border border-app-border rounded-3xl p-4 relative overflow-hidden group transition-all duration-500",
                      isMapExpanded ? "h-[900px]" : "h-[600px]"
                    )}
                  >
                        <div className="absolute top-6 right-6 z-10 flex flex-col items-end gap-3">
                          <div className="flex gap-2">
                            <div className="bg-app-bg/80 backdrop-blur-md p-1 rounded-full border border-app-border flex gap-1">
                              <button 
                                onClick={toggleFullScreen}
                                className="p-1 rounded-full text-app-muted hover:text-orange-500 transition-all"
                                title="Full Screen"
                              >
                                <Expand className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => setIsMapExpanded(!isMapExpanded)}
                                className={cn(
                                  "p-1 rounded-full transition-all",
                                  isMapExpanded ? "bg-orange-500 text-black" : "text-app-muted hover:text-orange-500"
                                )}
                                title={isMapExpanded ? "Collapse Map" : "Expand Map"}
                              >
                                <Maximize className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => {
                                  setActivePoint(null);
                                  setIsPointLocked(false);
                                }}
                                className="p-1 rounded-full text-app-muted hover:text-orange-500 transition-all"
                                title="Fit to Course"
                              >
                                <Navigation className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => setMapProvider('osm')}
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all",
                                  mapProvider === 'osm' ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                )}
                              >
                                OSM
                              </button>
                              <button 
                                onClick={() => setMapProvider('google')}
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all",
                                  mapProvider === 'google' ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                )}
                              >
                                Google
                              </button>
                            </div>
                          </div>
                          <WeatherCard weather={weather} isLoading={isWeatherLoading} />
                        </div>
                        {gpsPoints.length > 0 ? (
                          mapProvider === 'osm' ? (
                            <div className="w-full h-full relative">
                              {activePoint !== null && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsPointLocked(false);
                                    setActivePoint(null);
                                  }}
                                  className="absolute top-24 left-4 z-50 bg-app-card/80 hover:bg-app-card text-app-text p-2 rounded-full border border-app-border transition-all shadow-lg"
                                  title="Clear Highlight"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-orange-500" />
                                </button>
                              )}
                              <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2">
                                <div className="flex bg-app-card/80 p-1 rounded-xl border border-app-border backdrop-blur-md shadow-lg">
                                  {(['roadmap', 'terrain'] as const).map((t) => (
                                    <button
                                      key={t}
                                      onClick={() => setMapType(t as any)}
                                      className={cn(
                                        "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all",
                                        (t === 'roadmap' && mapType !== 'terrain') || (t === 'terrain' && mapType === 'terrain') ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                      )}
                                    >
                                      {t === 'roadmap' ? 'Standard' : 'Terrain'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <MapContainer key={`${gpsPoints[0][0]}-${gpsPoints[0][1]}`} center={gpsPoints[0]} zoom={13} scrollWheelZoom={true}>
                                <TileLayer
                                  url={
                                    mapType === 'terrain' 
                                      ? "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
                                      : theme === 'dark'
                                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                                        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
                                  }
                                  attribution={
                                    mapType === 'terrain'
                                      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                                      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                  }
                                  maxZoom={19}
                                />
                                <LeafletPolyline 
                                  positions={gpsPoints} 
                                  color="#f97316" 
                                  weight={4} 
                                  opacity={0.8} 
                                  eventHandlers={{
                                    mousemove: (e) => {
                                      if (isPointLocked) return;
                                      const { lat, lng } = e.latlng;
                                      let minDistance = Infinity;
                                      let closestIndex = -1;
                                      
                                      data.forEach((p, index) => {
                                        if (p.latitude !== undefined && p.longitude !== undefined) {
                                          const d = Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lng, 2);
                                          if (d < minDistance) {
                                            minDistance = d;
                                            closestIndex = index;
                                          }
                                        }
                                      });
                                      
                                      if (closestIndex !== -1) setActivePoint(closestIndex);
                                    },
                                    mouseout: () => {
                                      if (!isPointLocked) setActivePoint(null);
                                    },
                                    click: (e) => {
                                      const { lat, lng } = e.latlng;
                                      let minDistance = Infinity;
                                      let closestIndex = -1;
                                      
                                      data.forEach((p, index) => {
                                        if (p.latitude !== undefined && p.longitude !== undefined) {
                                          const d = Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lng, 2);
                                          if (d < minDistance) {
                                            minDistance = d;
                                            closestIndex = index;
                                          }
                                        }
                                      });
                                      
                                      if (closestIndex !== -1) {
                                        setActivePoint(closestIndex);
                                        setIsPointLocked(true);
                                      }
                                    }
                                  }}
                                />
                                {activePoint !== null && data[activePoint]?.latitude && data[activePoint]?.longitude && (
                                  <CircleMarker 
                                    center={[data[activePoint].latitude!, data[activePoint].longitude!]} 
                                    radius={8} 
                                    fillColor="#f97316" 
                                    color="white" 
                                    weight={3} 
                                    fillOpacity={1} 
                                  />
                                )}
                                <MapBounds points={gpsPoints} data={data} activePoint={activePoint} isMapExpanded={isMapExpanded} />
                              </MapContainer>
                            </div>
                          ) : (
                            import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                              <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                                <div className="w-full h-full relative">
                                  {activePoint !== null && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsPointLocked(false);
                                        setActivePoint(null);
                                      }}
                                      className="absolute top-24 left-4 z-50 bg-app-card/80 hover:bg-app-card text-app-text p-2 rounded-full border border-app-border transition-all shadow-lg"
                                      title="Clear Highlight"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-orange-500" />
                                    </button>
                                  )}
                                  <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2">
                                    <div className="flex bg-app-card/80 p-1 rounded-xl border border-app-border backdrop-blur-md shadow-lg">
                                      {(['roadmap', 'satellite', 'terrain'] as const).map((t) => (
                                        <button
                                          key={t}
                                          onClick={() => setMapType(t)}
                                          className={cn(
                                            "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all",
                                            mapType === t ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                          )}
                                        >
                                          {t}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex bg-app-card/80 p-1 rounded-xl border border-app-border backdrop-blur-md gap-1 shadow-lg">
                                      <button
                                        onClick={() => setShowTraffic(!showTraffic)}
                                        className={cn(
                                          "p-2 rounded-full transition-all",
                                          showTraffic ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                        )}
                                        title="Toggle Traffic"
                                      >
                                        <TrafficCone className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setShowBicycling(!showBicycling)}
                                        className={cn(
                                          "p-2 rounded-full transition-all",
                                          showBicycling ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                        )}
                                        title="Toggle Bicycling"
                                      >
                                        <Bike className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setShowTransit(!showTransit)}
                                        className={cn(
                                          "p-2 rounded-full transition-all",
                                          showTransit ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                        )}
                                        title="Toggle Transit"
                                      >
                                        <Bus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <GoogleMap
                                    defaultCenter={{ lat: gpsPoints[0][0], lng: gpsPoints[0][1] }}
                                    center={activePoint !== null && data[activePoint]?.latitude && data[activePoint]?.longitude ? { lat: data[activePoint].latitude!, lng: data[activePoint].longitude! } : undefined}
                                    defaultZoom={13}
                                    gestureHandling={'auto'}
                                    disableDefaultUI={true}
                                    mapTypeControl={false}
                                    mapTypeId={mapType}
                                    mapId={'bf51a910020fa25a'}
                                    style={{ width: '100%', height: '100%' }}
                                    colorScheme="DARK"
                                    onClick={() => {
                                      if (isPointLocked) {
                                        setIsPointLocked(false);
                                        setActivePoint(null);
                                      }
                                    }}
                                  >
                                    <GoogleMapPolyline points={gpsPoints.map(p => ({ lat: p[0], lng: p[1] }))} data={data} setActivePoint={setActivePoint} setIsPointLocked={setIsPointLocked} isMapExpanded={isMapExpanded} />
                                    <GoogleMapTrafficLayer enabled={showTraffic} />
                                    <GoogleMapBicyclingLayer enabled={showBicycling} />
                                    <GoogleMapTransitLayer enabled={showTransit} />
                                    {activePoint !== null && data[activePoint]?.latitude && data[activePoint]?.longitude && (
                                      <div 
                                        style={{ 
                                          position: 'absolute', 
                                          left: '50%', 
                                          top: '50%', 
                                          transform: 'translate(-50%, -50%)',
                                          width: '16px',
                                          height: '16px',
                                          backgroundColor: '#f97316',
                                          borderRadius: '50%',
                                          border: '3px solid white',
                                          boxShadow: '0 0 15px rgba(249, 115, 22, 0.5)',
                                          zIndex: 100
                                        }}
                                      />
                                    )}
                                  </GoogleMap>
                                </div>
                              </APIProvider>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-app-muted/20 p-8 text-center">
                                <MapIcon className="w-12 h-12 mb-4" />
                                <span className="text-xs uppercase tracking-widest mb-2 font-bold">Google Maps API Key Missing</span>
                                <p className="text-[10px] leading-relaxed">Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables to enable Google Maps.</p>
                              </div>
                            )
                          )
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-app-muted/20">
                            <MapIcon className="w-12 h-12 mb-4" />
                            <span className="text-xs uppercase tracking-widest">No GPS Data</span>
                          </div>
                        )}
                      </div>

                      {/* Activity Details Section */}
                      <div className="bg-app-card border border-app-border rounded-3xl p-8">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-app-text/60 mb-6">Activity Details</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                            <span className="text-xs text-app-muted">Activity Name</span>
                            {isEditingName ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  type="text" 
                                  value={editedName}
                                  onChange={(e) => setEditedName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      if (currentActivityId) {
                                        updateActivityName(currentActivityId, editedName);
                                      }
                                      setIsEditingName(false);
                                    } else if (e.key === 'Escape') {
                                      setIsEditingName(false);
                                    }
                                  }}
                                  className="bg-app-bg border border-app-border rounded px-2 py-1 text-xs focus:border-orange-500 outline-none w-48"
                                  autoFocus
                                />
                                <button 
                                  onClick={() => {
                                    if (currentActivityId) {
                                      updateActivityName(currentActivityId, editedName);
                                    }
                                    setIsEditingName(false);
                                  }}
                                  className="p-1 hover:bg-orange-500/10 rounded text-orange-500"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => setIsEditingName(false)}
                                  className="p-1 hover:bg-red-500/10 rounded text-red-500"
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{summary.name}</span>
                                <button 
                                  onClick={() => {
                                    setEditedName(summary.name);
                                    setIsEditingName(true);
                                  }}
                                  className="p-1 hover:bg-app-card rounded text-app-muted hover:text-orange-500 transition-colors"
                                  title="Edit Activity Name"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                            <span className="text-xs text-app-muted">Start Time</span>
                            <span className="text-xs font-medium">{format(summary.startTime, 'HH:mm:ss')}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                            <span className="text-xs text-app-muted">Avg Cadence</span>
                            <span className="text-xs font-medium">
                              {Math.round(summary.avgCadence || 0)} rpm
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                            <span className="text-xs text-app-muted">Avg Speed</span>
                            <span className="text-xs font-medium">
                              {(summary.avgSpeed || 0).toFixed(1)} km/h
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                            <span className="text-xs text-app-muted">Elevation Gain</span>
                            <span className="text-xs font-medium">
                              {Math.round(summary.totalAscent || 0)} m
                            </span>
                          </div>
                          {estimatedCp && (
                            <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                              <span className="text-xs text-app-muted font-bold text-orange-500/60">Estimated CP</span>
                              <span className="text-xs font-bold text-orange-500">
                                {estimatedCp} W
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center py-3">
                            <span className="text-xs text-app-muted">Max Heart Rate</span>
                            <span className="text-xs font-medium">
                              {Math.round(summary.maxHeartRate || 0)} bpm
                            </span>
                          </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-3">
                          <button 
                            onClick={exportOriginal}
                            className="flex items-center justify-center gap-2 py-3 bg-app-card/50 hover:bg-app-card border border-app-border rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                          >
                            <FileDown className="w-3 h-3 text-orange-500" />
                            Original
                          </button>
                          <button 
                            onClick={exportGPX}
                            className="flex items-center justify-center gap-2 py-3 bg-app-card/50 hover:bg-app-card border border-app-border rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                          >
                            <Download className="w-3 h-3 text-orange-500" />
                            GPX
                          </button>
                        </div>
                      </div>

                  {/* W' Balance Section */}
                  <div className="bg-app-card border border-app-border rounded-3xl p-8">
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <h3 className="text-xl font-semibold">W' Balance Analysis</h3>
                          <p className="text-[10px] text-app-muted uppercase tracking-widest mt-1">Anaerobic Reserve Depletion & Recovery</p>
                        </div>
                        {cpWPrime && (
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="text-[10px] text-app-muted uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                Critical Power
                                {manualCP !== null && <span className="text-[8px] bg-orange-500/20 text-orange-500 px-1 rounded">Manual</span>}
                              </div>
                              <div className="text-xl font-bold text-orange-500">{Math.round(manualCP ?? cpWPrime.cp ?? 0)}W</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] text-app-muted uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                W' Capacity
                                {manualWPrime !== null && <span className="text-[8px] bg-purple-500/20 text-purple-500 px-1 rounded">Manual</span>}
                              </div>
                              <div className="text-xl font-bold text-purple-500">{Math.round((manualWPrime ?? cpWPrime.wPrime ?? 0) / 1000)}kJ</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data}>
                            <defs>
                              <linearGradient id="colorWBal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                            <XAxis 
                              dataKey="timestamp" 
                              stroke="var(--app-muted)" 
                              fontSize={10} 
                              tickFormatter={(val) => {
                                const d = new Date(val);
                                return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
                              }}
                            />
                            <YAxis yAxisId="power" stroke="var(--app-muted)" fontSize={10} unit="W" />
                            <YAxis yAxisId="wbal" orientation="right" stroke="var(--app-muted)" fontSize={10} unit="J" domain={[0, cpWPrime?.wPrime || 'auto']} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: '12px', fontSize: '10px', color: 'var(--app-text)' }}
                              labelStyle={{ color: 'var(--app-muted)', marginBottom: '4px' }}
                              labelFormatter={(val) => new Date(val).toLocaleTimeString()}
                              formatter={(value: any, name: string) => {
                                if (name === "W' Balance") return [`${Math.round(value)} J`, name];
                                return [`${Math.round(value)} W`, name];
                              }}
                            />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '20px', color: 'var(--app-text)' }} />
                            
                            {cpWPrime && (
                              <ReferenceLineAny yAxisId="power" y={cpWPrime.cp} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'CP', position: 'right', fill: '#ef4444', fontSize: 10 }} />
                            )}

                            <Area 
                              yAxisId="wbal"
                              type="monotone" 
                              dataKey="wPrimeBalance" 
                              name="W' Balance" 
                              stroke="#a855f7" 
                              fillOpacity={1} 
                              fill="url(#colorWBal)" 
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line 
                              yAxisId="power"
                              type="monotone" 
                              dataKey="power" 
                              name="Power" 
                              stroke="#f97316" 
                              strokeWidth={1} 
                              dot={false}
                              opacity={0.4}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* CP & W' Analysis */}
                      <div className="bg-app-card border border-app-border rounded-3xl p-8">
                        <div className="flex items-center justify-between mb-8">
                          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-app-text/60">Critical Power Analysis</h3>
                          <Zap className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Estimated CP</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-light tracking-tighter">{Math.round(cpWPrime?.cp || 0)}</span>
                              <span className="text-sm text-app-muted">Watts</span>
                            </div>
                            <p className="text-[10px] text-app-muted/50 mt-2 leading-relaxed">
                              Critical Power represents the highest power output you can maintain indefinitely without fatigue.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Estimated W'</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-light tracking-tighter">{Math.round(cpWPrime?.wPrime || 0)}</span>
                              <span className="text-sm text-app-muted">Joules</span>
                            </div>
                            <p className="text-[10px] text-app-muted/50 mt-2 leading-relaxed">
                              W' is your anaerobic work capacity, the finite amount of energy available above Critical Power.
                            </p>
                          </div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-app-border/30">
                          <p className="text-[9px] text-app-muted/40 uppercase tracking-widest font-medium">
                            Model: 2-Parameter Linear Model (Work = CP × t + W')
                          </p>
                        </div>
                      </div>

                      <div className="bg-app-bg/50 rounded-2xl p-6 border border-app-border">
                        <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-purple-500" />
                          What is W' Balance?
                        </h4>
                        <p className="text-xs text-app-muted leading-relaxed">
                          W' (pronounced "W-prime") represents your anaerobic work capacity—the total amount of work you can perform above your Critical Power (CP) before reaching exhaustion. 
                          The W' Balance chart shows how this reserve depletes when you ride above CP and how it recovers when you ride below it. 
                          When the curve hits zero, you've theoretically reached your limit for high-intensity effort.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Power Curve Section */}
                  <div ref={mmpCurveRef} className="bg-app-card border border-app-border rounded-3xl p-8">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Mean Maximal Power Curve</span>
                        </div>
                        {selectedHistoryIds.length >= 2 && (
                          <div className="flex items-center gap-4">
                            <div className="text-[10px] text-app-muted uppercase tracking-widest">
                              Overlaying {selectedHistoryIds.length} activities
                            </div>
                            <button 
                              onClick={() => setSelectedHistoryIds([])}
                              className="px-3 py-1 bg-app-card border border-app-border rounded-full text-[10px] font-bold uppercase tracking-widest text-orange-500 hover:bg-orange-500/10 transition-all"
                            >
                              Clear Comparison
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={(() => {
                            const durations = [1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600];
                            const comparisons = getComparisonCurves();
                            return durations.map(d => {
                              const point: any = { duration: d };
                              const current = summary?.powerCurve?.find(p => p.duration === d);
                              if (current) point.current = current.power;
                              
                              const allTime = allTimeBestCurve.find(p => p.duration === d);
                              if (allTime) point.allTime = allTime.power;

                              const ninetyDay = rolling90DayBestCurve.find(p => p.duration === d);
                              if (ninetyDay) point.ninetyDay = ninetyDay.power;

                              comparisons.forEach(comp => {
                                const p = comp.curve.find(cp => cp.duration === d);
                                if (p) point[comp.name] = p.power;
                              });
                              
                              return point;
                            });
                          })()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                            <XAxis 
                              dataKey="duration" 
                              type="number" 
                              scale="log" 
                              domain={[1, 3600]} 
                              ticks={[1, 2, 5, 10, 30, 60, 300, 600, 1200, 3600]}
                              tickFormatter={(tick) => {
                                if (tick < 60) return `${tick}s`;
                                if (tick < 3600) return `${tick / 60}m`;
                                return `${tick / 3600}h`;
                              }}
                              stroke="var(--app-muted)"
                              fontSize={10}
                            />
                            <YAxis stroke="var(--app-muted)" fontSize={10} unit="W" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: '12px', fontSize: '10px', color: 'var(--app-text)' }}
                              labelStyle={{ color: 'var(--app-muted)', marginBottom: '4px' }}
                              labelFormatter={(label) => {
                                const d = Number(label);
                                if (d < 60) return `${d} seconds`;
                                if (d < 3600) return `${d / 60} minutes`;
                                return `${d / 3600} hours`;
                              }}
                            />
                            <Legend 
                              verticalAlign="top" 
                              align="right" 
                              iconType="circle"
                              wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '20px', color: 'var(--app-text)' }}
                            />
                            <Line type="monotone" dataKey="current" name="Current Activity" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="allTime" name="All-Time Best" stroke={theme === 'dark' ? '#f8fafc' : '#1e293b'} strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                            <Line type="monotone" dataKey="ninetyDay" name="90-Day Best" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                            {getComparisonCurves().map((comp, i) => (
                              <Line 
                                key={comp.name} 
                                type="monotone" 
                                dataKey={comp.name} 
                                stroke={['#3b82f6', '#10b981', '#a855f7', '#f43f5e'][i % 4]} 
                                strokeWidth={1.5} 
                                strokeDasharray="2 2"
                                dot={false} 
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                        {[5, 60, 300, 600, 1200, 1800, 3600].map(d => {
                          const p = summary?.powerCurve?.find(cp => cp.duration === d);
                          return (
                            <div key={d} className="bg-app-card/50 border border-app-border rounded-xl p-3 text-center">
                              <div className="text-[8px] text-app-muted uppercase tracking-widest mb-1">
                                {d < 60 ? `${d}s` : d < 3600 ? `${d / 60}m` : `${d / 3600}h`}
                              </div>
                              <div className="text-sm font-bold text-app-text">
                                {p ? `${p.power}W` : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Zones Section */}
                  <div className="bg-app-card border border-app-border rounded-3xl p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Power Zones</h4>
                        <div className="space-y-3">
                          {summary?.powerZones?.map((z) => (
                            <div key={z.name} className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-app-text/60">{z.name}</span>
                                <span className="text-app-muted">{Math.floor(z.seconds / 60)}m {z.seconds % 60}s ({z.percentage.toFixed(1)}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-app-card rounded-full overflow-hidden">
                                <div 
                                  className="h-full transition-all duration-1000" 
                                  style={{ width: `${z.percentage}%`, backgroundColor: z.color }} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Heart Rate Zones</h4>
                        {summary?.hrZones ? (
                          <div className="space-y-3">
                            {summary.hrZones.map((z) => (
                              <div key={z.name} className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-app-text/60">{z.name}</span>
                                  <span className="text-app-muted">{Math.floor(z.seconds / 60)}m {z.seconds % 60}s ({z.percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-app-card rounded-full overflow-hidden">
                                  <div 
                                    className="h-full transition-all duration-1000" 
                                    style={{ width: `${z.percentage}%`, backgroundColor: z.color }} 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-app-muted/50 text-xs uppercase tracking-widest border border-dashed border-app-border rounded-2xl">
                            No HR Data
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Laps Section */}
                  <div className="bg-app-card border border-app-border rounded-3xl p-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <LayoutList className="w-4 h-4 text-orange-500" />
                        <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Lap Breakdown</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-app-border">
                              <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Lap</th>
                              <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Time</th>
                              <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Dist (km)</th>
                              <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Avg/Max Power</th>
                              <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Avg/Max HR</th>
                              <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Avg/Max Cadence</th>
                              <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Avg/Max Speed</th>
                              <th className="py-4 text-[10px] uppercase tracking-widest text-app-muted font-bold">Temp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary?.laps?.map((lap) => (
                              <tr key={lap.id} className="border-b border-app-border/50 hover:bg-app-card transition-colors group">
                                <td className="py-4 text-xs font-medium text-orange-500">#{lap.id}</td>
                                <td className="py-4 text-xs text-app-text/60">
                                  {Math.floor(lap.duration / 60)}:{(lap.duration % 60).toString().padStart(2, '0')}
                                </td>
                                <td className="py-4 text-xs text-app-text/60">{(lap.distance / 1000).toFixed(2)}</td>
                                <td className="py-4 text-xs text-app-text/60 font-bold">
                                  {Math.round(lap.avgPower || 0)}W / {Math.round(lap.maxPower || 0)}W
                                </td>
                                <td className="py-4 text-xs text-app-text/60">
                                  {Math.round(lap.avgHeartRate || 0)} / {Math.round(lap.maxHeartRate || 0)} bpm
                                </td>
                                <td className="py-4 text-xs text-app-text/60">
                                  {Math.round(lap.avgCadence || 0)} / {Math.round(lap.maxCadence || 0)} rpm
                                </td>
                                <td className="py-4 text-xs text-app-text/60">
                                  {(lap.avgSpeed || 0).toFixed(1)} / {(lap.maxSpeed || 0).toFixed(1)} km/h
                                </td>
                                <td className="py-4 text-xs text-app-text/60">
                                  {lap.avgTemperature !== undefined ? `${Math.round(lap.avgTemperature || 0)}°C` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* PMC Analysis Section */}
                  <div className="bg-app-card border border-app-border rounded-3xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/10 rounded-2xl">
                          <TrendingUp className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">PMC Analysis</h3>
                          <p className="text-[10px] text-app-muted uppercase tracking-widest mt-1">Performance Management Chart (PMC)</p>
                        </div>
                      </div>
                      <div className="flex gap-8">
                        <div 
                          className={cn(
                            "text-center cursor-pointer transition-all duration-300",
                            pmcFocus === 'bikeScore' ? "scale-110" : pmcFocus && pmcFocus !== 'bikeScore' ? "opacity-30" : ""
                          )}
                          onMouseEnter={() => setPmcFocus('bikeScore')}
                          onMouseLeave={() => setPmcFocus(null)}
                        >
                          <div className="text-3xl font-light tracking-tighter text-orange-500">{Math.round(currentPMC?.bikeScore || 0)}</div>
                          <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">BikeScore</div>
                        </div>
                        <div 
                          className={cn(
                            "text-center cursor-pointer transition-all duration-300",
                            pmcFocus === 'lts' ? "scale-110" : pmcFocus && pmcFocus !== 'lts' ? "opacity-30" : ""
                          )}
                          onMouseEnter={() => setPmcFocus('lts')}
                          onMouseLeave={() => setPmcFocus(null)}
                        >
                          <div className="text-3xl font-light tracking-tighter text-blue-500">{Math.round(currentPMC?.lts || 0)}</div>
                          <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">Fitness (LTS)</div>
                        </div>
                        <div 
                          className={cn(
                            "text-center cursor-pointer transition-all duration-300",
                            pmcFocus === 'sts' ? "scale-110" : pmcFocus && pmcFocus !== 'sts' ? "opacity-30" : ""
                          )}
                          onMouseEnter={() => setPmcFocus('sts')}
                          onMouseLeave={() => setPmcFocus(null)}
                        >
                          <div className="text-3xl font-light tracking-tighter text-red-500">{Math.round(currentPMC?.sts || 0)}</div>
                          <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">Fatigue (STS)</div>
                        </div>
                        <div 
                          className={cn(
                            "text-center cursor-pointer transition-all duration-300",
                            pmcFocus === 'sb' ? "scale-110" : pmcFocus && pmcFocus !== 'sb' ? "opacity-30" : ""
                          )}
                          onMouseEnter={() => setPmcFocus('sb')}
                          onMouseLeave={() => setPmcFocus(null)}
                        >
                          <div className="text-3xl font-light tracking-tighter text-green-500">{Math.round(currentPMC?.sb || 0)}</div>
                          <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">Form (SB)</div>
                        </div>
                      </div>
                    </div>

                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={pmcData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="var(--app-muted)" 
                            fontSize={10} 
                            tickFormatter={(str) => {
                              const date = new Date(str);
                              if (pmcDateRange === '6weeks' || pmcDateRange === '3months') {
                                return format(date, 'MMM d');
                              }
                              return format(date, 'MMM yy');
                            }}
                          />
                          <YAxis 
                            yAxisId="fitness" 
                            stroke="var(--app-muted)" 
                            fontSize={10} 
                            hide={pmcFocus === 'bikeScore' || pmcFocus === 'sb'}
                            label={pmcFocus === 'lts' || pmcFocus === 'sts' ? { value: 'LTS/STS', angle: -90, position: 'insideLeft', style: { fill: 'var(--app-muted)', fontSize: '10px' } } : undefined}
                          />
                          <YAxis 
                            yAxisId="bikeScore" 
                            stroke="var(--app-muted)" 
                            fontSize={10} 
                            hide={pmcFocus !== 'bikeScore'}
                            label={pmcFocus === 'bikeScore' ? { value: 'BikeScore', angle: -90, position: 'insideLeft', style: { fill: 'var(--app-muted)', fontSize: '10px' } } : undefined}
                          />
                          <YAxis 
                            yAxisId="form" 
                            orientation="right" 
                            stroke="var(--app-muted)" 
                            fontSize={10} 
                            hide={pmcFocus === 'bikeScore' || pmcFocus === 'lts' || pmcFocus === 'sts'}
                            label={pmcFocus === 'sb' ? { value: 'SB', angle: 90, position: 'insideRight', style: { fill: 'var(--app-muted)', fontSize: '10px' } } : undefined}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: '12px', fontSize: '12px', color: 'var(--app-text)' }}
                            labelStyle={{ color: 'var(--app-muted)', marginBottom: '4px' }}
                            labelFormatter={(label) => format(new Date(label), 'EEEE, MMMM d, yyyy')}
                          />
                          <Legend 
                            verticalAlign="top" 
                            height={36}
                            onMouseEnter={(e) => setPmcFocus(e.dataKey as string)}
                            onMouseLeave={() => setPmcFocus(null)}
                          />
                          <Bar 
                            yAxisId={pmcFocus === 'bikeScore' ? "bikeScore" : "fitness"} 
                            dataKey="bikeScore" 
                            fill="#f97316" 
                            opacity={pmcFocus === 'bikeScore' ? 0.8 : pmcFocus ? 0.1 : 0.3} 
                            name="BikeScore" 
                          />
                          <Line 
                            yAxisId="fitness" 
                            type="monotone" 
                            dataKey="lts" 
                            stroke="#3b82f6" 
                            strokeWidth={pmcFocus === 'lts' ? 4 : 2} 
                            opacity={pmcFocus === 'lts' ? 1 : pmcFocus ? 0.2 : 1}
                            dot={false} 
                            name="Fitness (LTS)" 
                          />
                          <Line 
                            yAxisId="fitness" 
                            type="monotone" 
                            dataKey="sts" 
                            stroke="#ef4444" 
                            strokeWidth={pmcFocus === 'sts' ? 4 : 2} 
                            opacity={pmcFocus === 'sts' ? 1 : pmcFocus ? 0.2 : 1}
                            dot={false} 
                            name="Fatigue (STS)" 
                          />
                          <Area 
                            yAxisId="form" 
                            type="monotone" 
                            dataKey="sb" 
                            fill="#22c55e" 
                            stroke="#22c55e" 
                            fillOpacity={pmcFocus === 'sb' ? 0.4 : pmcFocus ? 0.05 : 0.1} 
                            opacity={pmcFocus === 'sb' ? 1 : pmcFocus ? 0.2 : 1}
                            name="Form (SB)" 
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-app-border/30">
                      {[
                        { id: 'all', label: 'All' },
                        { id: '1year', label: 'One Year' },
                        { id: '6months', label: 'Six Months' },
                        { id: '3months', label: 'Three Months' },
                        { id: '6weeks', label: 'Six Weeks' }
                      ].map(range => (
                        <button
                          key={range.id}
                          onClick={() => setPmcDateRange(range.id as any)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all border",
                            pmcDateRange === range.id 
                              ? "bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20" 
                              : "bg-app-card text-app-muted border-app-border hover:bg-app-card/80"
                          )}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-app-border/50">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500">LTS (Fitness)</h4>
                        <p className="text-[10px] text-app-muted leading-relaxed">
                          Long Term Stress is a 42-day weighted average of your daily BikeScore. It represents your long-term training load and overall fitness level.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-500">STS (Fatigue)</h4>
                        <p className="text-[10px] text-app-muted leading-relaxed">
                          Short Term Stress is a 7-day weighted average of your daily BikeScore. It represents your short-term training load and current level of fatigue.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-green-500">SB (Form)</h4>
                        <p className="text-[10px] text-app-muted leading-relaxed">
                          Stress Balance (LTS - STS) represents your current form or freshness. A positive SB suggests you are fresh and ready to perform.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Training Load Summary Section */}
                  <div className="bg-app-card border border-app-border rounded-3xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/10 rounded-2xl">
                          <BarChart3 className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">Training Load Summary</h3>
                          <p className="text-[10px] text-app-muted uppercase tracking-widest mt-1">Weekly/Monthly/Yearly Volume Analysis</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(['weekly', 'monthly', 'yearly'] as const).map((range) => (
                          <button
                            key={range}
                            onClick={() => setTrainingLoadRange(range)}
                            className={cn(
                              "px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                              trainingLoadRange === range 
                                ? "bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20" 
                                : "bg-app-card text-app-muted border-app-border hover:bg-app-card/80"
                            )}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trainingLoadData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                          <XAxis 
                            dataKey="label" 
                            stroke="var(--app-muted)" 
                            fontSize={10} 
                            tickFormatter={(str) => str}
                          />
                          <YAxis stroke="var(--app-muted)" fontSize={10} label={{ value: 'BikeScore', angle: -90, position: 'insideLeft', style: { fill: 'var(--app-muted)', fontSize: '10px' } }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: '12px', fontSize: '12px', color: 'var(--app-text)' }}
                            labelStyle={{ color: 'var(--app-muted)', marginBottom: '4px' }}
                            formatter={(value: any, name: string) => {
                              if (name === 'work') return [`${Math.round(value)} kJ`, 'Total Work'];
                              if (name === 'bikeScore') return [Math.round(value), 'BikeScore'];
                              if (name === 'duration') return [`${(value / 3600).toFixed(1)} h`, 'Total Time'];
                              return [value, name];
                            }}
                          />
                          <Bar 
                            dataKey="bikeScore" 
                            fill="#f97316" 
                            radius={[6, 6, 0, 0]} 
                            name="BikeScore"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-app-border/50">
                      <div className="text-center">
                        <div className="text-2xl font-light tracking-tighter text-orange-500">{Math.round(trainingLoadStats.totalBikeScore || 0)}</div>
                        <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">Total BikeScore</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-light tracking-tighter text-app-text">{Math.round(trainingLoadStats.avgBikeScore || 0)}</div>
                        <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">Avg BikeScore / Period</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-light tracking-tighter text-app-text">{Math.round(trainingLoadStats.totalWork || 0)}kJ</div>
                        <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">Total Work</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-light tracking-tighter text-app-text">{Math.round((trainingLoadStats.totalDuration || 0) / 3600)}h</div>
                        <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">Total Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Activity History Section */}
                  <div className="bg-app-card border border-app-border rounded-3xl p-8">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div 
                            onClick={() => {
                              if (selectedHistoryIds.length === history.length && history.length > 0) {
                                setSelectedHistoryIds([]);
                              } else {
                                setSelectedHistoryIds(history.map(h => h.id));
                              }
                            }}
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all",
                              selectedHistoryIds.length === history.length && history.length > 0 ? "bg-orange-500 border-orange-500" : "border-app-border bg-app-bg"
                            )}
                            title={selectedHistoryIds.length === history.length ? "Deselect All" : "Select All"}
                          >
                            {selectedHistoryIds.length === history.length && history.length > 0 && <Check className="w-3 h-3 text-black" />}
                          </div>
                          <h3 className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Historical Activities</h3>
                          <div className="flex items-center gap-2">
                            {selectedHistoryIds.length >= 2 && (
                              <button 
                                onClick={handleCompare}
                                className="bg-orange-500 text-black px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border border-orange-500 shadow-lg shadow-orange-500/20 animate-in fade-in zoom-in duration-300 flex items-center gap-2"
                              >
                                <TrendingUp className="w-3 h-3" />
                                Compare {selectedHistoryIds.length}
                              </button>
                            )}
                            {selectedHistoryIds.length > 0 && (
                              <button 
                                onClick={() => removeMultipleFromHistory(selectedHistoryIds)}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border border-red-500/20 animate-in fade-in zoom-in duration-300 flex items-center gap-2"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete {selectedHistoryIds.length}
                              </button>
                            )}
                          </div>
                        </div>
                        {history.length > 0 && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setHistorySortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                              className="flex items-center gap-2 px-3 py-1 bg-app-card border border-app-border rounded-full text-[10px] font-bold uppercase tracking-widest text-app-muted hover:text-app-text transition-all"
                              title={historySortOrder === 'newest' ? "Switch to Oldest First" : "Switch to Newest First"}
                            >
                              <ArrowUpDown className="w-3 h-3" />
                              {historySortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-2">
                        {sortedHistory.length > 0 ? (
                          sortedHistory.map(h => (
                            <div 
                              key={h.id} 
                              onClick={() => loadFromHistory(h.id)}
                              className={cn(
                                "bg-app-card border rounded-xl p-4 flex items-center justify-between group cursor-pointer transition-all",
                                summary?.startTime && h.date === summary.startTime.toISOString().split('T')[0] && h.name === summary.name ? "border-orange-500 ring-1 ring-orange-500" : "border-app-border hover:border-app-border/80"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedHistoryIds(prev => 
                                      prev.includes(h.id) ? prev.filter(id => id !== h.id) : [...prev, h.id]
                                    );
                                  }}
                                  className={cn(
                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                    selectedHistoryIds.includes(h.id) ? "bg-orange-500 border-orange-500" : "border-app-border bg-app-bg"
                                  )}
                                >
                                  {selectedHistoryIds.includes(h.id) && <Check className="w-3 h-3 text-black" />}
                                </div>
                                <div>
                                  <div className="text-xs font-bold">{h.name}</div>
                                  <div className="text-[10px] text-app-muted">{format(new Date(h.date), 'MMM d, yyyy')} • {formatDuration(h.duration)}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-xs font-bold text-orange-500">{Math.round(h.bikeScore || 0)}</div>
                                  <div className="text-[8px] text-app-muted uppercase tracking-widest">BikeScore</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadFromHistory(h.id);
                                    }}
                                    className="px-3 py-1 bg-orange-500 text-black rounded-full text-[8px] font-bold uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100 shadow-lg shadow-orange-500/20"
                                  >
                                    View
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFromHistory(h.id);
                                    }}
                                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-50 bg-app-card/30 rounded-2xl border border-dashed border-app-border">
                            <div className="w-12 h-12 bg-app-card rounded-full flex items-center justify-center mb-4 border border-app-border">
                              <Activity className="w-6 h-6 text-app-muted" />
                            </div>
                            <p className="text-xs uppercase tracking-[0.2em] font-bold mb-2">No activities yet</p>
                            <p className="text-[10px] text-app-muted max-w-[200px]">Upload a FIT file to start analyzing your performance data.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>

      {/* About Modal */}
      <AnimatePresence>
        {showAboutModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-6"
          >
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowAboutModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-app-card border border-app-border rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-app-border flex items-center justify-between bg-app-card/50 backdrop-blur-md">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-orange-500" />
                  About & Methodology
                </h2>
                <button 
                  onClick={() => setShowAboutModal(false)}
                  className="text-app-muted hover:text-app-text transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">Mission</h3>
                  <p className="text-sm text-app-text/80 leading-relaxed">
                    VeloAnalytics is built on the principle of <span className="text-app-text font-semibold">algorithmic transparency</span>. 
                    Most cycling platforms hide their calculations behind proprietary trademarks. We believe that athletes should own their data 
                    and understand the math that defines their fitness.
                  </p>
                </section>

                <section className="space-y-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">Core Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-app-bg/50 p-5 rounded-2xl border border-app-border/50">
                      <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-orange-500" />
                        Critical Power (CP)
                      </h4>
                      <p className="text-[11px] text-app-muted leading-relaxed">
                        The highest power output maintainable without fatigue. We use the Monod & Scherrer 2-parameter linear model 
                        to estimate this from your best efforts.
                      </p>
                    </div>
                    <div className="bg-app-bg/50 p-5 rounded-2xl border border-app-border/50">
                      <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-purple-500" />
                        xPower & BikeScore
                      </h4>
                      <p className="text-[11px] text-app-muted leading-relaxed">
                        Developed by Dr. Philip Skiba. xPower uses a 25s EWMA to reflect physiological strain, while BikeScore 
                        quantifies the total "dose" of the workout.
                      </p>
                    </div>
                    <div className="bg-app-bg/50 p-5 rounded-2xl border border-app-border/50">
                      <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                        <Activity className="w-3 h-3 text-blue-500" />
                        LTS / STS / SB
                      </h4>
                      <p className="text-[11px] text-app-muted leading-relaxed">
                        Based on the Banister model. LTS (42-day) represents Fitness, STS (7-day) represents Fatigue, 
                        and SB is the balance (Form) between them.
                      </p>
                    </div>
                    <div className="bg-app-bg/50 p-5 rounded-2xl border border-app-border/50">
                      <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-cyan-500" />
                        W' Balance
                      </h4>
                      <p className="text-[11px] text-app-muted leading-relaxed">
                        A real-time model of your anaerobic reserve. It tracks depletion above CP and exponential 
                        recovery below CP.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">Attribution</h3>
                  <div className="space-y-4 text-[11px] text-app-muted">
                    <p>
                      <span className="text-app-text font-semibold">Dr. Philip Friere Skiba (PhysFarm)</span>: 
                      Creator of the BikeScore™, xPower, and W' Balance algorithms.
                    </p>
                    <p>
                      <span className="text-app-text font-semibold">Dr. Eric Banister</span>: 
                      Developer of the original TRIMP model, the mathematical ancestor of modern training load metrics.
                    </p>
                    <p>
                      <span className="text-app-text font-semibold">GoldenCheetah Project</span>: 
                      For their leadership in open-source cycling analytics standards.
                    </p>
                  </div>
                </section>

                <div className="pt-8 border-t border-app-border/50">
                  <p className="text-[10px] text-app-muted text-center italic">
                    For a full technical breakdown, see the METHODOLOGY.md file in the project root.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-app-card border border-app-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
                <Settings className="w-6 h-6 text-orange-500" />
                Training Settings
              </h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-app-muted hover:text-app-text transition-colors"
              >
                Close
              </button>
            </div>

            <div className="space-y-12">
              {/* Thresholds */}
              <section className="space-y-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted border-b border-app-border/50 pb-2">Thresholds</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-app-text/60">Critical Power (CP)</label>
                    <div className="flex items-center gap-3 bg-app-card border border-app-border rounded-xl px-4 py-3">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <input 
                        type="number" 
                        value={cp} 
                        onChange={(e) => setCP(parseInt(e.target.value) || 0)}
                        className="bg-transparent w-full text-sm font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-app-muted uppercase tracking-widest">Watts</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button 
                        onClick={() => setAutoUpdateCP(!autoUpdateCP)}
                        className={cn(
                          "w-8 h-4 rounded-full transition-all relative",
                          autoUpdateCP ? "bg-orange-500" : "bg-app-border"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                          autoUpdateCP ? "left-4.5" : "left-0.5"
                        )} />
                      </button>
                      <span className="text-[10px] text-app-muted font-medium">Auto-update CP when new record is set</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-app-text/60">Maximum Heart Rate (Max HR)</label>
                    <div className="flex items-center gap-3 bg-app-card border border-app-border rounded-xl px-4 py-3">
                      <Activity className="w-4 h-4 text-red-500" />
                      <input 
                        type="number" 
                        value={maxHR} 
                        onChange={(e) => setMaxHR(parseInt(e.target.value) || 0)}
                        className="bg-transparent w-full text-sm font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-app-muted uppercase tracking-widest">BPM</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-app-text/60">Critical Power (CP)</label>
                    <div className="flex items-center gap-3 bg-app-card border border-app-border rounded-xl px-4 py-3">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <input 
                        type="number" 
                        placeholder={cpWPrime?.cp ? Math.round(cpWPrime.cp || 0).toString() : "Estimated"}
                        value={manualCP ?? ''} 
                        onChange={(e) => setManualCP(e.target.value ? parseInt(e.target.value) : null)}
                        className="bg-transparent w-full text-sm font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-app-muted uppercase tracking-widest">Watts</span>
                    </div>
                    <p className="text-[8px] text-app-muted uppercase tracking-widest">Leave empty to use estimated CP</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-app-text/60">W' Capacity</label>
                    <div className="flex items-center gap-3 bg-app-card border border-app-border rounded-xl px-4 py-3">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <input 
                        type="number" 
                        placeholder={cpWPrime?.wPrime ? Math.round(cpWPrime.wPrime || 0).toString() : "Estimated"}
                        value={manualWPrime ?? ''} 
                        onChange={(e) => setManualWPrime(e.target.value ? parseInt(e.target.value) : null)}
                        className="bg-transparent w-full text-sm font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-app-muted uppercase tracking-widest">Joules</span>
                    </div>
                    <p className="text-[8px] text-app-muted uppercase tracking-widest">Leave empty to use estimated W'</p>
                  </div>
                </div>
              </section>

              {/* Power Zones */}
              <section className="space-y-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted border-b border-app-border/50 pb-2">Power Zones (%)</h3>
                <div className="space-y-4">
                  {powerZoneDefinitions.map((z, i) => (
                    <div key={z.name} className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                      <span className="text-xs text-app-text/60 w-40 shrink-0">{z.name}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <input 
                          type="number" 
                          value={z.percentMin} 
                          onChange={(e) => {
                            const newZones = [...powerZoneDefinitions];
                            newZones[i].percentMin = parseInt(e.target.value) || 0;
                            setPowerZoneDefinitions(newZones);
                          }}
                          className="bg-app-card border border-app-border rounded-lg px-2 py-1 w-16 text-xs text-center"
                        />
                        <span className="text-[10px] text-app-muted/50">-</span>
                        <input 
                          type="number" 
                          value={z.percentMax} 
                          onChange={(e) => {
                            const newZones = [...powerZoneDefinitions];
                            newZones[i].percentMax = parseInt(e.target.value) || 0;
                            setPowerZoneDefinitions(newZones);
                          }}
                          className="bg-app-card border border-app-border rounded-lg px-2 py-1 w-16 text-xs text-center"
                        />
                        <span className="text-[10px] text-app-muted/50">%</span>
                      </div>
                      <div className="text-[10px] text-app-muted w-24 text-right">
                        {Math.round((z.percentMin / 100) * cp)} - {z.percentMax === 999 ? '∞' : Math.round((z.percentMax / 100) * cp)}W
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* HR Zones */}
              <section className="space-y-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted border-b border-app-border/50 pb-2">Heart Rate Zones (%)</h3>
                <div className="space-y-4">
                  {hrZoneDefinitions.map((z, i) => (
                    <div key={z.name} className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                      <span className="text-xs text-app-text/60 w-40 shrink-0">{z.name}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <input 
                          type="number" 
                          value={z.percentMin} 
                          onChange={(e) => {
                            const newZones = [...hrZoneDefinitions];
                            newZones[i].percentMin = parseInt(e.target.value) || 0;
                            setHrZoneDefinitions(newZones);
                          }}
                          className="bg-app-card border border-app-border rounded-lg px-2 py-1 w-16 text-xs text-center"
                        />
                        <span className="text-[10px] text-app-muted/50">-</span>
                        <input 
                          type="number" 
                          value={z.percentMax} 
                          onChange={(e) => {
                            const newZones = [...hrZoneDefinitions];
                            newZones[i].percentMax = parseInt(e.target.value) || 0;
                            setHrZoneDefinitions(newZones);
                          }}
                          className="bg-app-card border border-app-border rounded-lg px-2 py-1 w-16 text-xs text-center"
                        />
                        <span className="text-[10px] text-app-muted/50">%</span>
                      </div>
                      <div className="text-[10px] text-app-muted w-24 text-right">
                        {Math.round((z.percentMin / 100) * maxHR)} - {z.percentMax === 999 ? '∞' : Math.round((z.percentMax / 100) * maxHR)}bpm
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            
            <div className="mt-12 pt-8 border-t border-app-border/50 flex justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="bg-orange-500 hover:bg-orange-600 text-black px-8 py-3 rounded-full font-bold transition-all shadow-xl shadow-orange-500/20 active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
