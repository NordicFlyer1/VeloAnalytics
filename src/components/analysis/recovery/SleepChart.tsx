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
import { SleepMetric } from '../../../types';
import { format } from 'date-fns';

interface SleepChartProps {
  data: SleepMetric[];
}

export const SleepChart: React.FC<SleepChartProps> = ({ data }) => {
  // Sort by date ascending for the chart
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  const chartData = sortedData.map(d => ({
    ...d,
    displayDate: format(new Date(d.date), 'MMM dd'),
    hours: (d.duration / 60).toFixed(1)
  }));

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
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
            dataKey="readinessScore" 
            name="READINESS SCORE" 
            stroke="var(--color-speed)" 
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-speed)', strokeWidth: 0 }}
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
