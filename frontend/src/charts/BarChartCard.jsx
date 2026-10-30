import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ComposedChart,
  Line,
} from 'recharts';
import { Info } from 'lucide-react';
import { formatNumber } from '../utils/constants';

function CustomTooltip({ active, payload, label, formatter }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs backdrop-blur-md z-50">
        <p className="font-semibold text-slate-200 mb-2 border-b border-slate-800 pb-1">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                {entry.name}:
              </span>
              <span className="font-mono font-medium text-slate-100">
                {formatter ? formatter(entry.value, entry.name) : (typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function BarChartCard({
  title,
  question,
  caveat,
  data = [],
  bars = [],
  layout = 'horizontal', // 'horizontal' (vertical bars) or 'vertical' (horizontal bars)
  xAxisKey = 'name',
  xAxisLabel = '',
  yAxisLabel = '',
  height = 320,
  tooltipFormatter,
  lineKey = null,
  lineName = 'Severe %',
  lineColor = '#D55E00',
  extraHeader,
  className = '',
  yAxisDomain = null,
  highlightKey = null,
  highlightValue = null,
  highlightColor = null,
}) {
  const isVertical = layout === 'vertical';

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

      {/* Chart */}
      <div className="w-full relative" style={{ height }}>
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {lineKey ? (
              <ComposedChart
                data={data}
                layout={layout}
                margin={{ top: 10, right: 25, left: isVertical ? 30 : 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey={isVertical ? undefined : xAxisKey}
                  type={isVertical ? 'number' : 'category'}
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fill: '#94A3B8', fontSize: 11 } : undefined}
                />
                <YAxis
                  dataKey={isVertical ? xAxisKey : undefined}
                  type={isVertical ? 'category' : 'number'}
                  yAxisId="left"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  width={isVertical ? 90 : 45}
                  domain={!isVertical && yAxisDomain ? yAxisDomain : undefined}
                  tickFormatter={!isVertical ? (val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val) : undefined}
                  label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 11, offset: 10 } : undefined}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={lineColor}
                  fontSize={11}
                  tickLine={false}
                  unit="%"
                  domain={[0, 'auto']}
                />
                <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
                {bars.map((bar, idx) => (
                  <Bar
                    key={bar.key || idx}
                    yAxisId="left"
                    dataKey={bar.key}
                    name={bar.name || bar.key}
                    fill={bar.color || '#0072B2'}
                    stackId={bar.stackId}
                    radius={bar.stackId ? undefined : [4, 4, 0, 0]}
                  >
                    {highlightKey &&
                      data.map((entry, entryIdx) => (
                        <Cell
                          key={`cell-${entryIdx}`}
                          fill={
                            entry[highlightKey] === highlightValue
                              ? (highlightColor || '#F59E0B')
                              : (bar.color || '#0072B2')
                          }
                        />
                      ))}
                  </Bar>
                ))}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={lineKey}
                  name={lineName}
                  stroke={lineColor}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0F172A' }}
                />
              </ComposedChart>
            ) : (
              <BarChart
                data={data}
                layout={layout}
                margin={{ top: 10, right: 15, left: isVertical ? 40 : 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                {isVertical ? (
                  <>
                    <XAxis
                      type="number"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    />
                    <YAxis
                      dataKey={xAxisKey}
                      type="category"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      width={100}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey={xAxisKey}
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      interval={0}
                      label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, fill: '#94A3B8', fontSize: 11 } : undefined}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                      label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 11, offset: 10 } : undefined}
                    />
                  </>
                )}
                <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
                {bars.map((bar, idx) => (
                  <Bar
                    key={bar.key || idx}
                    dataKey={bar.key}
                    name={bar.name || bar.key}
                    fill={bar.color || '#0072B2'}
                    stackId={bar.stackId}
                    radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  >
                    {bar.colorKey &&
                      data.map((entry, entryIdx) => (
                        <Cell key={`cell-${entryIdx}`} fill={entry[bar.colorKey] || bar.color} />
                      ))}
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            No bar data available for selected filter combination.
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

export default BarChartCard;
