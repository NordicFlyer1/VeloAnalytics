import React from 'react';
import { motion } from 'motion/react';
import { Thermometer, Wind, Droplets } from 'lucide-react';
import { WeatherData } from '../types';
import { cn } from '../lib/utils';

interface WeatherCardProps {
  weather: WeatherData | null;
  isLoading: boolean;
  variant?: 'default' | 'minimal';
}

export const WeatherCard = React.memo(({ weather, isLoading, variant = 'default' }: WeatherCardProps) => {
  if (isLoading) {
    return (
      <div className={cn(
        "bg-app-bg/80 backdrop-blur-md border border-app-border flex items-center gap-3 animate-pulse",
        variant === 'minimal' ? "p-1 border-none bg-transparent" : "p-3 rounded-2xl shadow-xl"
      )}>
        <div className="w-8 h-8 bg-app-card rounded-full" />
        <div className="space-y-2">
          <div className="w-16 h-2 bg-app-card rounded" />
        </div>
      </div>
    );
  }

  if (!weather) return null;

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <img 
            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} 
            alt={weather.description}
            className="w-8 h-8"
            referrerPolicy="no-referrer"
          />
          <span className="text-sm font-bold tracking-tight">{Math.round(weather.temp)}°C</span>
        </div>
        <div className="h-4 w-px bg-app-border" />
        <div className="hidden xs:flex flex-col">
          <span className="text-[8px] font-bold uppercase tracking-widest text-app-muted truncate max-w-[60px]">
            {weather.locationName}
          </span>
        </div>
        <div className="h-4 w-px bg-app-border" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3 text-blue-400" />
            <span className="text-[9px] font-medium">{Math.round(weather.windSpeed * 3.6)}k</span>
          </div>
          <div className="flex items-center gap-1">
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span className="text-[9px] font-medium">{weather.humidity}%</span>
          </div>
        </div>
      </div>
    );
  }

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
});

WeatherCard.displayName = 'WeatherCard';
