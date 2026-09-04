import React from 'react';
import { 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { SleepMetric } from '../../../types';
import { safeFormatDate } from '../../../services/wellnessService';

interface HealthMetricsChartProps {
  data: SleepMetric[];
}

export const HealthMetricsChart: React.FC<HealthMetricsChartProps> = ({ data }) => {
  // Sort by date ascending for the chart and take last 14 days
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  const chartData = sortedData.map(d => {
    return {
      ...d,
      displayDate: safeFormatDate(d.date),
    };
  });

  return (
    <div className="h-[250px] w-full min-h-[250px] mt-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={250}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
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
          
          {/* Left Axis: PulseOX (%) */}
          <YAxis 
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            fontSize={10}
            stroke="#d946ef"
            domain={[90, 100]}
            tick={{ fill: '#d946ef' }}
            label={{ 
                value: 'PULSE OX (%)', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fontSize: '10px', fill: '#d946ef', fontWeight: 'bold' } 
            }}
          />
          
          {/* Right Axis: Respiration (bpm) */}
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            fontSize={10}
            stroke="#10b981"
            domain={['auto', 'auto']}
            tick={{ fill: '#10b981' }}
            label={{ 
                value: 'RESPIRATION (BPM)', 
                angle: 90, 
                position: 'insideRight', 
                style: { fontSize: '10px', fill: '#10b981', fontWeight: 'bold' } 
            }}
          />

          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--app-tooltip-bg)', 
              backdropFilter: 'blur(8px)', 
              WebkitBackdropFilter: 'blur(8px)', 
              border: '1px solid var(--app-border)', 
              borderRadius: '12px', 
              fontSize: '12px', 
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: 'var(--app-text)', fontWeight: 'bold', marginBottom: '4px' }}
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
          
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="pulseOx" 
            name="PULSE OX" 
            stroke="#d946ef" 
            strokeWidth={2}
            dot={{ r: 4, fill: '#d946ef', strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />

          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="respiration" 
            name="RESPIRATION" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
