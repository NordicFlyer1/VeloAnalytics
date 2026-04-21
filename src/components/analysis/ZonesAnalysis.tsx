import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, ChartBar, BarChart3 } from 'lucide-react';
import { SectionHeader, ExportAction } from '../ui/SectionHeader';
import { ActivitySummary } from '../../types';
import { exportComponentAsImage } from '../../lib/chartExport';

interface ZonesAnalysisProps {
  isZonesExpanded: boolean;
  setIsZonesExpanded: (expanded: boolean) => void;
  summary: ActivitySummary | null;
}

export const ZonesAnalysis: React.FC<ZonesAnalysisProps> = ({
  isZonesExpanded,
  setIsZonesExpanded,
  summary
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const exportActions: ExportAction[] = [
    {
      label: 'Full Panel (PNG)',
      icon: Image,
      onClick: async () => {
        if (containerRef.current) {
          const fileName = `Velo_Zones_Full_${new Date().getTime()}.png`;
          await exportComponentAsImage(containerRef.current, fileName);
        }
      }
    },
    {
      label: 'Zones Only (PNG)',
      icon: ChartBar,
      onClick: async () => {
        if (contentRef.current) {
          const fileName = `Velo_Zones_Only_${new Date().getTime()}.png`;
          await exportComponentAsImage(contentRef.current, fileName);
        }
      }
    }
  ];

  return (
    <div ref={containerRef} className="bg-app-card border border-app-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
      <SectionHeader 
        icon={BarChart3}
        title="Training Zones"
        description="Time distribution"
        isExpanded={isZonesExpanded}
        onToggle={() => setIsZonesExpanded(!isZonesExpanded)}
        exportActions={exportActions}
        infoContent={{
          title: "Training Zones",
          description: "Distributes your total ride time into Power and Heart Rate zones. Essential for verifying if the session met its specific training objectives."
        }}
      />

      <AnimatePresence>
        {isZonesExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div ref={contentRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Power Zones</h4>
                <div className="space-y-3">
                  {summary?.powerZones?.map((z) => (
                    <div key={z.name} className="space-y-1">
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
                        <span className="text-app-text/60">{z.name}</span>
                        <span className="text-app-muted">{Math.floor(z.seconds / 60)}M {z.seconds % 60}S ({z.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-app-card rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-1000" 
                          style={{ width: `${z.percentage}%`, backgroundColor: z.color }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Heart Rate Zones</h4>
                {summary?.hrZones ? (
                  <div className="space-y-3">
                    {summary.hrZones.map((z) => (
                      <div key={z.name} className="space-y-1">
                        <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
                          <span className="text-app-text/60">{z.name}</span>
                          <span className="text-app-muted">{Math.floor(z.seconds / 60)}M {z.seconds % 60}S ({z.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-app-card rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-1000" 
                            style={{ width: `${z.percentage}%`, backgroundColor: z.color }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-app-muted/50 text-xs uppercase tracking-widest border border-dashed border-app-border rounded-2xl">
                    No HR Data
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
