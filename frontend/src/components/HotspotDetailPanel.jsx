import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  X,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  ShieldAlert,
  Loader2,
  Info,
  Car,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { SEVERITY_COLORS, RISK_COLORS, formatNumber, formatPercent, formatDecimal } from '../utils/constants';

export function HotspotDetailPanel({ hotspotId, onClose, onFlyToLocation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hotspotId) return;

    let isMounted = true;
    async function loadHotspot() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getHotspotById(hotspotId);
        if (isMounted && res.data) {
          setData(res.data);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load hotspot details');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHotspot();
    return () => {
      isMounted = false;
    };
  }, [hotspotId]);

  if (!hotspotId) return null;

  return (
    <div className="glass-panel rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col h-full max-h-[780px] overflow-hidden bg-slate-900/95 backdrop-blur-xl animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              data?.scores?.risk_level === 'High'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : data?.scores?.risk_level === 'Medium'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
            }`}
          >
            #{hotspotId}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                Hotspot Cluster #{hotspotId}
              </h2>
              {data && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    data.scores?.risk_level === 'High'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : data.scores?.risk_level === 'Medium'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  }`}
                >
                  {data.scores?.risk_level} Risk
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-sky-400" />
              {data?.location?.district_name || 'Loading district...'}
              {data?.national_risk_rank && (
                <span className="text-slate-500 ml-1">
                  (National Rank: #{data.national_risk_rank} of 704)
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <p className="text-sm text-slate-400">Fetching cluster analytical metrics...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Error Loading Hotspot</strong>
              <p>{error}</p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Pedagogical Wording & Methodological Caveat */}
            <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200/90 leading-relaxed">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sky-300 mb-1">
                    Collision cluster detected in the dataset
                  </p>
                  <p className="text-slate-300 text-[11px]">
                    This location represents an empirical high-density collision cluster detected via DBSCAN spatial clustering (150m radius). 
                    <em> Notice:</em> Cluster density reflects historical recorded police incidents, not an engineering certification of inherent infrastructure defect or objective road danger.
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-400 block">Total Collisions</span>
                <span className="text-xl font-bold text-slate-100">{formatNumber(data.accident_count)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">2021–2025 Total</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-400 block">Severe Collisions</span>
                <span className="text-xl font-bold text-amber-400">
                  {formatNumber(data.fatal_count + data.serious_count)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {data.severe_percentage}% of cluster
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-400 block">Composite Score</span>
                <span className="text-xl font-bold text-sky-400">{formatDecimal(data.scores?.composite_risk_score, 2)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Scale 0 to 100</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-400 block">Cluster Radius</span>
                <span className="text-xl font-bold text-slate-100">{Math.round(data.radius_m)}m</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {data.is_corridor ? 'Arterial Corridor' : 'Localized Node'}
                </span>
              </div>
            </div>

            {/* Coordinates & Geometry Row */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs">
              <div className="text-slate-400">
                <span className="font-semibold text-slate-200">Centre Coordinates: </span>
                <code>{data.centre_lat.toFixed(6)}° N, {data.centre_lon.toFixed(6)}° W</code>
              </div>
              {onFlyToLocation && (
                <button
                  type="button"
                  onClick={() =>
                    onFlyToLocation({
                      lat: data.centre_lat,
                      lon: data.centre_lon,
                      zoom: 15,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500 hover:text-slate-950 font-medium transition-all text-xs flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" /> Zoom Map
                </button>
              )}
            </div>

            {/* Score Component Breakdown (F, S, T) */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Three-Component Multi-Criteria Risk Score
                </h3>
                <span className="text-xs font-bold text-slate-300">
                  {formatDecimal(data.scores?.composite_risk_score, 2)} / 100
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Frequency Score (F) */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Frequency Percentile (F, Weight 33.3%):</span>
                    <span className="font-semibold text-slate-200">{formatDecimal(data.scores?.frequency_score, 1)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(data.scores?.frequency_score, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Severity Score (S) */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Severity Percentile (S, Weight 33.3%):</span>
                    <span className="font-semibold text-slate-200">{formatDecimal(data.scores?.severity_score, 1)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(data.scores?.severity_score, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Trend Score (T) */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Trend Percentile (T, Weight 33.3%):</span>
                    <span className="font-semibold text-slate-200">
                      {formatDecimal(data.scores?.trend_score, 1)}% (Slope: {data.trend_slope > 0 ? `+${data.trend_slope.toFixed(2)}` : data.trend_slope.toFixed(2)} / yr)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(data.scores?.trend_score, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Severity Breakdown Donut & Table */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Severity Composition
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-900 border border-red-500/30">
                  <span className="text-[11px] text-red-400 font-medium block">Fatal</span>
                  <strong className="text-base text-slate-100">{data.fatal_count}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formatPercent((data.fatal_count / data.accident_count) * 100, 1)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-amber-500/30">
                  <span className="text-[11px] text-amber-400 font-medium block">Serious</span>
                  <strong className="text-base text-slate-100">{data.serious_count}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formatPercent((data.serious_count / data.accident_count) * 100, 1)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-blue-500/30">
                  <span className="text-[11px] text-sky-400 font-medium block">Slight</span>
                  <strong className="text-base text-slate-100">{data.slight_count}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formatPercent((data.slight_count / data.accident_count) * 100, 1)}
                  </span>
                </div>
              </div>
            </div>

            {/* 5-Year Annual Progression Mini Chart */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                  5-Year Collision Trajectory (2021–2025)
                </h3>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.yearly_progression || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar dataKey="slight_collisions" name="Slight" stackId="a" fill="#0072B2" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="serious_collisions" name="Serious" stackId="a" fill="#E69F00" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="fatal_collisions" name="Fatal" stackId="a" fill="#D55E00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Member Collisions Sample */}
            {data.recent_collisions_sample && data.recent_collisions_sample.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-slate-400" />
                  Recent Member Collisions Sample ({data.recent_collisions_sample.length})
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                  {data.recent_collisions_sample.map((acc) => (
                    <div
                      key={acc.accident_index}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">
                          #{acc.accident_index}
                        </span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{acc.accident_date ? String(acc.accident_date).substring(0, 10) : 'N/A'} {acc.accident_time}</span>
                          <span>• {acc.weather}</span>
                          <span>• {acc.light}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          acc.severity_name === 'Fatal'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : acc.severity_name === 'Serious'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {acc.severity_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default HotspotDetailPanel;
