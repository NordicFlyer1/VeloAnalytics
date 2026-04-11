import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart3 } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { ActivitySummary } from '../types';

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
  return (
    <div className="bg-app-card border border-app-border rounded-3xl p-8">
      <SectionHeader 
        icon={BarChart3}
        title="Training Zones"
        description="Time distribution across power and heart rate intensity levels"
        isExpanded={isZonesExpanded}
        onToggle={() => setIsZonesExpanded(!isZonesExpanded)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-app-muted">Power Zones</h4>
                <div className="space-y-3">
                  {summary?.powerZones?.map((z) => (
                    <div key={z.name} className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-app-text/60">{z.name}</span>
                        <span className="text-app-muted">{Math.floor(z.seconds / 60)}m {z.seconds % 60}s ({z.percentage.toFixed(1)}%)</span>
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
                        <div className="flex justify-between text-[10px]">
                          <span className="text-app-text/60">{z.name}</span>
                          <span className="text-app-muted">{Math.floor(z.seconds / 60)}m {z.seconds % 60}s ({z.percentage.toFixed(1)}%)</span>
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
