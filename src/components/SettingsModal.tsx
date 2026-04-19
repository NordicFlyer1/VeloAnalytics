import React from 'react';
import { Settings, Zap, Activity, Info, Bike } from 'lucide-react';
import { cn } from '../lib/utils';
import { RidingPosition, SurfaceType } from '../types';

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
  bikeWeight: number;
  setBikeWeight: (w: number) => void;
  enableVirtualPower: boolean;
  setEnableVirtualPower: (e: boolean) => void;
  ridingPosition: RidingPosition;
  setRidingPosition: (p: RidingPosition) => void;
  surfaceType: SurfaceType;
  setSurfaceType: (s: SurfaceType) => void;
  cpWPrime: any;
  powerZoneDefinitions: any[];
  setPowerZoneDefinitions: (zones: any[]) => void;
  hrZoneDefinitions: any[];
  setHrZoneDefinitions: (zones: any[]) => void;
}

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
  bikeWeight,
  setBikeWeight,
  enableVirtualPower,
  setEnableVirtualPower,
  ridingPosition,
  setRidingPosition,
  surfaceType,
  setSurfaceType,
  cpWPrime,
  powerZoneDefinitions,
  setPowerZoneDefinitions,
  hrZoneDefinitions,
  setHrZoneDefinitions
}) => {
  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
      <div className="relative bg-app-card border border-app-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-5 sm:p-8 border-b border-app-border flex items-center justify-between bg-app-card/50 backdrop-blur-md">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            Training Settings
          </h2>
          <button 
            onClick={() => setShowSettings(false)}
            className="text-app-muted hover:text-app-text transition-colors text-[10px] font-bold uppercase tracking-widest px-2 py-1"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar space-y-8 sm:space-y-12">
          {/* Thresholds */}
          <section className="space-y-4 sm:space-y-6">
            <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted border-b border-app-border/50 pb-2">Thresholds</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs text-app-text/60 ml-1">Critical Power (CP)</label>
                <div className="flex items-center gap-2 sm:gap-3 bg-app-card border border-app-border rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus-within:border-orange-500/50 transition-colors">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                  <input 
                    type="number" 
                    value={cp} 
                    onChange={(e) => setCP(parseInt(e.target.value) || 0)}
                    className="bg-transparent w-full text-sm font-bold focus:outline-none"
                  />
                  <span className="text-[9px] sm:text-[10px] text-app-muted uppercase tracking-widest font-bold">Watts</span>
                </div>
                <div className="flex items-center gap-2 pt-1 ml-1">
                  <button 
                    onClick={() => setAutoUpdateCP(!autoUpdateCP)}
                    className={cn(
                      "w-7 h-3.5 sm:w-8 sm:h-4 rounded-full transition-all relative",
                      autoUpdateCP ? "bg-orange-500" : "bg-app-border"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white transition-all",
                      autoUpdateCP ? "left-4 sm:left-4.5" : "left-0.5"
                    )} />
                  </button>
                  <span className="text-[9px] sm:text-[10px] text-app-muted font-medium">Auto-update CP</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs text-app-text/60 ml-1">Maximum Heart Rate</label>
                <div className="flex items-center gap-2 sm:gap-3 bg-app-card border border-app-border rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus-within:border-red-500/50 transition-colors">
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                  <input 
                    type="number" 
                    value={maxHR} 
                    onChange={(e) => setMaxHR(parseInt(e.target.value) || 0)}
                    className="bg-transparent w-full text-sm font-bold focus:outline-none"
                  />
                  <span className="text-[9px] sm:text-[10px] text-app-muted uppercase tracking-widest font-bold">BPM</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs text-app-text/60 ml-1">Manual CP Override</label>
                <div className="flex items-center gap-2 sm:gap-3 bg-app-card border border-app-border rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus-within:border-orange-500/50 transition-colors">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                  <input 
                    type="number" 
                    placeholder={cpWPrime?.cp ? Math.round(cpWPrime.cp || 0).toString() : "Estimated"}
                    value={manualCP ?? ''} 
                    onChange={(e) => setManualCP(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-transparent w-full text-sm font-bold focus:outline-none"
                  />
                  <span className="text-[9px] sm:text-[10px] text-app-muted uppercase tracking-widest font-bold">WATTS</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs text-app-text/60 ml-1">Manual W' Capacity</label>
                <div className="flex items-center gap-2 sm:gap-3 bg-app-card border border-app-border rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus-within:border-purple-500/50 transition-colors">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                  <input 
                    type="number" 
                    placeholder={cpWPrime?.wPrime ? Math.round(cpWPrime.wPrime || 0).toString() : "Estimated"}
                    value={manualWPrime ?? ''} 
                    onChange={(e) => setManualWPrime(e.target.value ? parseInt(e.target.value) : null)}
                    className="bg-transparent w-full text-sm font-bold focus:outline-none"
                  />
                  <span className="text-[9px] sm:text-[10px] text-app-muted uppercase tracking-widest font-bold">KJ</span>
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] sm:text-xs text-app-text/60 ml-1">Body Weight</label>
                <div className="flex items-center gap-2 sm:gap-3 bg-app-card border border-app-border rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus-within:border-blue-500/50 transition-colors">
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="Enter weight"
                    value={userWeight ?? ''} 
                    onChange={(e) => setUserWeight(e.target.value ? parseFloat(e.target.value) : null)}
                    className="bg-transparent w-full text-sm font-bold focus:outline-none"
                  />
                  <div className="flex bg-app-bg/50 p-0.5 sm:p-1 rounded-lg border border-app-border shrink-0">
                    {(['kg', 'lbs'] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => setWeightUnit(u)}
                        className={cn(
                          "px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest rounded transition-all",
                          weightUnit === u 
                            ? "bg-orange-500 text-black" 
                            : "text-app-muted hover:text-app-text"
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[9px] text-app-muted uppercase tracking-widest font-bold ml-1 opacity-60">Power-to-weight (W/KG)</p>
              </div>
            </div>
          </section>

          {/* Equipment & Virtual Power */}
          <section className="space-y-4 sm:space-y-6">
            <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted border-b border-app-border/50 pb-2">Equipment & Virtual Power</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs text-app-text/60 ml-1">Bike Weight</label>
                <div className="flex items-center gap-2 sm:gap-3 bg-app-card border border-app-border rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus-within:border-blue-500/50 transition-colors">
                  <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                  <input 
                    type="number"
                    step="0.1"
                    value={bikeWeight} 
                    onChange={(e) => setBikeWeight(parseFloat(e.target.value) || 0)}
                    className="bg-transparent w-full text-sm font-bold focus:outline-none"
                  />
                  <span className="text-[9px] sm:text-[10px] text-app-muted uppercase tracking-widest font-bold">KG</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs text-app-text/60 ml-1">Virtual Power Calculation</label>
                <div className="flex items-center gap-2 sm:gap-3 bg-app-card border border-app-border rounded-xl px-3 sm:px-4 py-2 sm:py-3 transition-colors">
                  <div className="flex items-center gap-2 flex-1">
                    <button 
                      onClick={() => setEnableVirtualPower(!enableVirtualPower)}
                      className={cn(
                        "w-8 h-4 sm:w-10 sm:h-5 rounded-full transition-all relative shrink-0",
                        enableVirtualPower ? "bg-orange-500" : "bg-app-border"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white transition-all",
                        enableVirtualPower ? "left-4.5 sm:left-5.5" : "left-0.5"
                      )} />
                    </button>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-app-muted">
                      {enableVirtualPower ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-app-muted cursor-help" />
                    <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-app-card border border-app-border rounded-lg text-[9px] text-app-muted leading-relaxed hidden group-hover:block z-20 shadow-xl">
                      Calculates power from speed, weight, and grade if power data is missing.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs text-app-text/60 ml-1">Riding Position</label>
                <div className="flex bg-app-card/50 p-1 rounded-xl border border-app-border">
                  {(['tops', 'hoods', 'drops'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setRidingPosition(p)}
                      className={cn(
                        "flex-1 py-1.5 sm:py-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        ridingPosition === p 
                          ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                          : "text-app-muted hover:text-app-text"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs text-app-text/60 ml-1">Road Surface</label>
                <div className="flex bg-app-card/50 p-1 rounded-xl border border-app-border">
                  {(['road', 'gravel', 'mtb'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSurfaceType(s)}
                      className={cn(
                        "flex-1 py-1.5 sm:py-2 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
                        surfaceType === s 
                          ? "bg-orange-500 text-black shadow-lg shadow-orange-500/20" 
                          : "text-app-muted hover:text-app-text"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Power Zones */}
          <section className="space-y-4 sm:space-y-6">
            <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted border-b border-app-border/50 pb-2">Power Zones (%)</h3>
            <div className="space-y-3 sm:space-y-4">
              {powerZoneDefinitions.map((z, i) => (
                <div key={z.name} className="flex items-center gap-3 sm:gap-4">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                  <span className="text-[10px] sm:text-xs text-app-text/60 w-24 sm:w-40 shrink-0 uppercase tracking-wide font-medium truncate">{z.name}</span>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                    <input 
                      type="number" 
                      value={z.percentMin} 
                      onChange={(e) => {
                        const newZones = [...powerZoneDefinitions];
                        newZones[i].percentMin = parseInt(e.target.value) || 0;
                        setPowerZoneDefinitions(newZones);
                      }}
                      className="bg-app-card border border-app-border rounded-lg px-2 py-1 w-12 sm:w-16 text-[10px] sm:text-xs text-center font-bold"
                    />
                    <span className="text-[9px] sm:text-[10px] text-app-muted font-bold">-</span>
                    <input 
                      type="number" 
                      value={z.percentMax} 
                      onChange={(e) => {
                        const newZones = [...powerZoneDefinitions];
                        newZones[i].percentMax = parseInt(e.target.value) || 0;
                        setPowerZoneDefinitions(newZones);
                      }}
                      className="bg-app-card border border-app-border rounded-lg px-2 py-1 w-12 sm:w-16 text-[10px] sm:text-xs text-center font-bold"
                    />
                    <span className="text-[9px] sm:text-[10px] text-app-muted font-bold">%</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-app-muted w-16 sm:w-24 text-right font-mono font-bold">
                    {Math.round((z.percentMin / 100) * cp)}-{z.percentMax === 999 ? '∞' : Math.round((z.percentMax / 100) * cp)}W
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* HR Zones */}
          <section className="space-y-4 sm:space-y-6">
            <h3 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-app-muted border-b border-app-border/50 pb-2">Heart Rate Zones (%)</h3>
            <div className="space-y-3 sm:space-y-4">
              {hrZoneDefinitions.map((z, i) => (
                <div key={z.name} className="flex items-center gap-3 sm:gap-4">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: z.color }} />
                  <span className="text-[10px] sm:text-xs text-app-text/60 w-24 sm:w-40 shrink-0 uppercase tracking-wide font-medium truncate">{z.name}</span>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                    <input 
                      type="number" 
                      value={z.percentMin} 
                      onChange={(e) => {
                        const newZones = [...hrZoneDefinitions];
                        newZones[i].percentMin = parseInt(e.target.value) || 0;
                        setHrZoneDefinitions(newZones);
                      }}
                      className="bg-app-card border border-app-border rounded-lg px-2 py-1 w-12 sm:w-16 text-[10px] sm:text-xs text-center font-bold"
                    />
                    <span className="text-[9px] sm:text-[10px] text-app-muted font-bold">-</span>
                    <input 
                      type="number" 
                      value={z.percentMax} 
                      onChange={(e) => {
                        const newZones = [...hrZoneDefinitions];
                        newZones[i].percentMax = parseInt(e.target.value) || 0;
                        setHrZoneDefinitions(newZones);
                      }}
                      className="bg-app-card border border-app-border rounded-lg px-2 py-1 w-12 sm:w-16 text-[10px] sm:text-xs text-center font-bold"
                    />
                    <span className="text-[9px] sm:text-[10px] text-app-muted font-bold">%</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-app-muted w-16 sm:w-24 text-right font-mono font-bold">
                    {Math.round((z.percentMin / 100) * maxHR)}-{z.percentMax === 999 ? '∞' : Math.round((z.percentMax / 100) * maxHR)}BPM
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        
        <div className="p-5 sm:p-8 border-t border-app-border/50 bg-app-card/30 backdrop-blur-md">
          <button 
            onClick={() => setShowSettings(false)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black px-8 py-3 sm:py-4 rounded-full font-bold transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] uppercase tracking-widest text-[11px] sm:text-xs"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
