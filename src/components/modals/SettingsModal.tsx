import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Zap, Activity, Info, Bike, Plus, Trash2, Check, User, 
  Target, Eye, Brain, Key, Cpu, Globe, MessageSquare, Sparkles,
  Moon, RefreshCw, FlaskConical
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { 
  RidingPosition, SurfaceType, Equipment, ZoneDefinition, 
  HistoricalActivity, AISettings, SleepMetric, HRVMetric
} from '../../types';
import { parseSleepCSV, parseHRVCSV } from '../../services/wellnessService';

interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  cp: number;
  setCP: (cp: number) => void;
  autoUpdateCP: boolean;
  setAutoUpdateCP: (auto: boolean) => void;
  maxHR: number;
  setMaxHR: (hr: number) => void;
  manualCP: number | null;
  setManualCP: (cp: number | null) => void;
  manualWPrime: number | null;
  setManualWPrime: (w: number | null) => void;
  userWeight: number | null;
  setUserWeight: (w: number | null) => void;
  weightUnit: 'kg' | 'lbs';
  setWeightUnit: (u: 'kg' | 'lbs') => void;
  
  // Equipment props
  equipment: Equipment[];
  addBike: (bike: Omit<Equipment, 'id'>) => void;
  updateBike: (id: string, updates: Partial<Equipment>) => void;
  removeBike: (id: string) => void;
  activeBikeId: string;
  setActiveBikeId: (id: string) => void;
  
  enableVirtualPower: boolean;
  setEnableVirtualPower: (e: boolean) => void;
  cpWPrime: any;
  powerZoneDefinitions: ZoneDefinition[];
  setPowerZoneDefinitions: (zones: ZoneDefinition[]) => void;
  hrZoneDefinitions: ZoneDefinition[];
  setHrZoneDefinitions: (zones: ZoneDefinition[]) => void;
  smoothingWindow: number;
  setSmoothingWindow: (n: number) => void;
  history: HistoricalActivity[];
  sleepHistory: SleepMetric[];
  setSleepHistory: (data: SleepMetric[] | ((prev: SleepMetric[]) => SleepMetric[])) => void;
  hrvHistory: HRVMetric[];
  setHrvHistory: (data: HRVMetric[] | ((prev: HRVMetric[]) => HRVMetric[])) => void;

  // AI Props
  aiSettings: AISettings;
  updateAiSettings: (updates: Partial<AISettings>) => void;

  // Maintenance Props
  exportSettings: () => void;
  importSettings: (json: string) => boolean;
}

