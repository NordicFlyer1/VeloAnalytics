import React from 'react';
import { Settings, Zap, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

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
      <div className="relative bg-app-card border border-app-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-in fade-in zoom-in duration-300 custom-scrollbar">
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
                <p className="text-[10px] text-app-muted uppercase tracking-widest font-medium">Leave empty to use estimated CP</p>
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
                <p className="text-[10px] text-app-muted uppercase tracking-widest font-medium">Leave empty to use estimated W'</p>
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
  );
};
