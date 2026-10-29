import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { formatNumber, formatPercent } from '../utils/constants';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HeatmapCard({
  title = 'Weekday-by-Hour Collision Heatmap (C5)',
  question = 'At what times of the week do accidents concentrate most heavily?',
  caveat = 'Caveat: High-volume cells represent commuter congestion windows. Severe collision rates are actually higher during late-night and weekend hours.',
  data = [],
  className = '',
}) {
  const [hoveredCell, setHoveredCell] = useState(null);

  // Index matrix data by `day_name` and `hour`
  const matrixMap = React.useMemo(() => {
    const map = {};
    if (!data || !Array.isArray(data)) return map;

    let maxVal = 1;
    data.forEach((item) => {
      const key = `${item.day_name}_${item.hour}`;
      const count = Number(item.total_collisions || 0);
      map[key] = {
        total: count,
        severe: Number(item.severe_collisions || 0),
        severe_pct: Number(item.severe_percentage || 0),
      };
      if (count > maxVal) maxVal = count;
    });

    map._maxVal = maxVal;
    return map;
  }, [data]);

  const maxCount = matrixMap._maxVal || 1;

  // Compute color based on relative intensity
  const getCellColor = (total) => {
    if (!total || total === 0) return { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderColor: 'rgba(30, 41, 59, 0.4)' };
    const ratio = total / maxCount;

    if (ratio < 0.15) return { backgroundColor: '#082f49', borderColor: '#0c4a6e' }; // deep sky blue
    if (ratio < 0.35) return { backgroundColor: '#134e4a', borderColor: '#115e59' }; // teal
    if (ratio < 0.55) return { backgroundColor: '#78350f', borderColor: '#92400e' }; // warm amber/brown
    if (ratio < 0.75) return { backgroundColor: '#d97706', borderColor: '#f59e0b' }; // amber
    return { backgroundColor: '#ea580c', borderColor: '#f97316' }; // vibrant orange
  };

  return (
    <div className={`glass-panel rounded-xl p-5 flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-100 tracking-tight">{title}</h3>
        {question && (
          <p className="text-xs text-sky-400/90 font-medium mt-0.5">{question}</p>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[620px]">
          {/* Hour headers (X-Axis) */}
          <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 mb-1.5 text-center">
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Day</div>
            {HOURS.map((hour) => (
              <div key={`hdr-${hour}`} className="text-[10px] font-mono text-slate-400">
                {hour % 3 === 0 ? `${hour}h` : ''}
              </div>
            ))}
          </div>

          {/* Grid rows for each Day (Y-Axis) */}
          <div className="space-y-1">
            {DAYS.map((day, dIdx) => (
              <div key={`row-${day}`} className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 items-center">
                <span className="text-[11px] font-medium text-slate-400 text-left pr-1 truncate">
                  {SHORT_DAYS[dIdx]}
                </span>
                {HOURS.map((hour) => {
                  const cell = matrixMap[`${day}_${hour}`] || { total: 0, severe: 0, severe_pct: 0 };
                  const colorStyle = getCellColor(cell.total);

                  return (
                    <div
                      key={`cell-${day}-${hour}`}
                      style={colorStyle}
                      onMouseEnter={() =>
                        setHoveredCell({
                          day,
                          hour,
                          total: cell.total,
                          severe: cell.severe,
                          severe_pct: cell.severe_pct,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className="h-6 rounded border transition-all duration-150 cursor-pointer hover:brightness-125 flex items-center justify-center"
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend & Hover Info Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Dynamic Hover Status */}
        <div className="text-xs text-slate-300 min-h-[20px] flex items-center">
          {hoveredCell ? (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-sky-300 font-semibold">{hoveredCell.day} @ {String(hoveredCell.hour).padStart(2, '0')}:00</span>
              <span className="text-slate-500">•</span>
              <span>Total: <strong className="text-slate-100">{formatNumber(hoveredCell.total)}</strong></span>
              <span className="text-slate-500">•</span>
              <span>Severe: <strong className="text-amber-400">{formatNumber(hoveredCell.severe)}</strong> ({formatPercent(hoveredCell.severe_pct)})</span>
            </div>
          ) : (
            <span className="text-slate-500 text-[11px] italic">Hover over any time cell to inspect hourly stats</span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 shrink-0">
          <span>Low</span>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3 rounded bg-sky-950 border border-sky-900" />
            <span className="w-3.5 h-3 rounded bg-teal-900 border border-teal-800" />
            <span className="w-3.5 h-3 rounded bg-amber-900 border border-amber-700" />
            <span className="w-3.5 h-3 rounded bg-amber-600 border border-amber-500" />
            <span className="w-3.5 h-3 rounded bg-orange-600 border border-orange-400" />
          </div>
          <span>High Volume</span>
        </div>
      </div>

      {/* Caveat */}
      {caveat && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/40 flex items-start gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>{caveat}</span>
        </div>
      )}
    </div>
  );
}

export default HeatmapCard;
