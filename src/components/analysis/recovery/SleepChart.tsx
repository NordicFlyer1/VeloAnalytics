import React from 'react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';
import { SleepMetric, HRVMetric, PMCDataPoint, AISettings } from '../../../types';
import { format } from 'date-fns';
import { calculateVeloReadiness } from '../../../services/wellnessService';

interface SleepChartProps {
  data: SleepMetric[];
  hrvHistory: HRVMetric[];
  pmcData: PMCDataPoint[];
  aiSettings: AISettings;
}

export const SleepChart: React.FC<SleepChartProps> = ({ 
  data, 
  hrvHistory, 
  pmcData, 
  aiSettings 
}) => {
  // Sort by date ascending for the chart
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  const chartData = sortedData.map(d => {
    const [y, m, d_part] = d.date.split('-').map(Number);
    
    // Find matching HRV and PMC data for this date
    const hrvOnDate = hrvHistory.find(h => h.date === d.date);
    const pmcOnDate = pmcData.find(p => p.date === d.date);
    
    let displayReadiness = d.readinessScore;
    let veloCalc = null;
    if (aiSettings.useExperimentalReadiness) {
      // Use defaults (0 load) if PMC data is not available for this date yet
      veloCalc = calculateVeloReadiness(
        d, 
        hrvOnDate || null, 
        pmcOnDate?.sb || 0, 
        pmcOnDate?.sts || 0,
        pmcOnDate?.bikeScore || 0
      );
      displayReadiness = veloCalc.score;
    }

    return {
      ...d,
      displayDate: format(new Date(y, m - 1, d_part), 'MMM dd'),
      hours: (d.duration / 60).toFixed(1),
      calculatedReadiness: displayReadiness,
      veloCalculation: veloCalc
    };
  });

  return (
    <div className="h-[300px] w-full min-h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={300}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sleepScoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-power)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--color-power)" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="var(--app-border)" 
          />
          <XAxis 
            dataKey="displayDate" 
            axisLine={false}
            tickLine={false}
            fontSize={10}
            stroke="var(--app-muted)"
            dy={10}
            tick={{ fill: 'var(--app-muted)' }}
          />
          <YAxis 
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            fontSize={10}
            stroke="var(--app-muted)"
            domain={[0, 100]}
            tick={{ fill: 'var(--app-muted)' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            fontSize={10}
            stroke="var(--app-muted)"
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--app-muted)' }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-app-tooltip-bg backdrop-blur-md border border-app-border rounded-xl p-3 shadow-xl overflow-hidden min-w-[160px]">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-app-text mb-2 border-b border-app-border pb-1">
                      {label}
                    </div>
                    <div className="space-y-1.5">
                      {payload.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center gap-4">
                          <span className="text-[10px] text-app-muted uppercase font-bold tracking-tight">
                            {item.name}
                          </span>
                          <span className="font-bold text-xs text-app-text">
                            {item.value}
                          </span>
                        </div>
                      ))}
                      
                      {/* Velo-Readiness Contributors (if active and available) */}
                      {aiSettings.useExperimentalReadiness && payload.find(p => p.dataKey === 'calculatedReadiness') && (
                        <div className="mt-2 pt-2 border-t border-dashed border-app-border">
                          <div className="text-[8px] uppercase tracking-widest font-bold text-app-text mb-1">
                            Velo-Readiness Components
                          </div>
                          {Object.entries((payload[0].payload.veloCalculation?.contributors || {})).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center gap-4">
                              <span className="text-[9px] text-app-muted uppercase font-medium">{key}</span>
                              <span className="font-bold text-[9px] text-app-text">
                                {value as number}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            verticalAlign="top" 
            align="right"
            iconType="circle"
            wrapperStyle={{ 
              fontSize: '10px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              paddingBottom: '20px'
            }}
          />
          <Bar 
            yAxisId="left" 
            dataKey="score" 
            name="SLEEP QUALITY" 
            radius={[4, 4, 0, 0]}
            barSize={12}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.score >= 80 ? '#22c55e' : entry.score >= 60 ? '#f97316' : '#ef4444'} 
              />
            ))}
          </Bar>
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="calculatedReadiness" 
            name={aiSettings.useExperimentalReadiness ? "VELO-READINESS SCORE" : "READINESS SCORE"} 
            stroke={aiSettings.useExperimentalReadiness ? "#facc15" : "#06b6d4"} 
            strokeWidth={3}
            dot={{ r: 3, fill: aiSettings.useExperimentalReadiness ? "#facc15" : "#06b6d4", strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="restingHeartRate" 
            name="RESTING HR" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
