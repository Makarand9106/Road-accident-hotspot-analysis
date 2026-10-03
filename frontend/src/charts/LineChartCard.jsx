import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Info } from 'lucide-react';
import { formatNumber } from '../utils/constants';

// Custom dark tooltip matching our glassmorphism design
function CustomTooltip({ active, payload, label, formatter }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs backdrop-blur-md">
        <p className="font-semibold text-slate-200 mb-2 border-b border-slate-800 pb-1">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-medium text-slate-100">
                {formatter ? formatter(entry.value, entry.name) : formatNumber(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function LineChartCard({
  title,
  question,
  caveat,
  data = [],
  lines = [],
  xAxisKey = 'name',
  xAxisLabel = '',
  yAxisLabel = '',
  height = 320,
  tooltipFormatter,
  extraHeader,
  className = '',
}) {
  return (
    <div className={`glass-panel rounded-xl p-5 flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-100 tracking-tight">{title}</h3>
          {extraHeader}
        </div>
        {question && (
          <p className="text-xs text-sky-400/90 font-medium mt-0.5">{question}</p>
        )}
      </div>

      {/* Chart Area */}
      <div className="w-full relative" style={{ height }}>
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fill: '#94A3B8', fontSize: 11 } : undefined}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 11, offset: 10 } : undefined}
              />
              <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              {lines.map((line, idx) => (
                <Line
                  key={line.key || idx}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name || line.key}
                  stroke={line.color || '#38BDF8'}
                  strokeWidth={line.strokeWidth || 2.5}
                  dot={{ r: 3, strokeWidth: 1.5, fill: '#0F172A' }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            No trend data available for selected filter combination.
          </div>
        )}
      </div>

      {/* Caveat & Exposure Warning */}
      {caveat && (
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>{caveat}</span>
        </div>
      )}
    </div>
  );
}

export default LineChartCard;
