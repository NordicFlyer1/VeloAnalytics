import { useState, useEffect } from 'react';
import { ZoneDefinition, RidingPosition, SurfaceType, Equipment, AISettings, SleepMetric, HRVMetric } from '../types';
import { DEFAULT_POWER_ZONES, DEFAULT_HR_ZONES } from '../services/metrics';
import { formatLocalDate, getBufferFingerprint } from '../lib/utils';
import { saveAs } from '../lib/fileSystem';
import { zipSync } from 'fflate';
import { getAllStoredFitFiles } from '../services/storage';
import { 
  getGarminApiKey, 
  setGarminApiKey, 
  getGarminSettings, 
  saveGarminSettings 
} from '../services/garmin/garminAuth';

const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  geminiModel: 'gemini-3.8-flash',
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  openaiModel: 'gpt-4o',
  anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  anthropicModel: import.meta.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620',
  groqApiKey: import.meta.env.VITE_GROQ_API_KEY || '',
  groqModel: 'llama-3.3-70b-versatile',
  ollamaUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'gemma3:4b',
  lmStudioUrl: 'http://127.0.0.1:1234',
  lmStudioModel: 'phi-4-mini-instruct',
  systemPrompt: 'You are an expert cycling coach. Analyze metrics with clinical precision but also encourage the athlete. Keep responses concise and focused on physiological insights. You will receive context in a structured JSON format containing profile data, detailed activity metrics (xPower, RI, BikeScore, EF), and wellness trends (HRV, Sleep, Velo-Readiness). Always use VeloAnalytics native metrics: xPower, BikeScore™, Relative Intensity (RI), and Efficiency Factor (EF). Do not reference third-party proprietary metrics. CRITICAL: Historical sequences (Sleep, HRV, PMC) are provided in reverse-chronological order (Newest/Latest data point first).',
  wellnessContextDays: 7,
  useExperimentalReadiness: false,
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  openWeatherMapApiKey: import.meta.env.VITE_OPENWEATHERMAP_API_KEY || '',
  autoSpeakResponses: false,
  voiceRate: 1.05
};

