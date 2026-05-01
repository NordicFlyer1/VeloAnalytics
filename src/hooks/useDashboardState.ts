import { useState } from 'react';

export const useDashboardState = () => {
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const [isChartExpanded, setIsChartExpanded] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [isLapsExpanded, setIsLapsExpanded] = useState(true);
  const [isWPrimeExpanded, setIsWPrimeExpanded] = useState(true);
  const [isPowerCurveExpanded, setIsPowerCurveExpanded] = useState(true);
  const [isZonesExpanded, setIsZonesExpanded] = useState(true);
  const [isPmcExpanded, setIsPmcExpanded] = useState(true);
  const [isTrainingLoadExpanded, setIsTrainingLoadExpanded] = useState(true);
  const [isVolumeTrendsExpanded, setIsVolumeTrendsExpanded] = useState(true);
  const [isSleepExpanded, setIsSleepExpanded] = useState(true);
  const [isRecoveryStatusExpanded, setIsRecoveryStatusExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);

  const toggleAllPanels = (expand: boolean) => {
    setIsOverviewExpanded(expand);
    setIsChartExpanded(expand);
    setIsMapExpanded(expand);
    setIsDetailsExpanded(expand);
    setIsLapsExpanded(expand);
    setIsWPrimeExpanded(expand);
    setIsPowerCurveExpanded(expand);
    setIsZonesExpanded(expand);
    setIsPmcExpanded(expand);
    setIsTrainingLoadExpanded(expand);
    setIsVolumeTrendsExpanded(expand);
    setIsSleepExpanded(expand);
    setIsRecoveryStatusExpanded(expand);
    setIsHistoryExpanded(expand);
  };

  const areAllPanelsCollapsed = 
    !isOverviewExpanded && 
    !isChartExpanded && 
    !isMapExpanded && 
    !isDetailsExpanded && 
    !isLapsExpanded && 
    !isWPrimeExpanded && 
    !isPowerCurveExpanded && 
    !isZonesExpanded && 
    !isPmcExpanded && 
    !isTrainingLoadExpanded && 
    !isVolumeTrendsExpanded && 
    !isSleepExpanded && 
    !isRecoveryStatusExpanded && 
    !isHistoryExpanded;

  return {
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
    isSleepExpanded, setIsSleepExpanded,
    isRecoveryStatusExpanded, setIsRecoveryStatusExpanded,
    isHistoryExpanded, setIsHistoryExpanded,
    toggleAllPanels,
    areAllPanelsCollapsed
  };
};
