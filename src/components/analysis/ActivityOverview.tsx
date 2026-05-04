import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, LayoutTemplate, LayoutList } from 'lucide-react';
import { SectionHeader, ExportAction } from '../ui/SectionHeader';
import { SummaryCards } from './SummaryCards';
import { exportComponentAsImage } from '../../lib/chartExport';
import { ActivitySummary, PMCDataPoint, HistoricalActivity, Equipment, SleepMetric, HRVMetric, AISettings } from '../../types';

interface ActivityOverviewProps {
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
  isExpanded: boolean;
  onToggle: () => void;
  sleepData?: SleepMetric[];
  hrvData?: HRVMetric[];
  aiSettings?: AISettings;
}

export const ActivityOverview: React.FC<ActivityOverviewProps> = ({
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
  isExpanded,
  onToggle,
  sleepData = [],
  hrvData = [],
  aiSettings
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const exportActions: ExportAction[] = [
    {
      label: 'Full Panel (PNG)',
      icon: Image,
      onClick: async () => {
        if (containerRef.current) {
          const fileName = `Velo_Overview_Full_${new Date().getTime()}.png`;
          await exportComponentAsImage(containerRef.current, fileName);
        }
      }
    },
    {
      label: 'Summary Only (PNG)',
      icon: LayoutTemplate,
      onClick: async () => {
        if (summaryRef.current) {
          const fileName = `Velo_Overview_Summary_${new Date().getTime()}.png`;
          await exportComponentAsImage(summaryRef.current, fileName);
        }
      }
    }
  ];

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-8">
      <SectionHeader 
        icon={LayoutList}
        title="Activity Overview"
        description="High-level performance summary and key metrics"
        isExpanded={isExpanded}
        onToggle={onToggle}
        exportActions={exportActions}
        infoContent={{
          title: "Activity Overview",
          description: "High-level performance summary and key metrics including xPower, BikeScore™, and relative intensity."
        }}
      />
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div ref={summaryRef}>
              <SummaryCards 
                summary={summary} 
                data={data} 
                currentPMC={currentPMC} 
                pmcData={pmcData}
                history={history} 
                userWeight={userWeight} 
                weightUnit={weightUnit} 
                equipment={equipment}
                currentActivityId={currentActivityId}
                updateActivityBike={updateActivityBike}
                sleepData={sleepData}
                hrvData={hrvData}
                aiSettings={aiSettings}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
