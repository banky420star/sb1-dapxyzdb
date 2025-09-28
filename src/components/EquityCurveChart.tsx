import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EquityCurveChartProps {
  data: Array<{
    date: string;
    equity: number;
    pnl: number;
  }>;
  height?: number;
}

const EquityCurveChart: React.FC<EquityCurveChartProps> = ({ data, height = 300 }) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div style={{ width: '100%', height: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            stroke="#9CA3AF"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'equity' ? 'Equity' : 'P&L'
            ]}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
          />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EquityCurveChart;