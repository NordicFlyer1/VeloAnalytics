import React, { useState, useCallback, useRef, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutList, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

import { cn } from './lib/utils';

import { Header } from './components/layout/Header';
import { MetricAnalysis } from './components/analysis/MetricAnalysis';
import { ActivityDetails } from './components/analysis/ActivityDetails';
import { WPrimeAnalysis } from './components/analysis/WPrimeAnalysis';
import { PowerCurveAnalysis } from './components/analysis/PowerCurveAnalysis';
import { ZonesAnalysis } from './components/analysis/ZonesAnalysis';
import { LapBreakdown } from './components/analysis/LapBreakdown';
import { PmcAnalysis } from './components/analysis/PmcAnalysis';
import { VolumeTrendsAnalysis } from './components/analysis/VolumeTrendsAnalysis';
import { TrainingLoadAnalysis } from './components/analysis/TrainingLoadAnalysis';
import { AboutModal } from './components/modals/AboutModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { UploadView } from './components/views/UploadView';
import { EmptyHistoryView } from './components/views/EmptyHistoryView';
import { SectionHeader } from './components/ui/SectionHeader';
import { SummaryCards } from './components/analysis/SummaryCards';
import { HistorySidebar } from './components/layout/HistorySidebar';

const ActivityMap = React.lazy(() => import('./components/map/ActivityMap').then(m => ({ default: m.ActivityMap })));

import { CyclingDataPoint, WeatherData } from './types';
import { useMetricsWorker } from './hooks/useMetricsWorker';
import { useSharedSettings } from './hooks/useSharedSettings';
import { useActivityHistory } from './hooks/useActivityHistory';
import { useDashboardState } from './hooks/useDashboardState';
import { useDataSmoothing } from './hooks/useDataSmoothing';
import { useExportActions } from './hooks/useExportActions';
import { useFileUploader } from './hooks/useFileUploader';
import { useDataRecalculator } from './hooks/useDataRecalculator';

import { ActivityOverview } from './components/analysis/ActivityOverview';
import { ExportProgress } from './components/ui/ExportProgress';

import { 
  calculateLapSummary, 
  getZonesFromDefinitions, 
} from './services/metrics';

// Fix for Leaflet icons in React
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function App() {
  const workers = useMetricsWorker();
  const settings = useSharedSettings();
  
  const {
    history,
    data, setData,
    summary, setSummary,
    estimatedCp, setEstimatedCp,
    cpWPrime, setCpWPrime,
    originalFile, setOriginalFile,
    currentActivityId, setCurrentActivityId,
    pmcData,
    pmcDateRange, setPmcDateRange,
    pmcFocus, setPmcFocus,
    currentPMC,
    trainingLoadRange, setTrainingLoadRange,
    volumeTrendsRange, setVolumeTrendsRange,
    trainingLoadData,
    volumeTrendsData,
    allTimeBestCurve,
    rolling90DayBestCurve,
    addToHistory,
    loadFromHistory,
    removeFromHistory: baseRemoveFromHistory,
    removeMultipleFromHistory: baseRemoveMultipleFromHistory,
    updateActivityName: baseUpdateActivityName,
    updateActivityBike
  } = useActivityHistory({ workers, settings });

  const {
    cp,
    manualCP,
    manualWPrime,
    userWeight,
    weightUnit,
    maxHR,
    theme, setTheme,
    smoothingWindow, setSmoothingWindow,
    cpMode, setCpMode,
    powerZoneDefinitions,
    hrZoneDefinitions
  } = settings;

  const dashboardState = useDashboardState();
  const {
    isOverviewExpanded, setIsOverviewExpanded,
    isChartExpanded, setIsChartExpanded,
    isMapExpanded, setIsMapExpanded,
    isDetailsExpanded, setIsDetailsExpanded,
    isLapsExpanded, setIsLapsExpanded,
    isWPrimeExpanded, setIsWPrimeExpanded,
    isPowerCurveExpanded, setIsPowerCurveExpanded,
    isZonesExpanded, setIsZonesExpanded,
    isPmcExpanded, setIsPmcExpanded,
    isTrainingLoadExpanded, setIsTrainingLoadExpanded,
    isVolumeTrendsExpanded, setIsVolumeTrendsExpanded,
    toggleAllPanels,
    areAllPanelsCollapsed
  } = dashboardState;

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [activeMetrics, setActiveMetrics] = useState<string[]>(['power', 'wPrimeBalance']);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [historySortOrder, setHistorySortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showSettings, setShowSettings] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [mapProvider, setMapProvider] = useState<'osm' | 'google'>('osm');
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [isPointLocked, setIsPointLocked] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [lapMode, setLapMode] = useState<'file' | '1km' | '5km' | '10km' | '1min' | '5min' | '10min'>('file');
  const [showUploadView, setShowUploadView] = useState(false);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>('roadmap');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showBicycling, setShowBicycling] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const mmpCurveRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const lastActivePointUpdate = useRef<number>(0);

  // Custom Hooks for logic
  const smoothedData = useDataSmoothing(data, smoothingWindow);
  
  const { 
    exportStatus, 
    exportOriginal, 
    exportGPX, 
    exportFullCSV 
  } = useExportActions(summary, data, currentActivityId, originalFile, setOriginalFile);

  const {
    handleFileUpload,
    uploadQueue,
    setUploadQueue,
    isProcessingBatch
  } = useFileUploader(
    settings, setSummary, setData, setCpWPrime, setEstimatedCp,
    setCurrentActivityId, setOriginalFile, setIsEditingName, setEditedName,
    setShowUploadView, addToHistory, workers.calculatePowerCurve,
    workers.estimateCPWPrime, workers.calculateWPrimeBalance
  );

  useDataRecalculator(data, setData, summary, setSummary, settings, cpWPrime, workers.calculateWPrimeBalance);

  // Handlers
  const handleCompare = () => {
    setIsPowerCurveExpanded(true);
    setTimeout(() => {
      mmpCurveRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleActivityHistoryClick = () => {
    if (window.innerWidth < 768) {
      setIsHistorySidebarOpen(true);
    } else {
      const element = document.getElementById('history-section');
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLoadFromHistory = useCallback((id: string) => {
    loadFromHistory(id);
    setIsHistorySidebarOpen(false);
    setTimeout(() => {
      const overviewElement = overviewRef.current;
      if (overviewElement) overviewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  }, [loadFromHistory]);

  const throttledSetActivePoint = useCallback((index: number | null) => {
    const now = Date.now();
    if (now - lastActivePointUpdate.current > 32 || index === null) {
      setActivePoint(index);
      lastActivePointUpdate.current = now;
    }
  }, []);

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

  const toggleFullScreen = () => {
    if (!mapContainerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else mapContainerRef.current.requestFullscreen().catch(err => console.error(err));
  };

  // Weather service integration
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
    if (!apiKey) return;
    setIsWeatherLoading(true);
    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
      const weatherData = await response.json();
      if (weatherData.main) {
        setWeather({
          temp: weatherData.main.temp,
          description: weatherData.weather[0].description,
          icon: weatherData.weather[0].icon,
          windSpeed: weatherData.wind.speed,
          humidity: weatherData.main.humidity,
          locationName: weatherData.name
        });
      }
    } catch (e) { console.error(e); } finally { setIsWeatherLoading(false); }
  }, []);

  React.useEffect(() => {
    if (data.length > 0) {
      const point = activePoint !== null ? data[activePoint] : data[0];
      if (point.latitude && point.longitude) {
        const timer = setTimeout(() => fetchWeather(point.latitude!, point.longitude!), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [activePoint, data, fetchWeather]);

  // Calculations
  const metricsConfig = React.useMemo(() => ({
    power: { label: 'POWER', color: '#f97316', unit: 'W' },
    wPrimeBalance: { label: "W' BALANCE", color: '#a855f7', unit: 'J' },
    heartRate: { label: 'HEART RATE', color: '#ef4444', unit: 'BPM' },
    cadence: { label: 'CADENCE', color: '#22c55e', unit: 'RPM' },
    speed: { label: 'SPEED', color: '#06b6d4', unit: 'KM/H' },
    altitude: { label: 'ALTITUDE', color: '#f59e0b', unit: 'M' },
    slope: { label: 'SLOPE', color: '#64748b', unit: '%' },
  }), []);

  const currentLaps = React.useMemo(() => {
    if (!summary || !data || data.length === 0) return [];
    if (lapMode === 'file') return summary.laps || [];
    const laps = [];
    let currentLapPoints: CyclingDataPoint[] = [];
    let lapId = 1;
    if (lapMode.endsWith('km')) {
      const dist = parseInt(lapMode) * 1000;
      let lastDist = data[0].distance || 0;
      data.forEach((p, idx) => {
        currentLapPoints.push(p);
        if ((p.distance || 0) - lastDist >= dist || idx === data.length - 1) {
          laps.push(calculateLapSummary(currentLapPoints, lapId++));
          currentLapPoints = [];
          lastDist = p.distance || 0;
        }
      });
    } else if (lapMode.endsWith('min')) {
      const time = parseInt(lapMode) * 60;
      let lastTime = data[0].timestamp.getTime();
      data.forEach((p, idx) => {
        currentLapPoints.push(p);
        if ((p.timestamp.getTime() - lastTime) / 1000 >= time || idx === data.length - 1) {
          laps.push(calculateLapSummary(currentLapPoints, lapId++));
          currentLapPoints = [];
          lastTime = p.timestamp.getTime();
        }
      });
    }
    return laps;
  }, [summary, data, lapMode]);

  const trainingLoadStats = React.useMemo(() => {
    if (trainingLoadData.length === 0) return { totalBikeScore: 0, avgBikeScore: 0, totalWork: 0, totalDuration: 0 };
    return {
      totalBikeScore: trainingLoadData.reduce((s, d) => s + (d.bikeScore || 0), 0),
      avgBikeScore: trainingLoadData.reduce((s, d) => s + (d.bikeScore || 0), 0) / trainingLoadData.length,
      totalWork: trainingLoadData.reduce((s, d) => s + (d.work || 0), 0),
      totalDuration: trainingLoadData.reduce((s, d) => s + (d.duration || 0), 0)
    };
  }, [trainingLoadData]);

  const sortedHistory = React.useMemo(() => {
    return [...history].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return historySortOrder === 'newest' ? db - da : da - db;
    });
  }, [history, historySortOrder]);

  const getComparisonCurves = useCallback(() => {
    return history
      .filter(h => selectedHistoryIds.includes(h.id))
      .map(h => ({ id: h.id, name: h.name, curve: h.powerCurve || h.fullSummary?.powerCurve || [] }))
      .filter(h => h.curve.length > 0);
  }, [history, selectedHistoryIds]);

  const gpsPoints = React.useMemo(() => data.filter(p => p.latitude && p.longitude).map(p => [p.latitude!, p.longitude!] as [number, number]), [data]);

  return (
    <div className={cn("min-h-screen transition-colors duration-300", theme === 'dark' ? "dark bg-[#0a0a0a] text-white" : "bg-[#f8f9fa] text-[#1a1a1a]")}>
      <Header 
        estimatedCp={estimatedCp}
        cp={cp}
        setCP={settings.setCP}
        autoUpdateCP={settings.autoUpdateCP}
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
              loadFromHistory={handleLoadFromHistory}
              onOpenHistory={handleActivityHistoryClick}
            />

            {summary && (
              <div ref={overviewRef} className="space-y-4 sm:space-y-8">
                <ActivityOverview 
                  summary={summary}
                  data={data}
                  currentPMC={currentPMC}
                  history={history}
                  userWeight={userWeight}
                  weightUnit={weightUnit}
                  equipment={settings.equipment}
                  currentActivityId={currentActivityId}
                  updateActivityBike={updateActivityBike}
                  isExpanded={isOverviewExpanded}
                  onToggle={() => setIsOverviewExpanded(!isOverviewExpanded)}
                />

                <div className="grid grid-cols-1 gap-4 sm:gap-8">
                  <div className="space-y-4 sm:space-y-8">
                    <MetricAnalysis 
                      isChartExpanded={isChartExpanded} setIsChartExpanded={setIsChartExpanded}
                      metricsConfig={metricsConfig} activeMetrics={activeMetrics} setActiveMetrics={setActiveMetrics}
                      smoothingWindow={smoothingWindow} setSmoothingWindow={setSmoothingWindow}
                      smoothedData={smoothedData} activePoint={activePoint} setActivePoint={throttledSetActivePoint}
                      isPointLocked={isPointLocked} setIsPointLocked={setIsPointLocked}
                      estimatedCp={estimatedCp} cp={cp} manualCP={manualCP}
                      powerZoneDefinitions={powerZoneDefinitions} hrZoneDefinitions={hrZoneDefinitions}
                      maxHR={maxHR} cpMode={cpMode} setCpMode={setCpMode}
                    />

                    <Suspense fallback={<div className="bg-app-card border border-app-border rounded-3xl p-4 sm:p-8 h-[450px] sm:h-[600px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
                      <ActivityMap 
                        isMapExpanded={isMapExpanded} setIsMapExpanded={setIsMapExpanded}
                        mapContainerRef={mapContainerRef} isMapMaximized={isMapMaximized} setIsMapMaximized={setIsMapMaximized}
                        toggleFullScreen={toggleFullScreen} setActivePoint={throttledSetActivePoint} setIsPointLocked={setIsPointLocked}
                        mapProvider={mapProvider} setMapProvider={setMapProvider} weather={weather} isWeatherLoading={isWeatherLoading}
                        gpsPoints={gpsPoints} activePoint={activePoint} isPointLocked={isPointLocked}
                        mapType={mapType} setMapType={setMapType} theme={theme} data={data}
                        showTraffic={showTraffic} setShowTraffic={setShowTraffic} showBicycling={showBicycling} setShowBicycling={setShowBicycling}
                        showTransit={showTransit} setShowTransit={setShowTransit} googleMapRef={googleMapRef}
                      />
                    </Suspense>
                    
                    <ActivityDetails 
                      isDetailsExpanded={isDetailsExpanded} setIsDetailsExpanded={setIsDetailsExpanded}
                      summary={summary} isEditingName={isEditingName} setIsEditingName={setIsEditingName}
                      editedName={editedName} setEditedName={setEditedName} updateActivityName={updateActivityName}
                      currentActivityId={currentActivityId} estimatedCp={estimatedCp} userWeight={userWeight} weightUnit={weightUnit}
                      exportOriginal={exportOriginal} exportGPX={exportGPX} exportFullCSV={exportFullCSV}
                    />

                    <WPrimeAnalysis 
                      isWPrimeExpanded={isWPrimeExpanded} setIsWPrimeExpanded={setIsWPrimeExpanded}
                      cpWPrime={cpWPrime} manualCP={manualCP} manualWPrime={manualWPrime}
                      smoothedData={smoothedData} activePoint={activePoint} setActivePoint={throttledSetActivePoint}
                      isPointLocked={isPointLocked} setIsPointLocked={setIsPointLocked}
                      cp={cp} cpMode={cpMode} setCpMode={setCpMode}
                    />

                    <PowerCurveAnalysis 
                      isPowerCurveExpanded={isPowerCurveExpanded} setIsPowerCurveExpanded={setIsPowerCurveExpanded}
                      selectedHistoryIds={selectedHistoryIds} setSelectedHistoryIds={setSelectedHistoryIds}
                      summary={summary} allTimeBestCurve={allTimeBestCurve} rolling90DayBestCurve={rolling90DayBestCurve}
                      getComparisonCurves={getComparisonCurves} mmpCurveRef={mmpCurveRef} theme={theme}
                    />

                    <ZonesAnalysis isZonesExpanded={isZonesExpanded} setIsZonesExpanded={setIsZonesExpanded} summary={summary} />

                    <LapBreakdown 
                      isLapsExpanded={isLapsExpanded} setIsLapsExpanded={setIsLapsExpanded}
                      currentLaps={currentLaps} lapMode={lapMode} setLapMode={setLapMode}
                    />

                    <PmcAnalysis 
                      isPmcExpanded={isPmcExpanded} setIsPmcExpanded={setIsPmcExpanded}
                      currentPMC={currentPMC} pmcData={pmcData} pmcFocus={pmcFocus} setPmcFocus={setPmcFocus}
                      pmcDateRange={pmcDateRange} setPmcDateRange={setPmcDateRange}
                    />

                    <TrainingLoadAnalysis 
                      isTrainingLoadExpanded={isTrainingLoadExpanded} setIsTrainingLoadExpanded={setIsTrainingLoadExpanded}
                      trainingLoadRange={trainingLoadRange} setTrainingLoadRange={setTrainingLoadRange}
                      trainingLoadData={trainingLoadData} trainingLoadStats={trainingLoadStats}
                    />

                    <VolumeTrendsAnalysis 
                      isExpanded={isVolumeTrendsExpanded} setIsExpanded={setIsVolumeTrendsExpanded}
                      range={volumeTrendsRange} setRange={setVolumeTrendsRange} data={volumeTrendsData}
                    />
                  </div>
                </div>
              </div>
            )}

            <HistorySidebar 
              isHistoryExpanded={dashboardState.isHistoryExpanded} setIsHistoryExpanded={dashboardState.setIsHistoryExpanded}
              selectedHistoryIds={selectedHistoryIds} setSelectedHistoryIds={setSelectedHistoryIds}
              history={history} sortedHistory={sortedHistory} summary={summary}
              historySortOrder={historySortOrder} setHistorySortOrder={setHistorySortOrder}
              handleCompare={handleCompare} loadFromHistory={handleLoadFromHistory}
              removeFromHistory={removeFromHistory} removeMultipleFromHistory={removeMultipleFromHistory}
              isOpen={isHistorySidebarOpen} onClose={() => setIsHistorySidebarOpen(false)}
            />
          </div>
        )}
      </main>

      <SettingsModal 
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        cp={cp}
        setCP={settings.setCP}
        autoUpdateCP={settings.autoUpdateCP}
        setAutoUpdateCP={settings.setAutoUpdateCP}
        maxHR={maxHR}
        setMaxHR={settings.setMaxHR}
        manualCP={manualCP}
        setManualCP={settings.setManualCP}
        manualWPrime={manualWPrime}
        setManualWPrime={settings.setManualWPrime}
        userWeight={userWeight}
        setUserWeight={settings.setUserWeight}
        weightUnit={weightUnit}
        setWeightUnit={settings.setWeightUnit}
        equipment={settings.equipment}
        addBike={settings.addBike}
        updateBike={settings.updateBike}
        removeBike={settings.removeBike}
        activeBikeId={settings.activeBikeId}
        setActiveBikeId={settings.setActiveBikeId}
        enableVirtualPower={settings.enableVirtualPower}
        setEnableVirtualPower={settings.setEnableVirtualPower}
        cpWPrime={cpWPrime}
        powerZoneDefinitions={powerZoneDefinitions}
        setPowerZoneDefinitions={settings.setPowerZoneDefinitions}
        hrZoneDefinitions={hrZoneDefinitions}
        setHrZoneDefinitions={settings.setHrZoneDefinitions}
        smoothingWindow={smoothingWindow}
        setSmoothingWindow={settings.setSmoothingWindow}
        history={history}
      />

      <AboutModal showAboutModal={showAboutModal} setShowAboutModal={setShowAboutModal} />

      <ExportProgress 
        active={exportStatus.active} 
        type={exportStatus.type} 
        progress={exportStatus.progress} 
      />
    </div>
  );
}
