import { useState, useEffect } from 'react';
import { ZoneDefinition } from '../types';
import { DEFAULT_POWER_ZONES, DEFAULT_HR_ZONES } from '../services/metrics';

export function useSharedSettings() {
  const [cp, setCP] = useState(() => {
    const saved = localStorage.getItem('veloanalytics_cp');
    const parsed = saved ? parseInt(saved) : 125;
    return isNaN(parsed) ? 125 : parsed;
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

  const [maxHR, setMaxHR] = useState(() => {
    const saved = localStorage.getItem('veloanalytics_max_hr');
    return saved ? parseInt(saved) : 190;
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
    return saved ? JSON.parse(saved) : DEFAULT_HR_ZONES;
  });

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
  useEffect(() => { localStorage.setItem('veloanalytics_max_hr', maxHR.toString()); }, [maxHR]);
  useEffect(() => { localStorage.setItem('veloanalytics_smoothing', smoothingWindow.toString()); }, [smoothingWindow]);
  useEffect(() => { localStorage.setItem('veloanalytics_cp_mode', cpMode); }, [cpMode]);
  useEffect(() => { localStorage.setItem('veloanalytics_power_zones', JSON.stringify(powerZoneDefinitions)); }, [powerZoneDefinitions]);
  useEffect(() => { localStorage.setItem('veloanalytics_hr_zones', JSON.stringify(hrZoneDefinitions)); }, [hrZoneDefinitions]);
  
  useEffect(() => {
    localStorage.setItem('veloanalytics_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return {
    cp, setCP,
    autoUpdateCP, setAutoUpdateCP,
    manualCP, setManualCP,
    manualWPrime, setManualWPrime,
    userWeight, setUserWeight,
    weightUnit, setWeightUnit,
    maxHR, setMaxHR,
    theme, setTheme, toggleTheme,
    smoothingWindow, setSmoothingWindow,
    cpMode, setCpMode,
    powerZoneDefinitions, setPowerZoneDefinitions,
    hrZoneDefinitions, setHrZoneDefinitions
  };
}