export function useSharedSettings() {
  const [cp, setCP] = useState(() => {
    const saved = localStorage.getItem('veloanalytics_cp');
    const parsed = saved ? parseInt(saved) : 250;
    // Migration: If the value is the old default 125, update it to 250
    if (parsed === 125) return 250;
    return isNaN(parsed) ? 250 : parsed;
  });

  const [autoUpdateCP, setAutoUpdateCP] = useState(() => {
    const saved = localStorage.getItem('veloanalytics_autoupdate_cp');
    return saved ? saved === 'true' : true;
  });

  const [manualCP, setManualCP] = useState<number | null>(() => {
    const saved = localStorage.getItem('veloanalytics_manual_cp');
    return saved ? parseInt(saved) : null;
  });

  const [manualWPrime, setManualWPrime] = useState<number | null>(() => {
    const saved = localStorage.getItem('veloanalytics_manual_wprime');
    return saved ? parseInt(saved) : null;
  });

  const [userWeight, setUserWeight] = useState<number | null>(() => {
    const saved = localStorage.getItem('veloanalytics_user_weight');
    return saved ? parseFloat(saved) : null;
  });

  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(() => {
    const saved = localStorage.getItem('veloanalytics_weight_unit');
    return (saved === 'kg' || saved === 'lbs') ? saved : 'kg';
  });

  const [enableVirtualPower, setEnableVirtualPower] = useState<boolean>(() => {
    const saved = localStorage.getItem('veloanalytics_virtual_power');
    return saved ? saved === 'true' : false;
  });

  // Multiple Equipment Profiles
  const [equipment, setEquipment] = useState<Equipment[]>(() => {
    const saved = localStorage.getItem('veloanalytics_equipment');
    if (saved) return JSON.parse(saved);

    // Migration from old single settings if available
    const oldWeight = localStorage.getItem('veloanalytics_bike_weight');
    const oldPos = localStorage.getItem('veloanalytics_riding_position');
    const oldSurf = localStorage.getItem('veloanalytics_surface_type');

    return [{
      id: 'default-bike',
      name: 'Default Bike',
      bikeWeight: oldWeight ? parseFloat(oldWeight) : 9,
      startingMileage: 0,
      ridingPosition: (oldPos === 'tops' || oldPos === 'hoods' || oldPos === 'drops') ? oldPos : 'hoods' as RidingPosition,
      surfaceType: (oldSurf === 'road' || oldSurf === 'gravel' || oldSurf === 'mtb') ? oldSurf : 'road' as SurfaceType,
      isDefault: true,
      color: '#f97316'
    }];
  });

  const [activeBikeId, setActiveBikeId] = useState<string>(() => {
    const saved = localStorage.getItem('veloanalytics_active_bike_id');
    return saved || 'default-bike';
  });

  const activeBike = equipment.find(e => e.id === activeBikeId) || equipment.find(e => e.isDefault) || equipment[0];

  const [maxHR, setMaxHR] = useState(() => {
    const saved = localStorage.getItem('veloanalytics_max_hr');
    const parsed = saved ? parseInt(saved) : 190;
    return isNaN(parsed) || parsed <= 0 ? 190 : parsed;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('veloanalytics_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [smoothingWindow, setSmoothingWindow] = useState<number>(() => {
    const saved = localStorage.getItem('veloanalytics_smoothing');
    return saved ? parseInt(saved) : 1;
  });

  const [cpMode, setCpMode] = useState<'manual' | 'estimated'>(() => {
    const saved = localStorage.getItem('veloanalytics_cp_mode');
    return (saved === 'manual' || saved === 'estimated') ? saved : 'estimated';
  });

  const [powerZoneDefinitions, setPowerZoneDefinitions] = useState<ZoneDefinition[]>(() => {
    const saved = localStorage.getItem('veloanalytics_power_zones');
    return saved ? JSON.parse(saved) : DEFAULT_POWER_ZONES;
  });

  const [hrZoneDefinitions, setHrZoneDefinitions] = useState<ZoneDefinition[]>(() => {
    const saved = localStorage.getItem('veloanalytics_hr_zones');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error('Failed to parse HR zones:', e);
    }
    return DEFAULT_HR_ZONES;
  });

  const [sleepHistory, setSleepHistory] = useState<SleepMetric[]>(() => {
    const saved = localStorage.getItem('veloanalytics_sleep_history');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [hrvHistory, setHrvHistory] = useState<HRVMetric[]>(() => {
    const saved = localStorage.getItem('veloanalytics_hrv_history');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('veloanalytics_ai_settings');
    if (!saved) return DEFAULT_AI_SETTINGS;
    
    try {
      const parsed = JSON.parse(saved);
      // Migration: split localUrl/localModel into ollama/lmStudio fields if they exist from old version
      if (parsed.localUrl && !parsed.ollamaUrl) {
        parsed.ollamaUrl = parsed.localUrl;
        parsed.lmStudioUrl = parsed.localUrl;
      }
      if (parsed.localModel && !parsed.ollamaModel) {
        parsed.ollamaModel = parsed.localModel;
        parsed.lmStudioModel = parsed.localModel;
      }

      // Merge with defaults to ensure environment waterfall works if field is empty string
      const merged = { ...DEFAULT_AI_SETTINGS, ...parsed };
      
      // Migrate to modern gemini-3.8-flash if model was unset or set to older previews
      if (parsed.geminiModel === 'gemini-1.5-pro' || parsed.geminiModel === 'gemini-3-flash-preview' || !parsed.geminiModel) {
        merged.geminiModel = 'gemini-3.8-flash';
      }
      
      // Secondary fallback check: if saved value is an empty string but env has a value, use env
      if (!parsed.geminiApiKey && DEFAULT_AI_SETTINGS.geminiApiKey) merged.geminiApiKey = DEFAULT_AI_SETTINGS.geminiApiKey;
      if (!parsed.openaiApiKey && DEFAULT_AI_SETTINGS.openaiApiKey) merged.openaiApiKey = DEFAULT_AI_SETTINGS.openaiApiKey;
      if (!parsed.anthropicApiKey && DEFAULT_AI_SETTINGS.anthropicApiKey) merged.anthropicApiKey = DEFAULT_AI_SETTINGS.anthropicApiKey;
      if (!parsed.groqApiKey && DEFAULT_AI_SETTINGS.groqApiKey) merged.groqApiKey = DEFAULT_AI_SETTINGS.groqApiKey;
      if (!parsed.googleMapsApiKey && DEFAULT_AI_SETTINGS.googleMapsApiKey) merged.googleMapsApiKey = DEFAULT_AI_SETTINGS.googleMapsApiKey;
      if (!parsed.openWeatherMapApiKey && DEFAULT_AI_SETTINGS.openWeatherMapApiKey) merged.openWeatherMapApiKey = DEFAULT_AI_SETTINGS.openWeatherMapApiKey;

      return merged;
    } catch (e) {
      return DEFAULT_AI_SETTINGS;
    }
  });

  /**
   * Builds the core configuration payload containing all settings, thresholds,
   * equipment profiles, AI keys, and Garmin Connect secrets.
   */
  const buildConfigPayload = () => ({
    application: 'VeloAnalytics',
    version: '1.7.1',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    cp,
    autoUpdateCP,
    manualCP,
    manualWPrime,
    userWeight,
    weightUnit,
    enableVirtualPower,
    equipment,
    activeBikeId,
    maxHR,
    theme,
    smoothingWindow,
    cpMode,
    powerZoneDefinitions,
    hrZoneDefinitions,
    aiSettings,
    sleepHistory,
    hrvHistory,
    garminApiKey: getGarminApiKey(),
    garminSettings: getGarminSettings()
  });

  /**
   * Export Settings (Config Bundle)
   * Serializes user settings, API keys, and Garmin secrets into a lightweight JSON file.
   */
  const exportSettings = async () => {
    const config = {
      ...buildConfigPayload(),
      backupType: 'config_bundle'
    };

    const content = JSON.stringify(config, null, 2);
    const filename = `veloanalytics_config_backup_${formatLocalDate(new Date())}.json`;

    await saveAs(content, filename, {
      description: 'VeloAnalytics Config',
      accept: { 'application/json': ['.json'] }
    });
  };

  /**
   * Export All .FIT Files as a ZIP Archive
   * Extracts every original .FIT file stored in IndexedDB, compresses them in memory with fflate,
   * and triggers a download of veloanalytics_fit_archive_YYYY-MM-DD.zip.
   */
  const exportFitArchiveZip = async (): Promise<{ count: number }> => {
    const storedFiles = await getAllStoredFitFiles();
    if (!storedFiles || storedFiles.length === 0) {
      throw new Error('No .FIT files found in storage to export.');
    }

    const zipFiles: Record<string, Uint8Array> = {};
    const usedNames = new Set<string>();
    const seenContentHashes = new Set<string>();

    for (const item of storedFiles) {
      const arrayBuffer = await item.blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Verify content uniqueness via byte fingerprint
      const hash = getBufferFingerprint(bytes);
      if (seenContentHashes.has(hash)) {
        // Skip duplicate binary content
        continue;
      }
      seenContentHashes.add(hash);

      let name = item.fileName;
      // If two genuinely different rides share the same generic filename (e.g. activity.fit)
      if (usedNames.has(name)) {
        const extIndex = name.lastIndexOf('.');
        const base = extIndex !== -1 ? name.substring(0, extIndex) : name;
        const ext = extIndex !== -1 ? name.substring(extIndex) : '';
        let counter = 2;
        while (usedNames.has(`${base}_${counter}${ext}`)) {
          counter++;
        }
        name = `${base}_${counter}${ext}`;
      }
      usedNames.add(name);

      zipFiles[name] = bytes;
    }

    const uniqueCount = Object.keys(zipFiles).length;
    if (uniqueCount === 0) {
      throw new Error('No unique .FIT files found in storage to export.');
    }

    const zippedUint8 = zipSync(zipFiles, { level: 6 });
    const blob = new Blob([zippedUint8], { type: 'application/zip' });
    const filename = `veloanalytics_fit_archive_${formatLocalDate(new Date())}.zip`;

    await saveAs(blob, filename, {
      description: 'VeloAnalytics FIT Files Archive',
      accept: { 'application/zip': ['.zip'] }
    });

    return { count: uniqueCount };
  };

  /**
   * Export Full Archive (Legacy JSON Archive)
   * Serializes configuration plus stripped summary records.
   */
  const exportFullArchive = async (historyData?: any[]) => {
    let resolvedHistory = historyData;
    if (!resolvedHistory) {
      try {
        const raw = localStorage.getItem('veloanalytics_history');
        if (raw) resolvedHistory = JSON.parse(raw);
      } catch {
        resolvedHistory = [];
      }
    }

    const archive = {
      ...buildConfigPayload(),
      backupType: 'full_vault_archive',
      history: resolvedHistory || []
    };

    const content = JSON.stringify(archive, null, 2);
    const filename = `veloanalytics_vault_archive_${formatLocalDate(new Date())}.json`;

    await saveAs(content, filename, {
      description: 'VeloAnalytics Full Archive',
      accept: { 'application/json': ['.json'] }
    });
  };

  /**
   * Import Settings (Universal Restore)
   * Parses either a Config Bundle or a Full Vault Archive, restores application state,
   * Garmin secrets, and activity history to localStorage, then triggers a clean reload.
   */
  const importSettings = (json: string) => {
    try {
      const config = JSON.parse(json);
      
      if (config.cp !== undefined) setCP(config.cp);
      if (config.autoUpdateCP !== undefined) setAutoUpdateCP(config.autoUpdateCP);
      if (config.manualCP !== undefined) setManualCP(config.manualCP);
      if (config.manualWPrime !== undefined) setManualWPrime(config.manualWPrime);
      if (config.userWeight !== undefined) setUserWeight(config.userWeight);
      if (config.weightUnit !== undefined) setWeightUnit(config.weightUnit);
      if (config.enableVirtualPower !== undefined) setEnableVirtualPower(config.enableVirtualPower);
      if (config.equipment !== undefined) setEquipment(config.equipment);
      if (config.activeBikeId !== undefined) setActiveBikeId(config.activeBikeId);
      if (config.maxHR !== undefined) setMaxHR(config.maxHR);
      if (config.theme !== undefined) setTheme(config.theme);
      if (config.smoothingWindow !== undefined) setSmoothingWindow(config.smoothingWindow);
      if (config.cpMode !== undefined) setCpMode(config.cpMode);
      if (config.powerZoneDefinitions !== undefined) setPowerZoneDefinitions(config.powerZoneDefinitions);
      if (config.hrZoneDefinitions !== undefined) setHrZoneDefinitions(config.hrZoneDefinitions);
      if (config.aiSettings !== undefined) setAiSettings(config.aiSettings);
      if (config.sleepHistory !== undefined) setSleepHistory(config.sleepHistory);
      if (config.hrvHistory !== undefined) setHrvHistory(config.hrvHistory);
      
      // Restore Garmin Connect API Key and sync preferences
      if (config.garminApiKey !== undefined) {
        setGarminApiKey(config.garminApiKey);
      }
      if (config.garminSettings !== undefined) {
        saveGarminSettings(config.garminSettings);
      }
      
      // Full data restoration (if provided in Full Vault Archive)
      if (config.history) localStorage.setItem('veloanalytics_history', JSON.stringify(config.history));
      if (config.metrics) localStorage.setItem('veloanalytics_metrics_snapshots', JSON.stringify(config.metrics));
      
      // Reload page to ensure all hooks/states across the app pick up the new localStorage contents
      window.location.reload();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  };

  // Sync to localStorage
  useEffect(() => { localStorage.setItem('veloanalytics_cp', cp.toString()); }, [cp]);
  useEffect(() => { localStorage.setItem('veloanalytics_autoupdate_cp', autoUpdateCP.toString()); }, [autoUpdateCP]);
  useEffect(() => {
    if (manualCP !== null) localStorage.setItem('veloanalytics_manual_cp', manualCP.toString());
    else localStorage.removeItem('veloanalytics_manual_cp');
  }, [manualCP]);
  useEffect(() => {
    if (manualWPrime !== null) localStorage.setItem('veloanalytics_manual_wprime', manualWPrime.toString());
    else localStorage.removeItem('veloanalytics_manual_wprime');
  }, [manualWPrime]);
  useEffect(() => {
    if (userWeight !== null) localStorage.setItem('veloanalytics_user_weight', userWeight.toString());
    else localStorage.removeItem('veloanalytics_user_weight');
  }, [userWeight]);
  useEffect(() => { localStorage.setItem('veloanalytics_weight_unit', weightUnit); }, [weightUnit]);
  useEffect(() => { localStorage.setItem('veloanalytics_virtual_power', enableVirtualPower.toString()); }, [enableVirtualPower]);
  useEffect(() => { localStorage.setItem('veloanalytics_equipment', JSON.stringify(equipment)); }, [equipment]);
  useEffect(() => { localStorage.setItem('veloanalytics_active_bike_id', activeBikeId); }, [activeBikeId]);
  useEffect(() => { localStorage.setItem('veloanalytics_max_hr', maxHR.toString()); }, [maxHR]);
  useEffect(() => { localStorage.setItem('veloanalytics_smoothing', smoothingWindow.toString()); }, [smoothingWindow]);
  useEffect(() => { localStorage.setItem('veloanalytics_cp_mode', cpMode); }, [cpMode]);
  useEffect(() => { localStorage.setItem('veloanalytics_power_zones', JSON.stringify(powerZoneDefinitions)); }, [powerZoneDefinitions]);
  useEffect(() => { localStorage.setItem('veloanalytics_hr_zones', JSON.stringify(hrZoneDefinitions)); }, [hrZoneDefinitions]);
  useEffect(() => { localStorage.setItem('veloanalytics_ai_settings', JSON.stringify(aiSettings)); }, [aiSettings]);
  useEffect(() => { localStorage.setItem('veloanalytics_sleep_history', JSON.stringify(sleepHistory)); }, [sleepHistory]);
  useEffect(() => { localStorage.setItem('veloanalytics_hrv_history', JSON.stringify(hrvHistory)); }, [hrvHistory]);
  
  useEffect(() => {
    localStorage.setItem('veloanalytics_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const updateAiSettings = (updates: Partial<AISettings>) => {
    setAiSettings(prev => ({ ...prev, ...updates }));
  };

  const addBike = (bike: Omit<Equipment, 'id'>) => {
    const id = `bike-${Date.now()}`;
    setEquipment(prev => [...prev, { ...bike, id }]);
  };

  const updateBike = (id: string, updates: Partial<Equipment>) => {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const removeBike = (id: string) => {
    if (equipment.length <= 1) return; // Must have at least one
    setEquipment(prev => {
      const filtered = prev.filter(e => e.id !== id);
      if (activeBikeId === id) setActiveBikeId(filtered[0].id);
      return filtered;
    });
  };

  // Legacy compatibility for components using single fields
  // In a real app we'd refactor them to use activeBike
  const bikeWeight = activeBike?.bikeWeight || 9;
  const ridingPosition = activeBike?.ridingPosition || 'hoods';
  const surfaceType = activeBike?.surfaceType || 'road';

  return {
    cp, setCP,
    autoUpdateCP, setAutoUpdateCP,
    manualCP, setManualCP,
    manualWPrime, setManualWPrime,
    userWeight, setUserWeight,
    weightUnit, setWeightUnit,
    equipment, setEquipment, addBike, updateBike, removeBike,
    activeBikeId, setActiveBikeId,
    activeBike,
    bikeWeight, // compatibility
    ridingPosition, // compatibility
    surfaceType, // compatibility
    enableVirtualPower, setEnableVirtualPower,
    maxHR, setMaxHR,
    theme, setTheme, toggleTheme,
    smoothingWindow, setSmoothingWindow,
    cpMode, setCpMode,
    powerZoneDefinitions, setPowerZoneDefinitions,
    hrZoneDefinitions, setHrZoneDefinitions,
    sleepHistory, setSleepHistory,
    hrvHistory, setHrvHistory,
    aiSettings, updateAiSettings,
    exportSettings, exportFitArchiveZip, exportFullArchive, importSettings
  };
}
