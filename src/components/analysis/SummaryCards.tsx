import React from 'react';
import { motion } from 'motion/react';
import { 
  Timer, 
  Zap, 
  Activity, 
  Heart, 
  Navigation, 
  Clock, 
  BarChart3, 
  TrendingUp, 
  Thermometer,
  Bike,
  ChevronDown,
  Moon,
  RefreshCw,
  Info as InfoIcon,
  AlertTriangle
} from 'lucide-react';
import { cn, formatDuration, formatLocalDate } from '../../lib/utils';
import { 
  ActivitySummary, 
  PMCDataPoint, 
  HistoricalActivity, 
  Equipment,
  SleepMetric,
  HRVMetric,
  AISettings
} from '../../types';
import { calculateVeloReadiness } from '../../services/wellnessService';

interface SummaryCardsProps {
  summary: ActivitySummary;
  data: any[];
  currentPMC: PMCDataPoint | null;
  pmcData?: PMCDataPoint[];
  history: HistoricalActivity[];
  userWeight?: number | null;
  weightUnit?: 'kg' | 'lbs';
  equipment: Equipment[];
  currentActivityId: string | null;
  updateActivityBike: (id: string, bikeId: string) => void;
  sleepData?: SleepMetric[];
  hrvData?: HRVMetric[];
  aiSettings?: AISettings;
}

