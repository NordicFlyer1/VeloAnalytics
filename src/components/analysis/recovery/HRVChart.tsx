import React from 'react';
import { 
  ComposedChart, 
  Area, 
  Line, 
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { HRVMetric } from '../../../types';
import { format } from 'date-fns';

interface HRVChartProps {
  data: HRVMetric[];
}

export const HRVChart: React.FC<HRVChartProps> = ({ data }) => {
  // Sort by date ascending for the chart
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  const chartData = sortedData.map(d => {
    const [y, m, d_part] = d.date.split('-').map(Number);
    return {
      ...d,
      displayDate: format(new Date(y, m - 1, d_part), 'MMM dd'),
      // Range data for the Area plot
      range: [d.baselineMin, d.baselineMax]
    };
  });

  return (
    <div className="h-[300px] w-full min-h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={300}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
            axisLine={false}
            tickLine={false}
            fontSize={10}
            stroke="var(--app-muted)"
            domain={['auto', 'auto']}
            tick={{ fill: 'var(--app-muted)' }}
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
          
          {/* Baseline Range as a shaded area */}
          <Area
            type="monotone"
            dataKey="range"
            name="BASELINE RANGE"
            stroke="none"
            fill="#6366f1"
            fillOpacity={0.15}
          />

          {/* 7-Day Average Line */}
          <Line 
            type="monotone" 
            dataKey="sevenDayAvg" 
            name="7D AVG" 
            stroke="#6366f1" 
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={false}
          />

          {/* Individual Overnight Values as Points */}
          <Scatter 
            name="OVERNIGHT HRV" 
            dataKey="overnightHRV" 
            fill="#6366f1" 
          />
          
          {/* Also a subtle line connecting overnight values for visual continuity */}
          <Line 
            type="monotone" 
            dataKey="overnightHRV" 
            name="OVERNIGHT TREND"
            stroke="#6366f1" 
            strokeWidth={2}
            dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
