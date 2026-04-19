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
  Thermometer 
} from 'lucide-react';
import { cn, formatDuration } from '../lib/utils';
import { ActivitySummary, PMCDataPoint, HistoricalActivity } from '../types';

interface SummaryCardsProps {
  summary: ActivitySummary;
  data: any[];
  currentPMC: PMCDataPoint | null;
  history: HistoricalActivity[];
  userWeight?: number | null;
  weightUnit?: 'kg' | 'lbs';
}

export const SummaryCards = React.memo(({ 
  summary, 
  data, 
  currentPMC, 
  history,
  userWeight,
  weightUnit
}: SummaryCardsProps) => {
  return (
    <div className="relative -mx-4 px-4 overflow-x-auto hide-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
      <div className="flex flex-nowrap sm:grid gap-3 sm:gap-4 pb-4 sm:pb-0 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                  summary.aerobicDecoupling < 10 ? "text-orange-500" : "text-red-500"
                )}>
                  {(summary.aerobicDecoupling || 0).toFixed(1)}%
                </span>
                <span className="text-[10px] sm:text-xs text-app-muted font-bold uppercase tracking-widest">PW:HR</span>
              </div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[10px] text-app-muted font-bold uppercase tracking-widest">
              {summary.aerobicDecoupling < 5 ? "GOOD" : 
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
      </div>
    </div>
  );
});

SummaryCards.displayName = 'SummaryCards';