export const SummaryCards = React.memo(({ 
  summary, 
  data, 
  currentPMC, 
  pmcData = [],
  history,
  userWeight,
  weightUnit,
  equipment,
  currentActivityId,
  updateActivityBike,
  sleepData = [],
  hrvData = [],
  aiSettings
}: SummaryCardsProps) => {
  const currentActivityInHistory = currentActivityId ? history.find(h => h.id === currentActivityId) : null;
  const activityBikeId = currentActivityInHistory?.bikeId || (history.length > 0 ? history[0].bikeId : null);
  const activeBike = equipment.find(b => b.id === activityBikeId) || equipment[0];

  const activityDate = React.useMemo(() => {
    // If we have a specific activity from history, use its pre-formatted date string
    if (currentActivityInHistory?.date) return currentActivityInHistory.date;
    
    try {
      // Fallback to formatting the summary start time
      return formatLocalDate(new Date(summary.startTime));
    } catch {
      return null;
    }
  }, [currentActivityInHistory?.date, summary.startTime]);

  const latestSleep = React.useMemo(() => {
    if (sleepData.length === 0) return null;
    
    // Sort descending by date to get most recent first
    const sorted = [...sleepData].sort((a, b) => b.date.localeCompare(a.date));
    
    // Try to find sleep data for the activity date first
    if (activityDate) {
      const onDate = sorted.find(s => s.date === activityDate);
      if (onDate) return onDate;
    }
    
    // Fallback to absolute latest record
    return sorted[0];
  }, [sleepData, activityDate]);

  const latestHRV = React.useMemo(() => {
    if (hrvData.length === 0) return null;
    const sorted = [...hrvData].sort((a, b) => b.date.localeCompare(a.date));
    
    if (activityDate) {
      const onDate = sorted.find(h => h.date === activityDate);
      if (onDate) return onDate;
    }
    
    return sorted[0];
  }, [hrvData, activityDate]);

  const latestPMC = React.useMemo(() => {
    // If we have history for the activity date, prioritize that specific day's state
    if (activityDate && pmcData.length > 0) {
      const onDate = pmcData.find(p => p.date === activityDate);
      if (onDate) return onDate;
    }

    if (pmcData.length === 0) return currentPMC;
    
    // Filter out predictive points to find the latest "real" state
    const realPoints = pmcData.filter(p => !p.isPredictive);
    if (realPoints.length > 0) {
      return [...realPoints].sort((a, b) => b.date.localeCompare(a.date))[0];
    }
    
    return currentPMC;
  }, [pmcData, currentPMC, activityDate]);

  const veloReadiness = React.useMemo(() => {
    if (!aiSettings?.useExperimentalReadiness || !latestSleep || !latestPMC) return null;
    return calculateVeloReadiness(
      latestSleep, 
      latestHRV || null, 
      latestPMC.sb, 
      latestPMC.sts,
      latestPMC.bikeScore || 0
    );
  }, [aiSettings?.useExperimentalReadiness, latestSleep, latestHRV, latestPMC]);

  return (
    <div className="relative -mx-4 px-4 overflow-x-auto hide-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
      <div className="flex flex-nowrap sm:grid gap-3 sm:gap-4 pb-4 sm:pb-0 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        
        {/* Bike Profile Card */}
        <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[200px] sm:min-w-0">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Equipment used</span>
            <Bike className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: activeBike?.color || '#f97316' }} />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="relative group">
              <select 
                value={activeBike?.id || ''}
                onChange={(e) => currentActivityId && updateActivityBike(currentActivityId, e.target.value)}
                className="w-full bg-transparent text-base sm:text-lg md:text-xl font-bold tracking-tight appearance-none cursor-pointer focus:outline-none pr-8 truncate"
              >
                {equipment.map(bike => (
                  <option key={bike.id} value={bike.id} className="bg-app-card text-app-text text-sm">{bike.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted pointer-events-none group-hover:text-app-text transition-colors" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
            {activeBike?.bikeWeight} KG • {activeBike?.ridingPosition} • {activeBike?.surfaceType}
          </div>
        </div>
        <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[160px] sm:min-w-0">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Duration & Work</span>
            <Timer className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter">{formatDuration(summary.duration)}</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
            Work: {Math.round((summary.avgPower || 0) * summary.duration / 1000)} KJ
          </div>
        </div>

        <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[200px] sm:min-w-0">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Power Metrics</span>
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter">{Math.round(summary.xPower || 0)}</span>
              <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest whitespace-nowrap">W xPower</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex flex-wrap items-start sm:items-center gap-x-2 sm:gap-x-6 gap-y-1 text-[10px] text-app-muted font-bold uppercase tracking-widest justify-start">
            <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-3">
              <span>AVG: {Math.round(summary.avgPower || 0)}W</span>
              <span>MAX: {Math.round(summary.maxPower || 0)}W</span>
            </div>
            {data.some(p => p.leftRightBalance !== undefined) && (
              <div>
                <span>L/R: {(() => {
                  const balances = data.filter(p => p.leftRightBalance !== undefined).map(p => p.leftRightBalance!);
                  if (balances.length === 0) return '50/50';
                  const avg = balances.reduce((a, b) => a + b, 0) / balances.length;
                  return `${Math.round(avg)}/${100 - Math.round(avg)}`;
                })()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[160px] sm:min-w-0">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Training Stress</span>
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter">{Math.round(summary.bikeScore || 0)}</span>
              <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest">BIKESCORE</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
            RI: {(summary.relativeIntensity || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[160px] sm:min-w-0">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Heart Rate</span>
            <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter">{Math.round(summary.avgHeartRate || 0)}</span>
              <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest">BPM</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
            MAX: {Math.round(summary.maxHeartRate || 0)} BPM
          </div>
        </div>

        <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[160px] sm:min-w-0">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Distance & Elevation</span>
            <Navigation className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 rotate-45" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter">{(summary.distance / 1000).toFixed(1)}</span>
              <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest">KM</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
            ASCENT: {Math.round(summary.totalAscent || 0)} M
          </div>
        </div>

        <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[160px] sm:min-w-0">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Speed</span>
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-500" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter">{(summary.avgSpeed || 0).toFixed(1)}</span>
              <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest">KM/H</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
            MAX: {(summary.maxSpeed || 0).toFixed(1)} KM/H
          </div>
        </div>

        <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[160px] sm:min-w-0">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Cadence</span>
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter">{Math.round(summary.avgCadence || 0)}</span>
              <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest">RPM</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
            MAX: {Math.round(summary.maxCadence || 0)} RPM
          </div>
        </div>

        {summary.aerobicDecoupling !== undefined && (
          <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[160px] sm:min-w-0">
            <div className="flex justify-between items-start mb-2 sm:mb-4">
              <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Aerobic Decoupling</span>
              <TrendingUp className={cn(
                "w-3 h-3 sm:w-4 sm:h-4",
                summary.aerobicDecoupling < 5 ? "text-green-500" :
                summary.aerobicDecoupling < 10 ? "text-orange-500" : "text-red-500"
              )} />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className={cn(
                  "text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter",
                  summary.aerobicDecoupling < 5 ? "text-green-500" :
                  summary.aerobicDecoupling < 10 ? "text-orange-500" : "text-app-text"
                )}>
                  {(summary.aerobicDecoupling || 0).toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest">%</span>
              </div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
              PW:HR • {summary.aerobicDecoupling < 5 ? "GOOD" : 
               summary.aerobicDecoupling < 10 ? "MODERATE" : "HIGH"}
            </div>
          </div>
        )}

        {summary.avgTemperature !== undefined && (
          <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[160px] sm:min-w-0">
            <div className="flex justify-between items-start mb-2 sm:mb-4">
              <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Temperature</span>
              <Thermometer className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter">{Math.round(summary.avgTemperature || 0)}</span>
                <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest">°C</span>
              </div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
              AVG AMBIENT
            </div>
          </div>
        )}
        
        {history.length > 0 && currentPMC && (
          <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[160px] sm:min-w-0">
            <div className="flex justify-between items-start mb-2 sm:mb-4">
              <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Performance (PMC)</span>
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter">{Math.round(currentPMC.lts || 0)}</span>
                <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest">FITNESS</span>
              </div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
              SB: {Math.round(currentPMC.sb || 0)}
            </div>
          </div>
        )}
        {latestSleep && (
          <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[160px] sm:min-w-0">
            <div className="flex justify-between items-start mb-2 sm:mb-4">
              <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Sleep Trends</span>
              <Moon className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter">{latestSleep.score}</span>
              </div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
              DUR: {Math.floor(latestSleep.duration / 60)}h {latestSleep.duration % 60}m • {latestSleep.quality.toUpperCase()}
            </div>
          </div>
        )}

        {(latestHRV || latestSleep) && (
          <div className="bg-app-bg border border-app-border rounded-2xl p-3 sm:p-4 md:p-6 hover:bg-app-card/80 transition-colors h-full flex flex-col min-h-[140px] sm:min-h-[160px] min-w-[200px] sm:min-w-0 relative group">
            <div className="flex justify-between items-start mb-2 sm:mb-4">
              <span className="text-[10px] uppercase tracking-widest text-app-muted font-bold">Recovery Status</span>
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-baseline gap-1 sm:gap-2">
                <span className={cn(
                  "text-2xl sm:text-3xl md:text-4xl font-light tracking-tighter",
                  veloReadiness ? "text-yellow-400" : "text-cyan-500"
                )}>
                  {veloReadiness ? veloReadiness.score : (latestSleep?.readinessScore || '--')}
                </span>
                <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest flex items-center gap-1">
                  {veloReadiness ? "VELO" : "READINESS"}
                  {veloReadiness && <InfoIcon className="w-2.5 h-2.5 text-yellow-400/80" />}
                </span>
              </div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center gap-3 text-[10px] text-app-muted font-bold uppercase tracking-widest">
              {latestHRV && (
                <div className="flex items-center gap-1">
                  HRV {latestHRV.overnightHRV} MS ({latestHRV.baselineMin} - {latestHRV.baselineMax})
                </div>
              )}
              {veloReadiness && veloReadiness.penalties.length > 0 && (
                <div className="flex items-center gap-1 text-red-500">
                  <AlertTriangle className="w-2.5 h-2.5 animate-pulse" />
                  STRESS
                </div>
              )}
            </div>

            {/* Velo Details Dropdown (Desktop Only View) */}
            {veloReadiness && (
              <div className="absolute top-[calc(100%+8px)] left-0 xl:left-auto xl:right-0 mb-2 p-4 bg-slate-900 border border-white/10 rounded-2xl w-64 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none backdrop-blur-xl">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 mb-2">Velo Readiness Factors</h4>
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Sleep (35%)</span>
                    <span className="font-bold text-slate-100">{veloReadiness.contributors.sleep}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Recovery (25%)</span>
                    <span className="font-bold text-slate-100">{veloReadiness.contributors.recovery}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">HRV (20%)</span>
                    <span className="font-bold text-slate-100">{veloReadiness.contributors.hrv}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Load/TSB (20%)</span>
                    <span className="font-bold text-slate-100">{veloReadiness.contributors.load}</span>
                  </div>
                </div>
                {veloReadiness.penalties.length > 0 && (
                  <div className="border-t border-white/5 pt-2">
                    <h5 className="text-[9px] font-bold uppercase text-red-400 mb-1">Capped by deficit:</h5>
                    <div className="space-y-1">
                      {veloReadiness.penalties.map(p => (
                        <div key={p} className="text-[9px] text-red-300 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

SummaryCards.displayName = 'SummaryCards';
