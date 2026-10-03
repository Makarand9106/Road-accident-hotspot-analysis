import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Info } from 'lucide-react';
import { formatNumber, formatPercent, SEVERITY_COLORS } from '../utils/constants';

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs backdrop-blur-md">
        <p className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.fill || item.color }} />
          {item.name}
        </p>
        <div className="space-y-1 text-slate-300">
          <p>Count: <span className="font-mono font-medium text-slate-100">{formatNumber(item.value)}</span></p>
          {item.payload.percent !== undefined && (
            <p>Share: <span className="font-mono font-medium text-slate-100">{formatPercent(item.payload.percent)}</span></p>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export function DonutCard({
  title,
  question,
  caveat,
  data = [],
  nameKey = 'name',
  dataKey = 'value',
  centerValue,
  centerLabel = 'Total',
  height = 320,
  extraHeader,
  className = '',
}) {
  // Ensure default colors if not provided
  const processedData = data.map((item) => ({
    ...item,
    fill: item.color || SEVERITY_COLORS[item[nameKey]] || '#0072B2',
  }));

  return (
    <div className={`glass-panel rounded-xl p-5 flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-100 tracking-tight">{title}</h3>
          {extraHeader}
        </div>
        {question && (
          <p className="text-xs text-sky-400/90 font-medium mt-0.5">{question}</p>
        )}
      </div>

      {/* Chart */}
      <div className="w-full relative" style={{ height }}>
        {processedData && processedData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <Pie
                  data={processedData}
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  dataKey={dataKey}
                  nameKey={nameKey}
                  stroke="#0F172A"
                  strokeWidth={2}
                >
                  {processedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Total / Metric */}
            {centerValue && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                <span className="text-xl font-bold tracking-tight text-slate-100 font-mono">
                  {typeof centerValue === 'number' ? formatNumber(centerValue) : centerValue}
                </span>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  {centerLabel}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            No severity data available.
          </div>
        )}
      </div>

      {/* Caveat */}
      {caveat && (
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>{caveat}</span>
        </div>
      )}
    </div>
  );
}

export default DonutCard;
