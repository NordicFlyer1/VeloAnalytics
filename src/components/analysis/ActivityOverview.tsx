import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutList } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { SummaryCards } from './SummaryCards';
import { exportComponentAsImage } from '../../lib/chartExport';
import { ActivitySummary, PMCDataPoint, HistoricalActivity } from '../../types';

interface ActivityOverviewProps {
  summary: ActivitySummary;
  data: any[];
  currentPMC: PMCDataPoint | null;
  history: HistoricalActivity[];
  userWeight?: number | null;
  weightUnit?: 'kg' | 'lbs';
  isExpanded: boolean;
  onToggle: () => void;
}

export const ActivityOverview: React.FC<ActivityOverviewProps> = ({
  summary,
  data,
  currentPMC,
  history,
  userWeight,
  weightUnit,
  isExpanded,
  onToggle
}) => {
  const exportRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (exportRef.current) {
      const fileName = `Velo_ActivityOverview_${new Date().getTime()}.png`;
      await exportComponentAsImage(exportRef.current, fileName);
    }
  };

  return (
    <div ref={exportRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-8">
      <SectionHeader 
        icon={LayoutList}
        title="Activity Overview"
        description="High-level performance summary and key metrics"
        isExpanded={isExpanded}
        onToggle={onToggle}
        onExport={handleExport}
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
            <SummaryCards 
              summary={summary} 
              data={data} 
              currentPMC={currentPMC} 
              history={history} 
              userWeight={userWeight} 
              weightUnit={weightUnit} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
