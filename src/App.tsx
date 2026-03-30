import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Map as MapIcon, 
  BarChart3, 
  Upload, 
  FileJson, 
  FileSpreadsheet, 
  Zap, 
  Clock, 
  Navigation,
  ChevronRight,
  Settings,
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
  Expand
} from 'lucide-react';
import { 
  LineChart, 
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
import Papa from 'papaparse';
import { format, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { cn } from './lib/utils';
import { CyclingDataPoint, ActivitySummary, Lap, ZoneDistribution, ZoneDefinition, PMCDataPoint, HistoricalActivity, FileStatus } from './types';
import { calculateNP, calculateIF, calculateTSS, estimateCPWPrime, calculateSlope, estimateFTP, calculateLapSummary, calculateZones, getZonesFromDefinitions, DEFAULT_POWER_ZONES, DEFAULT_HR_ZONES } from './services/metrics';

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

const ComparisonView = ({ activities, pmcData, onBack }: { activities: HistoricalActivity[], pmcData: PMCDataPoint[], onBack: () => void }) => {
  const [activePMCMetric, setActivePMCMetric] = useState<'ctl' | 'atl' | 'tsb'>('ctl');
  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#eab308'];

  const metrics: { label: string; key: keyof HistoricalActivity; format: (v: any) => React.ReactNode }[] = [
    { label: 'Date', key: 'date', format: (v: string) => format(new Date(v), 'MMM d, yyyy') },
    { label: 'Duration', key: 'duration', format: (v: number) => {
      const h = Math.floor(v / 3600);
      const m = Math.floor((v % 3600) / 60);
      return `${h > 0 ? `${h}h ` : ''}${m}m`;
    }},
    { label: 'Distance', key: 'distance', format: (v: number) => v ? `${(v / 1000).toFixed(1)} km` : '-' },
    { label: 'TSS', key: 'tss', format: (v: number) => Math.round(v) },
    { label: 'NP', key: 'normalizedPower', format: (v: number) => v ? `${Math.round(v)} W` : '-' },
    { label: 'Avg Power', key: 'avgPower', format: (v: number) => v ? `${Math.round(v)} W` : '-' },
    { label: 'Max Power', key: 'maxPower', format: (v: number) => v ? `${Math.round(v)} W` : '-' },
    { label: 'IF', key: 'intensityFactor', format: (v: number) => v?.toFixed(2) || '-' },
    { label: 'Avg HR', key: 'avgHeartRate', format: (v: number) => v ? `${Math.round(v)} bpm` : '-' },
    { label: 'Max HR', key: 'maxHeartRate', format: (v: number) => v ? `${Math.round(v)} bpm` : '-' },
    { label: 'Avg Cadence', key: 'avgCadence', format: (v: number) => v ? `${Math.round(v)} rpm` : '-' },
    { label: 'Avg Speed', key: 'avgSpeed', format: (v: number) => v ? `${v.toFixed(1)} km/h` : '-' },
    { label: 'Ascent', key: 'totalAscent', format: (v: number) => v ? `${Math.round(v)} m` : '-' },
    { label: 'Work', key: 'work', format: (v: number) => v ? `${Math.round(v)} kJ` : '-' },
    { label: 'FTP', key: 'ftp', format: (v: number) => v ? `${v} W` : '-' },
  ];

  const comparisonPMCData = React.useMemo(() => {
    if (pmcData.length === 0 || activities.length === 0) return [];

    // For each activity, get the 42 days leading up to it
    const activityContexts = activities.map(activity => {
      const activityDate = activity.date;
      const index = pmcData.findIndex(p => p.date === activityDate);
      if (index === -1) return [];
      
      // Get up to 43 points (42 days leading + the day of)
      const slice = pmcData.slice(Math.max(0, index - 42), index + 1);
      return slice.map((p, i, arr) => ({
        ...p,
        daysRelative: i - (arr.length - 1)
      }));
    });

    // Merge into a single dataset for Recharts with X-axis as daysRelative (-42 to 0)
    const merged = Array.from({ length: 43 }, (_, i) => {
      const daysRelative = i - 42;
      const point: any = { daysRelative };
      activities.forEach((activity, idx) => {
        const context = activityContexts[idx];
        const match = context.find(p => p.daysRelative === daysRelative);
        if (match) {
          point[`ctl_${idx}`] = match.ctl;
          point[`atl_${idx}`] = match.atl;
          point[`tsb_${idx}`] = match.tsb;
        }
      });
      return point;
    });

    return merged.filter(p => Object.keys(p).length > 1); // Only keep points that have at least one activity's data
  }, [pmcData, activities]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-app-card rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-semibold">Activity Comparison</h3>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-app-muted font-bold">
          {activities.length} Activities Selected
        </div>
      </div>

      {/* PMC Overlay Chart */}
      <div className="bg-app-card border border-app-border rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-bold uppercase tracking-widest text-app-text/60">PMC Overlay Analysis</h4>
            <p className="text-[10px] text-app-muted">Comparing fitness trends leading up to each activity</p>
          </div>
          <div className="flex bg-app-bg p-1 rounded-xl border border-app-border">
            {(['ctl', 'atl', 'tsb'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setActivePMCMetric(m)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  activePMCMetric === m ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "text-app-muted hover:text-app-text"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comparisonPMCData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis 
                dataKey="daysRelative" 
                stroke="#525252" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => val === 0 ? 'Activity' : `${val}d`}
              />
              <YAxis 
                stroke="#525252" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '12px', fontSize: '10px' }}
                labelFormatter={(val) => val === 0 ? 'Day of Activity' : `${Math.abs(val)} days before activity`}
                formatter={(value: number, name: string) => {
                  const idx = parseInt(name.split('_')[1]);
                  return [Math.round(value), activities[idx].name];
                }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }}
                formatter={(value, entry: any) => {
                  const idx = parseInt(entry.dataKey.split('_')[1]);
                  return <span className="text-app-text/60">{activities[idx].name}</span>;
                }}
              />
              {activities.map((activity, idx) => (
                <Line
                  key={activity.id}
                  type="monotone"
                  dataKey={`${activePMCMetric}_${idx}`}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  animationDuration={1000}
                />
              ))}
              <ReferenceLine x={0} stroke="#f97316" strokeDasharray="3 3" label={{ position: 'top', value: 'Activity', fill: '#f97316', fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-4 px-6 bg-app-card/50 border-b border-app-border first:rounded-tl-2xl">
                <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Metric</span>
              </th>
              {activities.map((activity, idx) => (
                <th key={activity.id} className={cn(
                  "text-center py-4 px-6 bg-app-card/50 border-b border-app-border",
                  idx === activities.length - 1 && "rounded-tr-2xl"
                )}>
                  <div className="text-xs font-bold truncate max-w-[150px] mx-auto">{activity.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, mIdx) => (
              <tr key={metric.label} className="group hover:bg-app-card/30 transition-colors">
                <td className={cn(
                  "py-4 px-6 border-b border-app-border/50",
                  mIdx === metrics.length - 1 && "rounded-bl-2xl"
                )}>
                  <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">{metric.label}</span>
                </td>
                {activities.map((activity, aIdx) => {
                  const value = (activity as any)[metric.key];
                  return (
                    <td key={activity.id} className={cn(
                      "py-4 px-6 border-b border-app-border/50 text-center",
                      mIdx === metrics.length - 1 && aIdx === activities.length - 1 && "rounded-br-2xl"
                    )}>
                      <span className="text-sm font-medium">
                        {value !== undefined && value !== null ? metric.format(value) : '-'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

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
  const [ftp, setFtp] = useState(250);
  const [estimatedFtp, setEstimatedFtp] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileStatus[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ active: boolean; type: string; progress: number }>({
    active: false,
    type: '',
    progress: 0
  });
  const [cpWPrime, setCpWPrime] = useState<{ cp: number; wPrime: number } | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<string[]>(['power']);
  const [activeTab, setActiveTab] = useState<'metrics' | 'laps' | 'zones' | 'history' | 'compare'>('metrics');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoricalActivity[]>(() => {
    const saved = localStorage.getItem('veloanalytics_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('veloanalytics_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  React.useEffect(() => {
    localStorage.setItem('veloanalytics_history', JSON.stringify(history));
  }, [history]);

  React.useEffect(() => {
    localStorage.setItem('veloanalytics_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const addToHistory = (activity?: ActivitySummary | React.MouseEvent) => {
    // If called from onClick, activity will be the event object.
    // We only want to use it if it's a real ActivitySummary.
    const target = (activity && 'startTime' in activity) ? activity : summary;
    if (!target || !target.startTime || isNaN(target.startTime.getTime())) return;
    const dateStr = target.startTime.toISOString().split('T')[0];
    const newActivity: HistoricalActivity = {
      id: `${dateStr}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr,
      name: target.name,
      tss: target.tss || 0,
      duration: target.duration,
      distance: target.distance,
      avgPower: target.avgPower,
      maxPower: target.maxPower,
      normalizedPower: target.normalizedPower,
      intensityFactor: target.intensityFactor,
      avgHeartRate: target.avgHeartRate,
      maxHeartRate: target.maxHeartRate,
      avgCadence: target.avgCadence,
      avgSpeed: target.avgSpeed,
      totalAscent: target.totalAscent,
      work: target.work,
      ftp: ftp
    };
    setHistory(prev => [...prev, newActivity]);
  };

  const removeFromHistory = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const exportHistoryJSON = async () => {
    if (history.length === 0) return;
    setExportStatus({ active: true, type: 'History (JSON)', progress: 0 });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setExportStatus(prev => ({ ...prev, progress: 50 }));
    
    const jsonString = JSON.stringify(history, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veloanalytics_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setExportStatus(prev => ({ ...prev, progress: 100 }));
    setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
  };

  const exportHistoryCSV = async () => {
    if (history.length === 0) return;
    setExportStatus({ active: true, type: 'History (CSV)', progress: 0 });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const csvData = history.map(h => ({
      Date: h.date,
      Name: h.name,
      'TSS': Math.round(h.tss),
      'Duration (s)': h.duration,
      'Duration (formatted)': formatDuration(h.duration)
    }));
    
    setExportStatus(prev => ({ ...prev, progress: 60 }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veloanalytics_history_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setExportStatus(prev => ({ ...prev, progress: 100 }));
    setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
  };

  const exportBatchJSON = async () => {
    const completed = uploadQueue.filter(item => item.status === 'completed' && item.summary);
    if (completed.length === 0) return;
    
    setExportStatus({ active: true, type: 'Batch (JSON)', progress: 0 });
    
    const batchData = completed.map(item => item.summary);
    setExportStatus(prev => ({ ...prev, progress: 50 }));
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const jsonString = JSON.stringify(batchData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veloanalytics_batch_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setExportStatus(prev => ({ ...prev, progress: 100 }));
    setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
  };

  const exportBatchCSV = async () => {
    const completed = uploadQueue.filter(item => item.status === 'completed' && item.summary);
    if (completed.length === 0) return;
    
    setExportStatus({ active: true, type: 'Batch (CSV)', progress: 0 });
    
    const csvData = completed.map(item => ({
      Name: item.summary!.name,
      Date: item.summary!.startTime.toISOString(),
      'Duration (s)': item.summary!.duration,
      'Distance (km)': (item.summary!.distance / 1000).toFixed(2),
      'Avg Power (W)': Math.round(item.summary!.avgPower || 0),
      'NP (W)': Math.round(item.summary!.normalizedPower || 0),
      'IF': (item.summary!.intensityFactor || 0).toFixed(2),
      'TSS': Math.round(item.summary!.tss || 0),
      'Avg HR (bpm)': Math.round(item.summary!.avgHeartRate || 0),
      'Avg Cadence (rpm)': Math.round(item.summary!.avgCadence || 0),
      'Elevation Gain (m)': Math.round(item.summary!.totalAscent || 0)
    }));
    
    setExportStatus(prev => ({ ...prev, progress: 60 }));
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veloanalytics_batch_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setExportStatus(prev => ({ ...prev, progress: 100 }));
    setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
  };

  const pmcData = React.useMemo(() => {
    if (history.length === 0) return [];
    
    const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const startDate = subDays(new Date(sortedHistory[0].date), 42); // Start 42 days before first activity
    const endDate = new Date();
    
    const data: PMCDataPoint[] = [];
    let currentCTL = 0;
    let currentATL = 0;
    
    const curr = new Date(startDate);
    while (curr <= endDate) {
      if (isNaN(curr.getTime())) {
        curr.setDate(curr.getDate() + 1);
        continue;
      }
      const dateStr = curr.toISOString().split('T')[0];
      const dayActivities = sortedHistory.filter(h => h.date === dateStr);
      const dayTSS = dayActivities.reduce((sum, h) => sum + h.tss, 0);
      
      currentCTL = currentCTL + (dayTSS - currentCTL) / 42;
      currentATL = currentATL + (dayTSS - currentATL) / 7;
      
      data.push({
        date: dateStr,
        tss: dayTSS,
        ctl: currentCTL,
        atl: currentATL,
        tsb: currentCTL - currentATL
      });
      
      curr.setDate(curr.getDate() + 1);
    }
    
    return data;
  }, [history]);

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
  const [maxHR, setMaxHR] = useState(190);
  const [powerZoneDefinitions, setPowerZoneDefinitions] = useState<ZoneDefinition[]>(DEFAULT_POWER_ZONES);
  const [hrZoneDefinitions, setHrZoneDefinitions] = useState<ZoneDefinition[]>(DEFAULT_HR_ZONES);
  const [showSettings, setShowSettings] = useState(false);
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
    
    const np = calculateNP(data);
    const ifFactor = np ? calculateIF(np, ftp) : undefined;
    const tss = (np && ifFactor) ? calculateTSS(duration, np, ifFactor, ftp) : undefined;

    const pZones = calculateZones(powers, getZonesFromDefinitions(powerZoneDefinitions, ftp));
    const hZones = heartRates.length > 0 ? calculateZones(heartRates, getZonesFromDefinitions(hrZoneDefinitions, maxHR)) : undefined;

    setSummary(prev => prev ? ({
      ...prev,
      normalizedPower: np,
      intensityFactor: ifFactor,
      tss,
      powerZones: pZones,
      hrZones: hZones
    }) : null);
  }, [ftp, maxHR, powerZoneDefinitions, hrZoneDefinitions]);

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
    
    const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;
    const maxPower = Math.max(...powers);
    const np = calculateNP(points);
    const duration = (points[points.length - 1].timestamp.getTime() - points[0].timestamp.getTime()) / 1000;
    const distance = points[points.length - 1].distance || 0;
    
    const ifFactor = np ? calculateIF(np, ftp) : undefined;
    const tss = (np && ifFactor) ? calculateTSS(duration, np, ifFactor, ftp) : undefined;

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
        const lapPoints = points.filter(p => 
          p.timestamp >= new Date(l.start_time) && 
          p.timestamp <= new Date(new Date(l.start_time).getTime() + l.total_elapsed_time * 1000)
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
    const pZones = calculateZones(powers, getZonesFromDefinitions(powerZoneDefinitions, ftp));
    const hZones = heartRates.length > 0 ? calculateZones(heartRates, getZonesFromDefinitions(hrZoneDefinitions, maxHR)) : undefined;

    const newSummary: ActivitySummary = {
      name: fileName.replace(/\.[^/.]+$/, ""),
      startTime: points[0].timestamp,
      duration,
      distance,
      avgPower,
      maxPower,
      normalizedPower: np,
      intensityFactor: ifFactor,
      tss,
      avgHeartRate: heartRates.length > 0 ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : undefined,
      maxHeartRate: heartRates.length > 0 ? Math.max(...heartRates) : undefined,
      avgCadence: cadences.length > 0 ? cadences.reduce((a, b) => a + b, 0) / cadences.length : undefined,
      maxCadence: cadences.length > 0 ? Math.max(...cadences) : undefined,
      avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : undefined,
      maxSpeed: speeds.length > 0 ? Math.max(...speeds) : undefined,
      totalAscent,
      laps,
      powerZones: pZones,
      hrZones: hZones
    };

    setSummary(newSummary);
    setData(points);
    setCpWPrime(estimateCPWPrime(points));
    setEstimatedFtp(estimateFTP(points));

    return newSummary;
  }, [ftp, maxHR, powerZoneDefinitions, hrZoneDefinitions]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newFiles = Array.from(files).map(f => ({
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
          
          if (file.name.endsWith('.fit')) {
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
                  const points: CyclingDataPoint[] = fitData.records.map((r: any) => ({
                    timestamp: new Date(r.timestamp),
                    power: r.power,
                    heartRate: r.heart_rate,
                    cadence: r.cadence,
                    speed: r.speed,
                    distance: r.distance,
                    altitude: r.altitude,
                    latitude: r.position_lat,
                    longitude: r.position_long,
                  }));
                  setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 60 } : item));
                  const summary = processData(points, file.name, fitData.laps);
                  resolve({ summary, points });
                }
              });
            };
            reader.readAsArrayBuffer(file);
          } else if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
              header: true,
              dynamicTyping: true,
              complete: (results) => {
                const points: CyclingDataPoint[] = results.data.map((r: any) => ({
                  timestamp: new Date(r.timestamp || r.Time || Date.now()),
                  power: r.power || r.Power,
                  heartRate: r.heartRate || r.HR,
                  cadence: r.cadence || r.Cadence,
                  speed: r.speed || r.Speed,
                  distance: r.distance || r.Distance,
                  altitude: r.altitude || r.Altitude,
                  latitude: r.lat || r.Latitude,
                  longitude: r.lon || r.Longitude,
                })).filter(p => !isNaN(p.timestamp.getTime()));
                setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 60 } : item));
                const summary = processData(points, file.name);
                resolve({ summary, points });
              },
              error: (err) => reject(err)
            });
          } else if (file.name.endsWith('.json')) {
            reader.onload = (e) => {
              try {
                const json = JSON.parse(e.target?.result as string);
                const samples = json.RIDE?.SAMPLES || [];
                const startTime = new Date(json.RIDE?.STARTTIME || Date.now());
                const points: CyclingDataPoint[] = samples.map((s: any) => ({
                  timestamp: new Date(startTime.getTime() + (s.SECONDS || 0) * 1000),
                  power: s.WATTS,
                  heartRate: s.HR,
                  cadence: s.CAD,
                  speed: s.KPH,
                  distance: s.KM ? s.KM * 1000 : undefined,
                  altitude: s.ALT,
                  latitude: s.LAT,
                  longitude: s.LON,
                }));
                setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, progress: 60 } : item));
                const summary = processData(points, file.name);
                resolve({ summary, points });
              } catch (err) {
                reject(err);
              }
            };
            reader.readAsText(file);
          } else {
            reject(new Error("Unsupported file format"));
          }
        });

        if (result.summary) {
          addToHistory(result.summary);
          setSummary(result.summary);
          setData(result.points);
          setOriginalFile(file);
          setUploadQueue(prev => prev.map(item => 
            item.id === id ? { ...item, status: 'completed', progress: 100, summary: result.summary!, data: result.points } : item
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
    if (!originalFile) return;
    setExportStatus({ active: true, type: 'Original', progress: 0 });
    
    // Simulate a bit of prep time for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    setExportStatus(prev => ({ ...prev, progress: 50 }));
    
    const url = URL.createObjectURL(originalFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setExportStatus(prev => ({ ...prev, progress: 100 }));
    setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
  };

  const exportGPX = async () => {
    if (data.length === 0) return;
    setExportStatus({ active: true, type: 'GPX', progress: 0 });
    
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VeloAnalytics Pro" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
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
          ${p.power !== undefined ? `<power>${p.power}</power>` : ''}
          ${p.heartRate !== undefined ? `<hr>${p.heartRate}</hr>` : ''}
          ${p.cadence !== undefined ? `<cadence>${p.cadence}</cadence>` : ''}
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

  const exportJSON = async () => {
    if (!summary) return;
    setExportStatus({ active: true, type: 'JSON', progress: 0 });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    setExportStatus(prev => ({ ...prev, progress: 50 }));
    
    const jsonString = JSON.stringify(summary, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.name || 'activity'}_summary.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setExportStatus(prev => ({ ...prev, progress: 100 }));
    setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
  };

  const exportCSV = async () => {
    if (!summary) return;
    setExportStatus({ active: true, type: 'CSV', progress: 0 });
    
    await new Promise(resolve => setTimeout(resolve, 300));
    setExportStatus(prev => ({ ...prev, progress: 30 }));
    
    const summaryData = [
      ['Metric', 'Value', 'Unit'],
      ['Activity Name', summary.name, ''],
      ['Start Time', summary.startTime instanceof Date ? summary.startTime.toISOString() : '', ''],
      ['Duration', summary.duration, 's'],
      ['Distance', (summary.distance / 1000).toFixed(2), 'km'],
      ['Avg Power', Math.round(summary.avgPower || 0), 'W'],
      ['Max Power', Math.round(summary.maxPower || 0), 'W'],
      ['Normalized Power', Math.round(summary.normalizedPower || 0), 'W'],
      ['Intensity Factor', (summary.intensityFactor || 0).toFixed(2), ''],
      ['TSS', Math.round(summary.tss || 0), ''],
      ['Avg Heart Rate', Math.round(summary.avgHeartRate || 0), 'bpm'],
      ['Max Heart Rate', Math.round(summary.maxHeartRate || 0), 'bpm'],
      ['Avg Cadence', Math.round(summary.avgCadence || 0), 'rpm'],
      ['Avg Speed', (summary.avgSpeed || 0).toFixed(1), 'km/h'],
      ['Total Ascent', Math.round(summary.totalAscent || 0), 'm'],
    ];

    let csv = Papa.unparse(summaryData);
    setExportStatus(prev => ({ ...prev, progress: 60 }));

    if (summary.laps && summary.laps.length > 0) {
      csv += "\n\nLaps\n";
      csv += Papa.unparse(summary.laps.map(l => ({
        Lap: l.id,
        'Duration (s)': l.duration,
        'Distance (m)': l.distance.toFixed(0),
        'Avg Power (W)': Math.round(l.avgPower || 0),
        'Max Power (W)': Math.round(l.maxPower || 0),
        'Avg HR (bpm)': Math.round(l.avgHeartRate || 0),
        'Avg Cadence (rpm)': Math.round(l.avgCadence || 0),
        'Avg Speed (km/h)': (l.avgSpeed || 0).toFixed(1)
      })));
    }

    setExportStatus(prev => ({ ...prev, progress: 80 }));

    if (summary.powerZones && summary.powerZones.length > 0) {
      csv += "\n\nPower Zones\n";
      csv += Papa.unparse(summary.powerZones.map(z => ({
        Zone: z.name,
        'Seconds': z.seconds,
        'Percentage (%)': z.percentage.toFixed(1)
      })));
    }

    if (summary.hrZones && summary.hrZones.length > 0) {
      csv += "\n\nHeart Rate Zones\n";
      csv += Papa.unparse(summary.hrZones.map(z => ({
        Zone: z.name,
        'Seconds': z.seconds,
        'Percentage (%)': z.percentage.toFixed(1)
      })));
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.name || 'activity'}_summary.csv`;
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
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Activity className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">VELO<span className="text-orange-500">ANALYTICS</span></h1>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            {estimatedFtp && estimatedFtp !== ftp && (
              <button 
                onClick={() => setFtp(estimatedFtp)}
                className="hidden md:flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-full border border-orange-500/20 transition-all group"
              >
                <Zap className="w-3 h-3 text-orange-500 animate-pulse" />
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                  Update FTP to {estimatedFtp}W?
                </span>
                <ChevronRight className="w-3 h-3 text-orange-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
            <div className="flex items-center gap-2 bg-app-card border border-app-border px-3 py-1.5 rounded-full">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-medium text-app-muted">FTP:</span>
              <input 
                type="number" 
                value={ftp} 
                onChange={(e) => setFtp(parseInt(e.target.value) || 0)}
                className="bg-transparent w-12 text-xs font-bold focus:outline-none text-orange-400"
              />
              <span className="text-[10px] text-app-muted uppercase tracking-widest">Watts</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowUploadView(!showUploadView)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all",
                  showUploadView ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "bg-app-card text-app-muted border border-app-border hover:text-app-text"
                )}
              >
                <Upload className="w-4 h-4" />
                {showUploadView ? 'Cancel Upload' : 'Upload'}
              </button>
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 hover:bg-app-card rounded-full transition-colors border border-transparent hover:border-app-border"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-orange-400" />
                ) : (
                  <Moon className="w-5 h-5 text-app-muted" />
                )}
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-app-card rounded-full transition-colors border border-transparent hover:border-app-border"
              >
                <Settings className="w-5 h-5 text-app-muted" />
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
              Support for Garmin <span className="text-app-text/60">.fit</span>, Golden Cheetah <span className="text-app-text/60">.json</span>, and standard <span className="text-app-text/60">.csv</span> power data.
            </p>
            <label className="bg-orange-500 hover:bg-orange-600 text-black px-8 py-3 rounded-full font-bold transition-all cursor-pointer shadow-xl shadow-orange-500/20 active:scale-95">
              Select Files
              <input type="file" className="hidden" accept=".fit,.csv,.json" multiple onChange={(e) => handleFileUpload(e.target.files)} />
            </label>
            
            {uploadQueue.length > 0 && (
              <div className="mt-12 w-full max-w-2xl bg-app-card border border-app-border rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="px-6 py-4 border-b border-app-border flex items-center justify-between bg-app-card/50">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Processing Queue</h3>
                    {uploadQueue.some(item => item.status === 'completed') && (
                      <div className="flex gap-2">
                        <button 
                          onClick={exportBatchJSON}
                          className="flex items-center gap-1.5 px-2 py-1 bg-app-bg border border-app-border rounded-lg text-[8px] font-bold uppercase tracking-widest text-app-muted hover:text-app-text transition-all"
                          title="Export all completed to JSON"
                        >
                          <FileJson className="w-3 h-3 text-purple-500" />
                          Batch JSON
                        </button>
                        <button 
                          onClick={exportBatchCSV}
                          className="flex items-center gap-1.5 px-2 py-1 bg-app-bg border border-app-border rounded-lg text-[8px] font-bold uppercase tracking-widest text-app-muted hover:text-app-text transition-all"
                          title="Export all completed to CSV"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-green-500" />
                          Batch CSV
                        </button>
                      </div>
                    )}
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
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-12 flex gap-8 opacity-40">
              <div className="flex items-center gap-2"><FileJson className="w-4 h-4" /> <span className="text-xs uppercase tracking-widest">JSON</span></div>
              <div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> <span className="text-xs uppercase tracking-widest">CSV</span></div>
              <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> <span className="text-xs uppercase tracking-widest">FIT</span></div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {summary ? (
                <>
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
                      <span className="text-4xl font-light tracking-tighter">{Math.round(summary.normalizedPower || 0)}</span>
                      <span className="text-xs text-app-muted font-medium">W (NP)</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                      Avg: {Math.round(summary.avgPower || 0)}W | Max: {Math.round(summary.maxPower || 0)}W
                    </div>
                  </div>

                  <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Training Stress</span>
                      <Activity className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light tracking-tighter">{Math.round(summary.tss || 0)}</span>
                      <span className="text-xs text-app-muted font-medium">TSS</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                      IF: {(summary.intensityFactor || 0).toFixed(2)}
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
                </>
              ) : (
                <div className="lg:col-span-3 bg-app-card border border-app-border rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Welcome Back</h3>
                  <p className="text-app-muted text-sm max-w-md">
                    Select an activity from your history below to view detailed metrics, or upload a new file to get started.
                  </p>
                </div>
              )}

              {history.length > 0 && currentPMC && (
                <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Performance (PMC)</span>
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-light tracking-tighter">{Math.round(currentPMC.ctl)}</span>
                    <span className="text-xs text-app-muted font-medium">CTL (Fitness)</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
                    ATL: {Math.round(currentPMC.atl)} | TSB: {Math.round(currentPMC.tsb)}
                  </div>
                </div>
              )}

              {summary && (
                <div className="bg-app-card border border-app-border rounded-2xl p-6 hover:bg-app-card/80 transition-colors flex flex-col justify-center items-center gap-4">
                  <button 
                    onClick={addToHistory}
                    disabled={history.some(h => isSameDay(new Date(h.date), summary.startTime))}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-app-border disabled:text-app-muted text-black py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    {history.some(h => isSameDay(new Date(h.date), summary.startTime)) ? 'In History' : 'Add to PMC'}
                  </button>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button onClick={exportGPX} className="bg-app-card/50 hover:bg-app-card text-app-muted py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-app-border flex items-center justify-center gap-2">
                      <Download className="w-3 h-3" /> GPX
                    </button>
                    <button onClick={exportOriginal} className="bg-app-card/50 hover:bg-app-card text-app-muted py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-app-border flex items-center justify-center gap-2">
                      <FileDown className="w-3 h-3" /> Original
                    </button>
                    <button onClick={exportJSON} className="bg-app-card/50 hover:bg-app-card text-app-muted py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-app-border flex items-center justify-center gap-2">
                      <FileJson className="w-3 h-3" /> JSON
                    </button>
                    <button onClick={exportCSV} className="bg-app-card/50 hover:bg-app-card text-app-muted py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-app-border flex items-center justify-center gap-2">
                      <FileSpreadsheet className="w-3 h-3" /> CSV
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Grid */}
            <div className={cn(
              "grid grid-cols-1 gap-8",
              isMapExpanded ? "lg:grid-cols-1" : "lg:grid-cols-3"
            )}>
              {/* Power Chart */}
              <div className={cn(
                "space-y-8",
                isMapExpanded ? "order-2" : "lg:col-span-2 order-1"
              )}>
                <div className="bg-app-card border border-app-border rounded-3xl p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setActiveTab('metrics')}
                        className={cn(
                          "text-sm font-bold uppercase tracking-[0.2em] transition-all",
                          activeTab === 'metrics' ? "text-orange-500" : "text-app-muted hover:text-app-text"
                        )}
                      >
                        Metrics
                      </button>
                      <button 
                        onClick={() => setActiveTab('laps')}
                        className={cn(
                          "text-sm font-bold uppercase tracking-[0.2em] transition-all",
                          activeTab === 'laps' ? "text-orange-500" : "text-app-muted hover:text-app-text"
                        )}
                      >
                        Laps
                      </button>
                      <button 
                        onClick={() => setActiveTab('zones')}
                        className={cn(
                          "text-sm font-bold uppercase tracking-[0.2em] transition-all",
                          activeTab === 'zones' ? "text-orange-500" : "text-app-muted hover:text-app-text"
                        )}
                      >
                        Zones
                      </button>
                      <button 
                        onClick={() => setActiveTab('history')}
                        className={cn(
                          "text-sm font-bold uppercase tracking-[0.2em] transition-all",
                          activeTab === 'history' ? "text-orange-500" : "text-app-muted hover:text-app-text"
                        )}
                      >
                        History
                      </button>
                    </div>
                    {activeTab === 'metrics' && (
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
                                ? "bg-app-text text-app-bg border-app-text" 
                                : "bg-app-card text-app-muted border-app-border hover:bg-app-card/80"
                            )}
                          >
                            {config.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {activeTab === 'metrics' ? (
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
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                            itemStyle={{ color: '#fff' }}
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
                          {activeMetrics[0] === 'power' && getZonesFromDefinitions(powerZoneDefinitions, ftp).map((z) => (
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
                  ) : activeTab === 'laps' ? (
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : activeTab === 'zones' ? (
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
                  ) : activeTab === 'history' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <h3 className="text-[10px] uppercase tracking-[0.2em] text-app-muted font-bold">Historical Activities</h3>
                          {selectedHistoryIds.length >= 2 && (
                            <button 
                              onClick={() => setActiveTab('compare')}
                              className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 animate-in fade-in zoom-in duration-300"
                            >
                              Compare {selectedHistoryIds.length}
                            </button>
                          )}
                        </div>
                        {history.length > 0 && (
                          <div className="flex gap-2">
                            <button 
                              onClick={exportHistoryJSON}
                              className="flex items-center gap-1.5 px-3 py-1 bg-app-card border border-app-border rounded-lg text-[8px] font-bold uppercase tracking-widest text-app-muted hover:text-app-text transition-all"
                            >
                              <FileJson className="w-3 h-3 text-purple-500" />
                              JSON
                            </button>
                            <button 
                              onClick={exportHistoryCSV}
                              className="flex items-center gap-1.5 px-3 py-1 bg-app-card border border-app-border rounded-lg text-[8px] font-bold uppercase tracking-widest text-app-muted hover:text-app-text transition-all"
                            >
                              <FileSpreadsheet className="w-3 h-3 text-green-500" />
                              CSV
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-2">
                        {history.length > 0 ? (
                          history.map(h => (
                            <div 
                              key={h.id} 
                              onClick={() => {
                                setSelectedHistoryIds(prev => 
                                  prev.includes(h.id) ? prev.filter(id => id !== h.id) : [...prev, h.id]
                                );
                              }}
                              className={cn(
                                "bg-app-card border rounded-xl p-4 flex items-center justify-between group cursor-pointer transition-all",
                                selectedHistoryIds.includes(h.id) ? "border-orange-500 ring-1 ring-orange-500" : "border-app-border hover:border-app-border/80"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                  selectedHistoryIds.includes(h.id) ? "bg-orange-500 border-orange-500" : "border-app-border bg-app-bg"
                                )}>
                                  {selectedHistoryIds.includes(h.id) && <Check className="w-3 h-3 text-black" />}
                                </div>
                                <div>
                                  <div className="text-xs font-bold">{h.name}</div>
                                  <div className="text-[10px] text-app-muted">{format(new Date(h.date), 'MMM d, yyyy')} • {formatDuration(h.duration)}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-xs font-bold text-orange-500">{Math.round(h.tss)}</div>
                                  <div className="text-[8px] text-app-muted uppercase tracking-widest">TSS</div>
                                </div>
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
                          ))
                        ) : (
                          <div className="col-span-full py-12 flex flex-col items-center justify-center text-app-muted/30 border border-dashed border-app-border rounded-2xl">
                            <History className="w-8 h-8 mb-2" />
                            <span className="text-[10px] uppercase tracking-widest">No activities in history</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <ComparisonView 
                      activities={history.filter(h => selectedHistoryIds.includes(h.id))}
                      pmcData={pmcData}
                      onBack={() => setActiveTab('history')}
                    />
                  )}
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
                        <span className="text-5xl font-light tracking-tighter">{( (cpWPrime?.wPrime || 0) / 1000).toFixed(1)}</span>
                        <span className="text-sm text-app-muted">kJ</span>
                      </div>
                      <p className="text-[10px] text-app-muted/50 mt-2 leading-relaxed">
                        W' is your anaerobic work capacity, the finite amount of energy available above Critical Power.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Training Peaks Analysis Section */}
                {history.length > 0 && (
                  <div className="bg-app-card border border-app-border rounded-3xl p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/10 rounded-2xl">
                          <TrendingUp className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">Training Peaks Analysis</h3>
                          <p className="text-[10px] text-app-muted uppercase tracking-widest mt-1">Performance Management Chart (PMC)</p>
                        </div>
                      </div>
                      <div className="flex gap-8">
                        <div className="text-center">
                          <div className="text-3xl font-light tracking-tighter text-blue-500">{Math.round(currentPMC?.ctl || 0)}</div>
                          <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">Fitness (CTL)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-light tracking-tighter text-red-500">{Math.round(currentPMC?.atl || 0)}</div>
                          <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">Fatigue (ATL)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-light tracking-tighter text-green-500">{Math.round(currentPMC?.tsb || 0)}</div>
                          <div className="text-[8px] text-app-muted uppercase tracking-widest font-bold">Form (TSB)</div>
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
                            tickFormatter={(str) => format(new Date(str), 'MMM d')}
                          />
                          <YAxis yAxisId="left" stroke="var(--app-muted)" fontSize={10} />
                          <YAxis yAxisId="right" orientation="right" stroke="var(--app-muted)" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: '12px', fontSize: '12px', color: 'var(--app-text)' }}
                            labelStyle={{ color: 'var(--app-muted)', marginBottom: '4px' }}
                            itemStyle={{ color: 'var(--app-text)' }}
                          />
                          <Legend verticalAlign="top" height={36}/>
                          <Bar yAxisId="left" dataKey="tss" fill="#f97316" opacity={0.3} name="TSS" />
                          <Line yAxisId="left" type="monotone" dataKey="ctl" stroke="#3b82f6" strokeWidth={2} dot={false} name="Fitness (CTL)" />
                          <Line yAxisId="left" type="monotone" dataKey="atl" stroke="#ef4444" strokeWidth={2} dot={false} name="Fatigue (ATL)" />
                          <Area yAxisId="right" type="monotone" dataKey="tsb" fill="#22c55e" stroke="#22c55e" fillOpacity={0.1} name="Form (TSB)" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-app-border/50">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500">CTL (Fitness)</h4>
                        <p className="text-[10px] text-app-muted leading-relaxed">
                          Chronic Training Load is a 42-day weighted average of your daily TSS. It represents your long-term training load and overall fitness level.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-500">ATL (Fatigue)</h4>
                        <p className="text-[10px] text-app-muted leading-relaxed">
                          Acute Training Load is a 7-day weighted average of your daily TSS. It represents your short-term training load and current level of fatigue.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-green-500">TSB (Form)</h4>
                        <p className="text-[10px] text-app-muted leading-relaxed">
                          Training Stress Balance (CTL - ATL) represents your current form or freshness. A positive TSB suggests you are fresh and ready to perform.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar: Map & Details */}
              <div className={cn(
                "space-y-8",
                isMapExpanded ? "order-1" : "order-2"
              )}>
                {summary ? (
                  <>
                    <div 
                      ref={mapContainerRef}
                      className={cn(
                        "bg-app-card border border-app-border rounded-3xl p-4 relative overflow-hidden group transition-all duration-500",
                        isMapExpanded ? "h-[900px]" : "h-[700px]"
                      )}
                    >
                      <div className="absolute top-6 right-6 z-10 flex flex-col items-end gap-3">
                        <div className="flex gap-2">
                          <div className="bg-app-bg/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-app-border flex items-center gap-2">
                            <MapIcon className="w-3 h-3 text-orange-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Course Map</span>
                          </div>
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
                                className="absolute top-24 left-4 z-50 bg-black/80 hover:bg-black text-white p-2 rounded-full border border-white/10 transition-all"
                                title="Clear Highlight"
                              >
                                <CheckCircle2 className="w-4 h-4 text-orange-500" />
                              </button>
                            )}
                            <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2">
                              <div className="flex bg-black/80 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                                {(['roadmap', 'terrain'] as const).map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => setMapType(t as any)}
                                    className={cn(
                                      "px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all",
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
                                    className="absolute top-24 left-4 z-50 bg-black/80 hover:bg-black text-white p-2 rounded-full border border-white/10 transition-all"
                                    title="Clear Highlight"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-orange-500" />
                                  </button>
                                )}
                                <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2">
                                  <div className="flex bg-black/80 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                                    {(['roadmap', 'satellite', 'terrain'] as const).map((t) => (
                                      <button
                                        key={t}
                                        onClick={() => setMapType(t)}
                                        className={cn(
                                          "px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all",
                                          mapType === t ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                        )}
                                      >
                                        {t}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex bg-black/80 p-1 rounded-xl border border-white/10 backdrop-blur-md gap-1">
                                    <button
                                      onClick={() => setShowTraffic(!showTraffic)}
                                      className={cn(
                                        "p-2 rounded-lg transition-all",
                                        showTraffic ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                      )}
                                      title="Toggle Traffic"
                                    >
                                      <TrafficCone className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setShowBicycling(!showBicycling)}
                                      className={cn(
                                        "p-2 rounded-lg transition-all",
                                        showBicycling ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                      )}
                                      title="Toggle Bicycling"
                                    >
                                      <Bike className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setShowTransit(!showTransit)}
                                      className={cn(
                                        "p-2 rounded-lg transition-all",
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
                                <div className="absolute bottom-4 right-4 z-10 flex gap-1 bg-app-bg/80 backdrop-blur-md p-1 rounded-lg border border-app-border">
                                  {(['roadmap', 'satellite', 'terrain'] as const).map((type) => (
                                    <button
                                      key={type}
                                      onClick={() => setMapType(type)}
                                      className={cn(
                                        "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest transition-all",
                                        mapType === type ? "bg-app-text/20 text-app-text" : "text-app-muted hover:text-app-text/60"
                                      )}
                                    >
                                      {type}
                                    </button>
                                  ))}
                                </div>
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

                    <div className="bg-app-card border border-app-border rounded-3xl p-8">
                      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-app-text/60 mb-6">Activity Details</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                          <span className="text-xs text-app-muted">Activity Name</span>
                          <span className="text-xs font-medium">{summary.name}</span>
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
                        {estimatedFtp && (
                          <div className="flex justify-between items-center py-3 border-b border-app-border/50">
                            <span className="text-xs text-app-muted font-bold text-orange-500/60">Est. FTP (20m)</span>
                            <span className="text-xs font-bold text-orange-500">
                              {estimatedFtp} W
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
                          className="flex items-center justify-center gap-2 py-3 bg-app-card/50 hover:bg-app-card border border-app-border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <FileDown className="w-3 h-3 text-orange-500" />
                          Original
                        </button>
                        <button 
                          onClick={exportGPX}
                          className="flex items-center justify-center gap-2 py-3 bg-app-card/50 hover:bg-app-card border border-app-border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <Download className="w-3 h-3 text-blue-500" />
                          GPX
                        </button>
                        <button 
                          onClick={exportJSON}
                          className="flex items-center justify-center gap-2 py-3 bg-app-card/50 hover:bg-app-card border border-app-border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <FileJson className="w-3 h-3 text-purple-500" />
                          JSON
                        </button>
                        <button 
                          onClick={exportCSV}
                          className="flex items-center justify-center gap-2 py-3 bg-app-card/50 hover:bg-app-card border border-app-border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <FileSpreadsheet className="w-3 h-3 text-green-500" />
                          CSV
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-app-card border border-app-border rounded-3xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center mb-6 border border-app-border">
                      <Activity className="w-8 h-8 text-app-muted/40" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-app-text/60 mb-2">No Activity Selected</h3>
                    <p className="text-xs text-app-muted max-w-[200px] leading-relaxed">
                      Select an activity from the history tab or upload a new file to see details.
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => { setSummary(null); setData([]); setOriginalFile(null); }}
                    className="w-full mt-3 py-3 bg-app-card/50 hover:bg-app-card border border-app-border rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                  >
                    Analyze New File
                  </button>
                </div>
              </div>
            )}
          </main>

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
                    <label className="text-xs text-app-text/60">Functional Threshold Power (FTP)</label>
                    <div className="flex items-center gap-3 bg-app-card border border-app-border rounded-xl px-4 py-3">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <input 
                        type="number" 
                        value={ftp} 
                        onChange={(e) => setFtp(parseInt(e.target.value) || 0)}
                        className="bg-transparent w-full text-sm font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-app-muted uppercase tracking-widest">Watts</span>
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
                        {Math.round((z.percentMin / 100) * ftp)} - {z.percentMax === 999 ? '∞' : Math.round((z.percentMax / 100) * ftp)}W
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