type Tab = 'general' | 'zones' | 'equipment' | 'intelligence' | 'experimental' | 'maintenance';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  showSettings,
  setShowSettings,
  cp,
  setCP,
  autoUpdateCP,
  setAutoUpdateCP,
  maxHR,
  setMaxHR,
  manualCP,
  setManualCP,
  manualWPrime,
  setManualWPrime,
  userWeight,
  setUserWeight,
  weightUnit,
  setWeightUnit,
  equipment,
  addBike,
  updateBike,
  removeBike,
  activeBikeId,
  setActiveBikeId,
  enableVirtualPower,
  setEnableVirtualPower,
  cpWPrime,
  powerZoneDefinitions,
  setPowerZoneDefinitions,
  hrZoneDefinitions,
  setHrZoneDefinitions,
  smoothingWindow,
  setSmoothingWindow,
  history,
  sleepHistory,
  setSleepHistory,
  hrvHistory,
  setHrvHistory,
  aiSettings,
  updateAiSettings,
  exportSettings,
  importSettings
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const getBikeMileage = (bike: Equipment) => {
    const historicalDist = history
      .filter(h => h.bikeId === bike.id)
      .reduce((sum, h) => sum + (h.distance || 0), 0);
    return (bike.startingMileage + historicalDist) / 1000; // Return in KM
  };

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
      <div className="relative bg-app-card border border-app-border rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-app-border flex items-center justify-between bg-app-card/50 backdrop-blur-md">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
              Settings
            </h2>
            <p className="text-[10px] text-app-muted uppercase tracking-widest font-bold mt-1">Configure your performance platform</p>
          </div>
          <button 
            onClick={() => setShowSettings(false)}
            className="text-app-muted hover:text-app-text transition-colors text-[10px] font-bold uppercase tracking-widest px-3 py-1.5"
          >
            Close
          </button>
        </div>

        {/* Tab Navigation - Aligned to About Modal Capsule style */}
        <div className="px-6 sm:px-8 py-5 border-b border-app-border bg-app-card/30">
          <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border self-start w-fit max-w-full overflow-x-auto no-scrollbar">
            {(['general', 'zones', 'equipment', 'intelligence', 'maintenance', 'experimental'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === tab 
                    ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                    : "text-app-muted hover:text-app-text"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                {/* Thresholds */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Critical Power (CP)</label>
                    <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full px-5 py-3 focus-within:border-orange-500/50 transition-colors">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <input 
                        type="number" 
                        value={cp || ''} 
                        placeholder="250"
                        onChange={(e) => setCP(parseInt(e.target.value) || 0)}
                        className="bg-transparent w-full text-sm font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-app-muted uppercase tracking-widest font-bold">W</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 ml-1">
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
                      <span className="text-[10px] text-app-muted font-bold uppercase tracking-wider">Auto-update CP</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Max Heart Rate</label>
                    <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full px-5 py-3 focus-within:border-red-500/50 transition-colors">
                      <Activity className="w-4 h-4 text-red-500" />
                      <input 
                        type="number" 
                        value={maxHR} 
                        onChange={(e) => setMaxHR(parseInt(e.target.value) || 0)}
                        className="bg-transparent w-full text-sm font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-app-muted uppercase tracking-widest font-bold">BPM</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Manual CP Override</label>
                    <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full px-5 py-3 focus-within:border-orange-500/50 transition-colors opacity-80 focus-within:opacity-100">
                      <Zap className="w-4 h-4 text-orange-500/50" />
                      <input 
                        type="number" 
                        placeholder={cpWPrime?.cp ? Math.round(cpWPrime.cp || 0).toString() : "Estimated"}
                        value={manualCP ?? ''} 
                        onChange={(e) => setManualCP(e.target.value ? parseInt(e.target.value) : null)}
                        className="bg-transparent w-full text-sm font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-app-muted uppercase tracking-widest font-bold">W</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Manual W' Override</label>
                    <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full px-5 py-3 focus-within:border-purple-500/50 transition-colors opacity-80 focus-within:opacity-100">
                      <Zap className="w-4 h-4 text-purple-500/50" />
                      <input 
                        type="number" 
                        placeholder={cpWPrime?.wPrime ? Math.round(cpWPrime.wPrime || 0).toString() : "Estimated"}
                        value={manualWPrime ?? ''} 
                        onChange={(e) => setManualWPrime(e.target.value ? parseInt(e.target.value) : null)}
                        className="bg-transparent w-full text-sm font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-app-muted uppercase tracking-widest font-bold">KJ</span>
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Body Weight</label>
                    <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full pl-5 pr-1.5 py-1.5 focus-within:border-blue-500/50 transition-colors">
                      <User className="w-4 h-4 text-blue-500" />
                      <input 
                        type="number"
                        step="0.1"
                        placeholder="Weight"
                        value={userWeight ?? ''} 
                        onChange={(e) => setUserWeight(e.target.value ? parseFloat(e.target.value) : null)}
                        className="bg-transparent w-full text-sm font-bold focus:outline-none"
                      />
                      <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border shrink-0">
                        {(['kg', 'lbs'] as const).map((u) => (
                          <button
                            key={u}
                            onClick={() => setWeightUnit(u)}
                            className={cn(
                              "px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-full transition-all",
                              weightUnit === u 
                                ? "bg-orange-500 text-black shadow-md shadow-orange-500/20" 
                                : "text-app-muted hover:text-app-text"
                            )}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Virtual Power Physics</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-app-bg/30 border border-app-border rounded-3xl p-5">
                      <div className="flex flex-col justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-app-text">Enable Engine</span>
                        <span className="text-[9px] text-app-muted font-medium mt-1 uppercase tracking-tight">Estimates watts via environmental physics when missing</span>
                      </div>
                      <div className="flex items-center justify-end">
                        <button 
                          onClick={() => setEnableVirtualPower(!enableVirtualPower)}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative shrink-0",
                            enableVirtualPower ? "bg-orange-500" : "bg-app-border"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                            enableVirtualPower ? "left-5.5" : "left-0.5"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Metric Smoothing (Sec)</label>
                    <div className="flex items-center gap-3 bg-app-bg/30 border border-app-border rounded-full px-6 py-4">
                      <Eye className="w-4 h-4 text-indigo-500" />
                      <input 
                        type="range"
                        min="1"
                        max="30"
                        value={smoothingWindow}
                        onChange={(e) => setSmoothingWindow(parseInt(e.target.value))}
                        className="flex-1 accent-orange-500 h-1.5 bg-app-border rounded-full appearance-none cursor-pointer"
                      />
                      <span className="w-8 text-[10px] font-bold text-app-text text-right">{smoothingWindow}s</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'zones' && (
              <motion.div
                key="zones"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-12"
              >
                {/* Power Zones */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-app-border pb-2 px-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted">Power Zones</h3>
                    <span className="text-[9px] text-app-muted font-mono uppercase font-bold tracking-widest">Calculated Range</span>
                  </div>
                  <div className="space-y-3">
                    {powerZoneDefinitions.map((z, i) => (
                      <div key={z.name} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-app-card/30 border border-app-border/30 hover:border-app-border/60 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: z.color }} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-app-text font-bold uppercase tracking-wider">{z.name}</span>
                            <span className="text-[9px] text-app-muted font-bold uppercase tracking-tighter opacity-60">Z{i + 1}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="flex items-center gap-2 bg-app-bg/50 p-1 rounded-full border border-app-border px-3 h-9">
                            <input 
                              type="number" 
                              value={z.percentMin} 
                              onChange={(e) => {
                                const newZones = [...powerZoneDefinitions];
                                newZones[i].percentMin = parseInt(e.target.value) || 0;
                                setPowerZoneDefinitions(newZones);
                              }}
                              className="bg-transparent w-10 text-xs text-center font-bold focus:outline-none"
                            />
                            <span className="text-app-muted font-bold text-[10px]">% —</span>
                            <input 
                              type="number" 
                              value={z.percentMax} 
                              onChange={(e) => {
                                const newZones = [...powerZoneDefinitions];
                                newZones[i].percentMax = parseInt(e.target.value) || 0;
                                setPowerZoneDefinitions(newZones);
                              }}
                              className="bg-transparent w-10 text-xs text-center font-bold focus:outline-none"
                            />
                            <span className="text-[10px] text-app-muted font-bold">%</span>
                          </div>
                          <div className="text-xs text-app-text w-24 text-right font-mono font-bold tracking-tight shrink-0">
                            {Math.round((z.percentMin / 100) * (cp || 250))} – {z.percentMax >= 999 ? '∞' : Math.round((z.percentMax / 100) * (cp || 250))} <span className="text-[9px] uppercase">W</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HR Zones */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-app-border pb-2 px-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted">Heart Rate Zones</h3>
                    <span className="text-[9px] text-app-muted font-mono uppercase font-bold tracking-widest">Calculated Range</span>
                  </div>
                  <div className="space-y-3">
                    {hrZoneDefinitions.map((z, i) => (
                      <div key={z.name} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-app-card/30 border border-app-border/30 hover:border-app-border/60 transition-colors">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: z.color }} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-app-text font-bold uppercase tracking-wider">{z.name}</span>
                            <span className="text-[9px] text-app-muted font-bold uppercase tracking-tighter opacity-60">Z{i + 1}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="flex items-center gap-2 bg-app-bg/50 p-1 rounded-full border border-app-border px-3 h-9">
                            <input 
                              type="number" 
                              value={z.percentMin} 
                              onChange={(e) => {
                                const newZones = [...hrZoneDefinitions];
                                newZones[i].percentMin = parseInt(e.target.value) || 0;
                                setHrZoneDefinitions(newZones);
                              }}
                              className="bg-transparent w-10 text-xs text-center font-bold focus:outline-none"
                            />
                            <span className="text-app-muted font-bold text-[10px]">% —</span>
                            <input 
                              type="number" 
                              value={z.percentMax} 
                              onChange={(e) => {
                                const newZones = [...hrZoneDefinitions];
                                newZones[i].percentMax = parseInt(e.target.value) || 0;
                                setHrZoneDefinitions(newZones);
                              }}
                              className="bg-transparent w-10 text-xs text-center font-bold focus:outline-none"
                            />
                            <span className="text-[10px] text-app-muted font-bold">%</span>
                          </div>
                          <div className="text-xs text-app-text w-24 text-right font-mono font-bold tracking-tight shrink-0">
                            {Math.round((z.percentMin / 100) * (maxHR || 190))} – {z.percentMax >= 999 ? '∞' : Math.round((z.percentMax / 100) * (maxHR || 190))} <span className="text-[9px] uppercase">BPM</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'equipment' && (
              <motion.div
                key="equipment"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted">Bike Garage</h3>
                    <p className="text-[9px] text-app-muted font-medium mt-1 uppercase tracking-tight">Active bike profile defines the physics model</p>
                  </div>
                  <button 
                    onClick={() => addBike({
                      name: 'New Bike',
                      bikeWeight: 8,
                      startingMileage: 0,
                      ridingPosition: 'hoods',
                      surfaceType: 'road',
                      isDefault: false,
                      color: `hsl(${Math.random() * 360}, 70%, 55%)`
                    })}
                    className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-orange-600 transition-all transition-transform active:scale-95"
                  >
                    <Plus className="w-3 h-3" />
                    New Bike
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {equipment.map((bike) => (
                    <div 
                      key={bike.id}
                      className={cn(
                        "p-6 rounded-3xl border transition-all relative",
                        activeBikeId === bike.id 
                          ? "bg-orange-500/5 border-orange-500/40 shadow-xl shadow-orange-500/5" 
                          : "bg-app-bg/20 border-app-border"
                      )}
                    >
                      <div className="flex flex-col gap-8">
                        {/* Details */}
                        <div className="flex-1 space-y-6">
                          <div className="flex items-center justify-between gap-4">
                            <input 
                              type="text" 
                              value={bike.name}
                              onChange={(e) => updateBike(bike.id, { name: e.target.value })}
                              className="bg-transparent text-xl font-bold tracking-tight text-app-text focus:outline-none w-full border-b border-transparent focus:border-orange-500/30 pb-1"
                              placeholder="Bike Name"
                            />
                            <div className="flex flex-col items-end shrink-0">
                              <span className="text-[10px] text-app-muted uppercase tracking-[0.2em] font-bold">Odometer</span>
                              <span className="text-sm font-bold text-orange-500 font-mono">
                                {getBikeMileage(bike).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-[9px] font-sans">KM</span>
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                            <div className="space-y-2">
                              <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Bike Weight</label>
                              <div className="flex items-center bg-app-bg px-4 py-2 rounded-full border border-app-border focus-within:border-orange-500/30">
                                <input 
                                  type="number" 
                                  step="0.1"
                                  value={bike.bikeWeight}
                                  onChange={(e) => updateBike(bike.id, { bikeWeight: parseFloat(e.target.value) || 0 })}
                                  className="bg-transparent text-xs font-bold w-full focus:outline-none"
                                />
                                <span className="text-[10px] text-app-muted font-bold uppercase">KG</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Starting Odometer</label>
                              <div className="flex items-center bg-app-bg px-4 py-2 rounded-full border border-app-border focus-within:border-orange-500/30">
                                <input 
                                  type="number" 
                                  step="1"
                                  value={Math.round(bike.startingMileage / 1000)}
                                  onChange={(e) => updateBike(bike.id, { startingMileage: (parseFloat(e.target.value) || 0) * 1000 })}
                                  className="bg-transparent text-xs font-bold w-full focus:outline-none"
                                />
                                <span className="text-[10px] text-app-muted font-bold uppercase">KM</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 ml-1">
                                <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Aero Position</label>
                                <div className="group relative">
                                  <Info className="w-3 h-3 text-app-muted cursor-help" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-slate-100 text-[11px] border border-white/10 rounded-xl hidden group-hover:block z-50 shadow-2xl backdrop-blur-md font-medium leading-relaxed">
                                    Determines CdA (Aero Drag) for power estimation.
                                  </div>
                                </div>
                              </div>
                              <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border">
                                {(['tops', 'hoods', 'drops'] as const).map(p => (
                                  <button
                                    key={p}
                                    onClick={() => updateBike(bike.id, { ridingPosition: p })}
                                    className={cn(
                                      "flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-full transition-all",
                                      bike.ridingPosition === p ? "bg-orange-500 text-black shadow-md shadow-orange-500/20" : "text-app-muted hover:text-app-text"
                                    )}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 ml-1">
                                <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Surface Type</label>
                                <div className="group relative">
                                  <Info className="w-3 h-3 text-app-muted cursor-help" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-slate-100 text-[11px] border border-white/10 rounded-xl hidden group-hover:block z-50 shadow-2xl backdrop-blur-md font-medium leading-relaxed">
                                    Determines Crr (Rolling Resistance) for power estimation.
                                  </div>
                                </div>
                              </div>
                              <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border">
                                {(['road', 'gravel', 'mtb'] as const).map(s => (
                                  <button
                                    key={s}
                                    onClick={() => updateBike(bike.id, { surfaceType: s })}
                                    className={cn(
                                      "flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-full transition-all",
                                      bike.surfaceType === s ? "bg-orange-500 text-black shadow-md shadow-orange-500/20" : "text-app-muted hover:text-app-text"
                                    )}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 md:mt-0">
                              <div className="flex gap-4">
                                {activeBikeId !== bike.id && equipment.length > 1 && (
                                  <button 
                                    onClick={() => removeBike(bike.id)}
                                    className="flex items-center gap-2 text-red-400 hover:text-red-500 text-[10px] uppercase font-bold tracking-widest transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Remove
                                  </button>
                                )}
                              </div>
                              <button 
                                onClick={() => setActiveBikeId(bike.id)}
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-widest px-5 py-2 rounded-full transition-all self-end mb-1 mr-1",
                                  activeBikeId === bike.id 
                                    ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                                    : "text-app-muted hover:text-app-text border border-app-border bg-app-bg/50"
                                )}
                              >
                                {activeBikeId === bike.id ? 'Active' : 'Set Active'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {activeTab === 'intelligence' && (
              <motion.div
                key="intelligence"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div className="flex flex-col gap-6">
                  {/* Provider Selection */}
                  <div className="space-y-4">
                    <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">AI Provider</label>
                    <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border max-w-full overflow-x-auto no-scrollbar gap-1">
                      {(['gemini', 'openai', 'anthropic', 'groq', 'ollama', 'lm-studio'] as const).map(p => (
                        <button
                           key={p}
                           onClick={() => updateAiSettings({ provider: p })}
                           className={cn(
                             "px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                             aiSettings.provider === p ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" : "text-app-muted hover:text-app-text"
                           )}
                         >
                           {p === 'gemini' && <Globe className="w-3.5 h-3.5" />}
                           {p === 'openai' && <Sparkles className="w-3.5 h-3.5" />}
                           {p === 'anthropic' && <Brain className="w-3.5 h-3.5" />}
                           {p === 'groq' && <Zap className="w-3.5 h-3.5" />}
                           {p === 'ollama' && <Cpu className="w-3.5 h-3.5" />}
                           {p === 'lm-studio' && <Brain className="w-3.5 h-3.5" />}
                           <span>{p.replace('-', ' ')}</span>
                         </button>
                      ))}
                    </div>
                  </div>

                  {/* Cloud API Key Settings */}
                  {['gemini', 'openai', 'anthropic', 'groq'].includes(aiSettings.provider) && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">
                          {aiSettings.provider.toUpperCase()} API Key
                        </label>
                        <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full px-5 py-3 focus-within:border-orange-500/50 transition-colors">
                          <Key className="w-4 h-4 text-orange-500" />
                          <input 
                            type="password" 
                            placeholder={`Enter ${aiSettings.provider} key...`}
                            value={
                              aiSettings.provider === 'gemini' ? aiSettings.geminiApiKey :
                              aiSettings.provider === 'openai' ? aiSettings.openaiApiKey :
                              aiSettings.provider === 'anthropic' ? aiSettings.anthropicApiKey :
                              aiSettings.groqApiKey
                            } 
                            onChange={(e) => {
                              const key = e.target.value;
                              if (aiSettings.provider === 'gemini') updateAiSettings({ geminiApiKey: key });
                              else if (aiSettings.provider === 'openai') updateAiSettings({ openaiApiKey: key });
                              else if (aiSettings.provider === 'anthropic') updateAiSettings({ anthropicApiKey: key });
                              else updateAiSettings({ groqApiKey: key });
                            }}
                            className="bg-transparent w-full text-sm font-bold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Model Name</label>
                        <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full px-5 py-3 focus-within:border-orange-500/50 transition-colors">
                          <Brain className="w-4 h-4 text-orange-500" />
                          <input 
                            type="text" 
                            placeholder={
                              aiSettings.provider === 'gemini' ? "gemini-3-flash-preview" :
                              aiSettings.provider === 'openai' ? "gpt-4o" : 
                              aiSettings.provider === 'anthropic' ? "claude-3-5-sonnet-20240620" :
                              "llama-3.3-70b-versatile"
                            }
                            value={
                              aiSettings.provider === 'gemini' ? aiSettings.geminiModel :
                              aiSettings.provider === 'openai' ? aiSettings.openaiModel :
                              aiSettings.provider === 'anthropic' ? aiSettings.anthropicModel :
                              aiSettings.groqModel
                            } 
                            onChange={(e) => {
                              const val = e.target.value;
                              if (aiSettings.provider === 'gemini') updateAiSettings({ geminiModel: val });
                              else if (aiSettings.provider === 'openai') updateAiSettings({ openaiModel: val });
                              else if (aiSettings.provider === 'anthropic') updateAiSettings({ anthropicModel: val });
                              else updateAiSettings({ groqModel: val });
                            }}
                            className="bg-transparent w-full text-sm font-bold focus:outline-none"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-app-muted font-medium ml-1">Private tokens used to communicate directly with AI vendors over HTTPS.</p>
                    </div>
                  )}

                  {/* Local Server Settings */}
                  {['ollama', 'lm-studio'].includes(aiSettings.provider) && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Local Server URL</label>
                          <button 
                            onClick={() => {
                              if (aiSettings.provider === 'ollama') {
                                updateAiSettings({ 
                                  ollamaUrl: 'http://127.0.0.1:11434',
                                  ollamaModel: 'gemma3:4b'
                                });
                              } else {
                                updateAiSettings({ 
                                  lmStudioUrl: 'http://127.0.0.1:1234',
                                  lmStudioModel: 'phi-4-mini-instruct'
                                });
                              }
                            }}
                            className="text-[9px] text-orange-500 hover:text-orange-600 font-bold uppercase tracking-widest transition-colors"
                          >
                            Reset Default
                          </button>
                        </div>
                        <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full px-5 py-3 focus-within:border-orange-500/50 transition-colors">
                          <Globe className="w-4 h-4 text-orange-500" />
                          <input 
                            type="text" 
                            placeholder={aiSettings.provider === 'ollama' ? "http://127.0.0.1:11434" : "http://127.0.0.1:1234"}
                            value={aiSettings.provider === 'ollama' ? aiSettings.ollamaUrl : aiSettings.lmStudioUrl} 
                            onChange={(e) => {
                              if (aiSettings.provider === 'ollama') updateAiSettings({ ollamaUrl: e.target.value });
                              else updateAiSettings({ lmStudioUrl: e.target.value });
                            }}
                            className="bg-transparent w-full text-sm font-bold focus:outline-none"
                          />
                        </div>
                        <p className="text-[10px] text-app-muted font-medium ml-1">Private connection to your local machine hardware.</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between ml-1">
                          <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Local Model ID</label>
                          <button 
                            onClick={() => {
                              if (aiSettings.provider === 'ollama') {
                                updateAiSettings({ 
                                  ollamaUrl: 'http://127.0.0.1:11434',
                                  ollamaModel: 'gemma3:4b'
                                });
                              } else {
                                updateAiSettings({ 
                                  lmStudioUrl: 'http://127.0.0.1:1234',
                                  lmStudioModel: 'phi-4-mini-instruct'
                                });
                              }
                            }}
                            className="text-[9px] text-orange-500 hover:text-orange-600 font-bold uppercase tracking-widest transition-colors"
                          >
                            Reset Default
                          </button>
                        </div>
                        <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full px-5 py-3 focus-within:border-orange-500/50 transition-colors">
                          <Cpu className="w-4 h-4 text-orange-500" />
                          <input 
                            type="text" 
                            placeholder={aiSettings.provider === 'ollama' ? "gemma3:4b" : "phi-4-mini-instruct"}
                            value={aiSettings.provider === 'ollama' ? aiSettings.ollamaModel : aiSettings.lmStudioModel} 
                            onChange={(e) => {
                              if (aiSettings.provider === 'ollama') updateAiSettings({ ollamaModel: e.target.value });
                              else updateAiSettings({ lmStudioModel: e.target.value });
                            }}
                            className="bg-transparent w-full text-sm font-bold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Coach Persona (System Prompt)</label>
                    <div className="flex gap-3 bg-app-bg/50 border border-app-border rounded-3xl px-5 py-4 focus-within:border-orange-500/50 transition-colors">
                      <MessageSquare className="w-4 h-4 text-orange-500 shrink-0 mt-1" />
                      <textarea 
                        rows={12}
                        value={aiSettings.systemPrompt} 
                        onChange={(e) => updateAiSettings({ systemPrompt: e.target.value })}
                        className="bg-transparent w-full text-sm font-medium focus:outline-none resize-y min-h-[300px] leading-relaxed custom-scrollbar"
                        placeholder="Define how the coach should speak..."
                      />
                    </div>
                  </div>

                  {/* Wellness Context Window */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1 ml-1">
                      <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold">Wellness Context Window</label>
                      <p className="text-[9px] text-app-muted font-medium uppercase tracking-tight">Number of days of Sleep and HRV data sent to the Coach</p>
                    </div>
                    <div className="flex bg-app-bg/50 p-1 rounded-full border border-app-border w-fit">
                      {[7, 14, 21, 28].map((days) => (
                        <button
                          key={days}
                          onClick={() => updateAiSettings({ wellnessContextDays: days })}
                          className={cn(
                            "px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all",
                            (aiSettings.wellnessContextDays || 7) === days 
                              ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                              : "text-app-muted hover:text-app-text"
                          )}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* External API Keys 
                      Implementation Note: These keys follow a priority waterfall.
                      1. Settings Panel (Local Storage)
                      2. Build-time ENV variables (VITE_*)
                  */}
                  <div className="space-y-6 pt-4 border-t border-app-border/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-orange-500" />
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-text">External Infrastructure</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">Google Maps API Key</label>
                        <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full px-5 py-3 focus-within:border-orange-500/50 transition-colors">
                          <Globe className="w-4 h-4 text-orange-500" />
                          <input 
                            type="password" 
                            placeholder="VITE_GOOGLE_MAPS_API_KEY fallback..."
                            value={aiSettings.googleMapsApiKey || ''} 
                            onChange={(e) => updateAiSettings({ googleMapsApiKey: e.target.value })}
                            className="bg-transparent w-full text-sm font-bold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-app-muted uppercase tracking-widest font-bold ml-1">OpenWeatherMap API Key</label>
                        <div className="flex items-center gap-3 bg-app-bg/50 border border-app-border rounded-full px-5 py-3 focus-within:border-orange-500/50 transition-colors">
                          <Plus className="w-4 h-4 text-orange-500" />
                          <input 
                            type="password" 
                            placeholder="VITE_OPENWEATHERMAP_API_KEY fallback..."
                            value={aiSettings.openWeatherMapApiKey || ''} 
                            onChange={(e) => updateAiSettings({ openWeatherMapApiKey: e.target.value })}
                            className="bg-transparent w-full text-sm font-bold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-app-muted font-medium ml-1">
                      These keys prioritize the Settings Panel (Local Storage). If empty, the app falls back to build-time environment variables defined in your .env or the Vercel dashboard.
                    </p>
                  </div>

                  {/* Apple Intelligence & Siri Section */}
                  <div className="space-y-4 pt-4 border-t border-app-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-orange-500" />
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-text">Apple Intelligence & Siri (macOS)</h3>
                      </div>
                      <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        Siri • Type-to-Siri • Spotlight
                      </span>
                    </div>

                    <div className="p-5 rounded-3xl bg-app-bg/30 border border-app-border space-y-4">
                      <p className="text-xs text-app-muted leading-relaxed">
                        Access your Velo Readiness, Form (TSB), and AI Coaching assistant directly through macOS Siri, Type-to-Siri, Spotlight search (<kbd className="px-1.5 py-0.5 rounded bg-app-card border border-app-border text-[10px]">⌘ Space</kbd>), or the Apple Shortcuts app.
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('open-siri-modal'));
                          }}
                          className="flex items-center gap-2 py-2 px-5 rounded-full bg-orange-500 hover:bg-orange-600 text-black text-[10px] font-bold uppercase tracking-widest transition-all shadow-md shadow-orange-500/20"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>View Siri Setup & Shortcuts</span>
                        </button>
                        <span className="text-[10px] text-app-muted font-medium">
                          Works in Safari, Chrome & Tauri Desktop
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'maintenance' && (
              <motion.div
                key="maintenance"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-10"
              >
                {/* 
                   Maintenance & Portability Section
                   Provides mechanisms for full application state backup and restoration.
                */}
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted">Wellness Data (Garmin Exports)</h3>
                    <p className="text-[11px] text-app-muted leading-relaxed">
                      Import your Sleep and HRV CSV exports from Garmin Connect. These files provide recovery context for your coaching analysis.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Sleep Import Card */}
                    <div className="p-6 rounded-3xl bg-app-bg/30 border border-app-border flex flex-col justify-between gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                              <Moon className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-app-text">Sleep Data</span>
                              <span className="text-[9px] text-app-muted uppercase font-bold tracking-tight mt-0.5">{sleepHistory.length} Records Loaded</span>
                            </div>
                          </div>
                          {sleepHistory.length > 0 && (
                            <button 
                              onClick={() => setSleepHistory([])}
                              className="p-2 text-app-muted hover:text-red-400 transition-colors"
                              title="Clear Sleep History"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <p className="text-[10px] text-app-muted leading-relaxed">
                          Imports sleep score, duration, resting HR, Pulse Ox (SpO₂), respiration, and sleep stages.
                        </p>
                      </div>

                      <div className="relative pt-2">
                        <input 
                          type="file" 
                          accept=".csv"
                          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const content = event.target?.result as string;
                                const data = parseSleepCSV(content);
                                if (data.length > 0) {
                                  // Merge with existing avoiding duplicates
                                  setSleepHistory(prev => {
                                    const merged = [...prev];
                                    data.forEach(newItem => {
                                      const idx = merged.findIndex(m => m.date === newItem.date);
                                      if (idx >= 0) {
                                        const existing = merged[idx];
                                        merged[idx] = {
                                          ...existing,
                                          ...newItem,
                                          score: newItem.score || existing.score,
                                          restingHeartRate: newItem.restingHeartRate || existing.restingHeartRate,
                                          readinessScore: newItem.readinessScore || existing.readinessScore,
                                          pulseOx: newItem.pulseOx || existing.pulseOx,
                                          respiration: newItem.respiration || existing.respiration,
                                          hrvStatus: newItem.hrvStatus || existing.hrvStatus,
                                          quality: newItem.quality || existing.quality,
                                          duration: newItem.duration || existing.duration,
                                          sleepNeed: newItem.sleepNeed || existing.sleepNeed,
                                          bedtime: newItem.bedtime || existing.bedtime,
                                          wakeTime: newItem.wakeTime || existing.wakeTime
                                        };
                                      } else {
                                        merged.push(newItem);
                                      }
                                    });
                                    return merged.sort((a, b) => a.date.localeCompare(b.date));
                                  });
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <button className="w-full bg-app-card border border-app-border hover:border-orange-500/30 text-app-text px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm">
                          Upload Sleep CSV
                        </button>
                      </div>
                    </div>

                    {/* HRV Import Card */}
                    <div className="p-6 rounded-3xl bg-app-bg/30 border border-app-border flex flex-col justify-between gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                              <RefreshCw className="w-5 h-5 text-purple-500" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-app-text">HRV Status</span>
                              <span className="text-[9px] text-app-muted uppercase font-bold tracking-tight mt-0.5">{hrvHistory.length} Records Loaded</span>
                            </div>
                          </div>
                          {hrvHistory.length > 0 && (
                            <button 
                              onClick={() => setHrvHistory([])}
                              className="p-2 text-app-muted hover:text-red-400 transition-colors"
                              title="Clear HRV History"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <p className="text-[10px] text-app-muted leading-relaxed">
                          Imports overnight HRV, baseline ranges (min-max bounds), and 7-day rolling averages.
                        </p>
                      </div>

                      <div className="relative pt-2">
                        <input 
                          type="file" 
                          accept=".csv"
                          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const content = event.target?.result as string;
                                const data = parseHRVCSV(content);
                                if (data.length > 0) {
                                  setHrvHistory(prev => {
                                    const merged = [...prev];
                                    data.forEach(newItem => {
                                      const idx = merged.findIndex(m => m.date === newItem.date);
                                      if (idx >= 0) {
                                        const existing = merged[idx];
                                        merged[idx] = {
                                          ...existing,
                                          ...newItem,
                                          overnightHRV: newItem.overnightHRV || existing.overnightHRV,
                                          baselineMin: newItem.baselineMin || existing.baselineMin,
                                          baselineMax: newItem.baselineMax || existing.baselineMax,
                                          sevenDayAvg: newItem.sevenDayAvg || existing.sevenDayAvg
                                        };
                                      } else {
                                        merged.push(newItem);
                                      }
                                    });
                                    return merged.sort((a, b) => a.date.localeCompare(b.date));
                                  });
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <button className="w-full bg-app-card border border-app-border hover:border-purple-500/30 text-app-text px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm">
                          Upload HRV CSV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted">Data Portability</h3>
                    <p className="text-[11px] text-app-muted leading-relaxed">
                      Export your application configuration, including secret API keys, physiological thresholds, and equipment profiles into a single JSON file. Note: Activity history is excluded to keep backups portable.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Export Card */}
                    <div className="p-6 rounded-3xl bg-app-bg/30 border border-app-border flex flex-col gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                          <Check className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-app-text">Config Bundle</span>
                          <span className="text-[9px] text-app-muted uppercase font-bold tracking-tight mt-0.5">Settings & Secrets</span>
                        </div>
                      </div>
                      <button 
                        onClick={exportSettings}
                        className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border border-orange-500/20"
                      >
                        Download Config
                      </button>
                    </div>

                    {/* Import Card */}
                    <div className="p-6 rounded-3xl bg-app-bg/30 border border-app-border flex flex-col gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-app-text">Restore State</span>
                          <span className="text-[9px] text-app-muted uppercase font-bold tracking-tight mt-0.5">Import backup file</span>
                        </div>
                      </div>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept=".json"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const content = event.target?.result as string;
                                const success = importSettings(content);
                                if (success) setImportStatus('success');
                                else setImportStatus('error');
                              };
                              reader.readAsText(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <button 
                          className={cn(
                            "w-full px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
                            importStatus === 'success' ? "bg-green-500 text-black border-green-500" :
                            importStatus === 'error' ? "bg-red-500 text-white border-red-500" :
                            "bg-app-card border-app-border text-app-muted hover:text-app-text"
                          )}
                        >
                          {importStatus === 'success' ? 'Settings Imported!' :
                           importStatus === 'error' ? 'Invalid File Format' :
                           'Select Backup File'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-orange-500/5 border border-orange-500/20">
                  <div className="flex gap-4">
                    <Info className="w-5 h-5 text-orange-500 shrink-0" />
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-orange-500">Security Implementation</h4>
                      <p className="text-[11px] text-app-muted leading-relaxed">
                        VeloAnalytics follows a "Private-First" architecture. All secrets are stored directly in your browser's <code className="bg-app-bg/50 px-1 rounded">localStorage</code> or served via your private build environment. We never proxy your data through third-party servers. Your keys remain yours.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'experimental' && (
              <motion.div
                key="experimental"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-8"
              >
                <div className="flex flex-col gap-2 px-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted">Laboratory Settings</h3>
                  <p className="text-[11px] text-app-muted leading-relaxed">
                    Test cutting-edge features that are currently in development. These algorithms are hypothesized abstractions and may change frequently.
                  </p>
                </div>

                <div className="space-y-6 bg-app-bg/30 border border-app-border rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                      <FlaskConical className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-app-text">Custom Velo Readiness</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500/80">Experimental Algorithm</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-app-card/50 border border-app-border/50 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-app-text">Enable Hypothesized Weights</span>
                          <p className="text-[9px] text-app-muted font-medium mt-1 uppercase tracking-tight max-w-[400px] leading-relaxed">
                            Uses Pillar Suppression logic: (Base * 0.30) + (Base * 0.70 * SuppressionRatio). One "Red" metric suppresses the score without completely zeroing it out.
                          </p>
                        </div>
                        <button 
                          onClick={() => updateAiSettings({ useExperimentalReadiness: !aiSettings.useExperimentalReadiness })}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative shrink-0",
                            aiSettings.useExperimentalReadiness ? "bg-orange-500" : "bg-app-border"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                            aiSettings.useExperimentalReadiness ? "left-5.5" : "left-0.5"
                          )} />
                        </button>
                      </div>
                      
                      <div className="pt-4 border-t border-app-border/30">
                        <h4 className="text-[9px] font-bold uppercase tracking-widest text-app-muted mb-3">Formula Components</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-app-muted uppercase font-bold">Sleep</span>
                            <span className="text-xs font-bold text-app-text">35%</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-app-muted uppercase font-bold">Recovery</span>
                            <span className="text-xs font-bold text-app-text">25%</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-app-muted uppercase font-bold">HRV</span>
                            <span className="text-xs font-bold text-app-text">20%</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-app-muted uppercase font-bold">Load</span>
                            <span className="text-xs font-bold text-app-text">20%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                      <p className="text-[10px] text-orange-500/80 font-medium leading-relaxed italic">
                        "This algorithm prioritizes recovery constraints and physiological suppression (HRV) over raw sleep duration. High training load is treated as a negative for readiness."
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="p-6 sm:p-8 border-t border-app-border/50 bg-app-card/30 backdrop-blur-md">
          <button 
            onClick={() => setShowSettings(false)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black px-8 py-3.5 sm:py-4 rounded-full font-bold transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] uppercase tracking-widest text-[11px] sm:text-xs"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
