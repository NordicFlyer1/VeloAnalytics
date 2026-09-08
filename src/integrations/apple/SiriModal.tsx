import React, { useState } from 'react';
import { Sparkles, Command, Mic, Copy, Check, Download, Laptop, Activity, Calendar, Zap } from 'lucide-react';
import { AppleSiriSnapshot, generateAppleShortcutPayload } from './appleBridge';

interface SiriModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: AppleSiriSnapshot | null;
}

export const SiriModal: React.FC<SiriModalProps> = ({ isOpen, onClose, snapshot }) => {
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'quickstart' | 'shortcuts' | 'tauri'>('quickstart');

  if (!isOpen) return null;

  const shortcutData = generateAppleShortcutPayload(snapshot);

  const handleCopy = () => {
    navigator.clipboard.writeText(shortcutData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([shortcutData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'velo-siri-context.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-app-card border border-app-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-app-border flex items-center justify-between bg-app-card/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-app-text">Apple Intelligence & Siri Integration</h2>
              <p className="text-[10px] text-app-muted uppercase tracking-widest font-bold mt-0.5">
                Type-to-Siri, Spotlight & Shortcuts for macOS
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-app-muted hover:text-app-text transition-colors text-[10px] font-bold uppercase tracking-widest px-3 py-1.5"
          >
            Close
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex px-6 pt-4 border-b border-app-border/40 gap-2 bg-app-card/30">
          <button
            onClick={() => setActiveSubTab('quickstart')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
              activeSubTab === 'quickstart'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-app-muted hover:text-app-text'
            }`}
          >
            Overview & Queries
          </button>
          <button
            onClick={() => setActiveSubTab('shortcuts')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
              activeSubTab === 'shortcuts'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-app-muted hover:text-app-text'
            }`}
          >
            Web Shortcuts
          </button>
          <button
            onClick={() => setActiveSubTab('tauri')}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
              activeSubTab === 'tauri'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-app-muted hover:text-app-text'
            }`}
          >
            Tauri Native Build (Xcode)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-app-text">
          {activeSubTab === 'quickstart' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-app-bg/50 border border-app-border space-y-3">
                <div className="flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-wider">
                  <Mic className="w-4 h-4" />
                  <span>Voice or Type-to-Siri Supported</span>
                </div>
                <p className="text-xs text-app-muted leading-relaxed">
                  You can use spoken Siri commands and macOS <strong>Type to Siri / Spotlight</strong> (<kbd className="px-1.5 py-0.5 rounded bg-app-card border border-app-border text-[10px]">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-app-card border border-app-border text-[10px]">Space</kbd> or your configured Type to Siri shortcut).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 rounded-xl bg-app-card border border-app-border/70 text-xs">
                    <p className="font-semibold text-app-text">"What is my Velo Readiness?"</p>
                    <p className="text-[10px] text-app-muted mt-1">Returns readiness score, recovery status, and sleep metrics.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-app-card border border-app-border/70 text-xs">
                    <p className="font-semibold text-app-text">"What was my last ride?"</p>
                    <p className="text-[10px] text-app-muted mt-1">Reports date, distance, xPower, and BikeScore™.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-app-card border border-app-border/70 text-xs">
                    <p className="font-semibold text-app-text">"How much did I ride this week?"</p>
                    <p className="text-[10px] text-app-muted mt-1">Returns rolling 7-day total distance, hours, and BikeScore™.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-app-card border border-app-border/70 text-xs">
                    <p className="font-semibold text-app-text">"Check my 28-day training load"</p>
                    <p className="text-[10px] text-app-muted mt-1">Reports 4-week total rides, mileage, and chronic BikeScore™.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-app-card border border-app-border/70 text-xs">
                    <p className="font-semibold text-app-text">"Ask VeloCoach if I should ride"</p>
                    <p className="text-[10px] text-app-muted mt-1">Deep-links straight to the AI Coaching Drawer.</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-app-card border border-app-border/70 text-xs">
                    <p className="font-semibold text-app-text">"Spotlight: velo readiness"</p>
                    <p className="text-[10px] text-app-muted mt-1">Shows a live visual snippet right in macOS Spotlight.</p>
                  </div>
                </div>
              </div>

              {snapshot && (
                <div className="space-y-3">
                  {/* Readiness & Form card */}
                  <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-orange-500">Live Siri State Snapshot</span>
                      <span className="text-[10px] text-app-muted">{new Date(snapshot.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-bold text-app-text">{snapshot.readinessScore}/100</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500">
                        {snapshot.readinessStatus}
                      </span>
                      <span className="text-xs text-app-muted">SB: {snapshot.stressBalance > 0 ? `+${snapshot.stressBalance}` : snapshot.stressBalance} | STS: {snapshot.shortTermStress} | LTS: {snapshot.longTermStress}</span>
                    </div>
                  </div>

                  {/* Real Ride & Training Blocks Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-app-bg/50 border border-app-border">
                      <div className="flex items-center gap-1.5 text-app-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                        <Activity className="w-3.5 h-3.5 text-orange-500" />
                        <span>Latest Ride</span>
                      </div>
                      {snapshot.latestRide ? (
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-app-text truncate">{snapshot.latestRide.name}</p>
                          <p className="text-[10px] text-app-muted">{snapshot.latestRide.date} • {snapshot.latestRide.distanceKm} KM • {snapshot.latestRide.bikeScore} BS</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-app-muted italic">No rides logged yet</p>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-app-bg/50 border border-app-border">
                      <div className="flex items-center gap-1.5 text-app-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                        <Zap className="w-3.5 h-3.5 text-orange-500" />
                        <span>7-Day Total</span>
                      </div>
                      <p className="text-xs font-semibold text-app-text">
                        {snapshot.trainingBlock7Days.totalRides} rides • {snapshot.trainingBlock7Days.totalKm} KM
                      </p>
                      <p className="text-[10px] text-app-muted">
                        {snapshot.trainingBlock7Days.totalHours} hrs • {snapshot.trainingBlock7Days.totalBikeScore} BS
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-app-bg/50 border border-app-border">
                      <div className="flex items-center gap-1.5 text-app-muted text-[10px] font-bold uppercase tracking-wider mb-1">
                        <Calendar className="w-3.5 h-3.5 text-orange-500" />
                        <span>28-Day Block</span>
                      </div>
                      <p className="text-xs font-semibold text-app-text">
                        {snapshot.trainingBlock28Days.totalRides} rides • {snapshot.trainingBlock28Days.totalKm} KM
                      </p>
                      <p className="text-[10px] text-app-muted">
                        {snapshot.trainingBlock28Days.totalHours} hrs • {snapshot.trainingBlock28Days.totalBikeScore} BS
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'shortcuts' && (
            <div className="space-y-4">
              <p className="text-xs text-app-muted leading-relaxed">
                For the web app in Safari or Chrome, you can import this JSON snapshot into the macOS <strong>Shortcuts.app</strong> to create instant Siri voice triggers or menu bar widgets that query your recovery, latest ride, and 7d/28d training loads.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-semibold text-xs transition-all shadow-lg shadow-orange-500/20"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied Payload!' : 'Copy Siri JSON Payload'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-app-card hover:bg-app-bg border border-app-border text-app-text font-semibold text-xs transition-all"
                  title="Download .json file"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-app-bg/80 border border-app-border font-mono text-[11px] max-h-48 overflow-y-auto text-app-muted">
                <pre>{shortcutData}</pre>
              </div>
            </div>
          )}

          {activeSubTab === 'tauri' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-app-bg/50 border border-app-border space-y-3">
                <div className="flex items-center gap-2 text-app-text font-bold text-xs">
                  <Laptop className="w-4 h-4 text-orange-500" />
                  <span>Native macOS Tauri & Siri Integration Ready</span>
                </div>
                <p className="text-xs text-app-muted leading-relaxed">
                  All Swift <code className="text-orange-500 font-mono text-[11px]">AppIntents</code>, Rust Tauri bridge commands, and ready-to-copy configuration files have been prepared in the <code className="text-orange-500 font-mono text-[11px]">/native-macos</code> folder of this repository.
                </p>
                <div className="bg-app-card/60 p-3 rounded-xl border border-app-border/70 space-y-2 text-xs">
                  <div className="font-semibold text-app-text">Instant Drop-in Setup:</div>
                  <pre className="text-[10px] font-mono text-orange-400 bg-app-bg/80 p-2.5 rounded-lg overflow-x-auto whitespace-pre">
{`cp native-macos/src-tauri-templates/Cargo.toml src-tauri/Cargo.toml
cp native-macos/src-tauri-templates/default.json src-tauri/capabilities/default.json
cp native-macos/src-tauri-templates/lib.rs src-tauri/src/lib.rs
cp native-macos/src-tauri-templates/main.rs src-tauri/src/main.rs
cp native-macos/src-tauri-templates/tauri.conf.json src-tauri/tauri.conf.json`}
                  </pre>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-app-muted pl-1">
                  <li>Push to GitHub, pull down on your Mac, and copy the files above.</li>
                  <li>Run <code className="text-app-text font-semibold">npx tauri dev</code> to verify that the app writes <code className="text-app-text font-semibold">siri_snapshot.json</code>.</li>
                  <li>Follow the updated steps in <code className="text-app-text font-semibold">/native-macos/STEP-BY-STEP-GUIDE.md</code> to enable spoken Siri commands or App Intents.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-app-border bg-app-card/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-app-bg border border-app-border hover:border-orange-500/50 text-app-text font-semibold text-xs transition-all"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
