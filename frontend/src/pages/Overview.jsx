import React, { useState, useEffect } from 'react';
import {
  Car,
  AlertTriangle,
  Flame,
  Users,
  MapPin,
  TrendingUp,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { api } from '../services/api';
import { KpiCard } from '../components/KpiCard';
import { KpiSkeleton, LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorBanner, EmptyStateCard } from '../components/ErrorBanner';
import { LineChartCard } from '../charts/LineChartCard';
import { DonutCard } from '../charts/DonutCard';
import {
  formatNumber,
  formatPercent,
  formatDecimal,
  SEVERITY_COLORS,
} from '../utils/constants';

export function Overview() {
  const { debouncedFilters, resetFilters } = useFilters();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, trendsRes] = await Promise.all([
        api.getAccidentStats(debouncedFilters),
        api.getAccidentTrends(debouncedFilters),
      ]);
      setStats(statsRes.data);
      setTrends(trendsRes.data);
    } catch (err) {
      console.error('Failed to fetch Overview page data:', err);
      setError(err.message || 'Error communicating with backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [debouncedFilters]);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Executive Safety Overview</h1>
          <p className="text-sm text-slate-400 mt-1">High-level KPIs, 5-year trend trajectories, and severity distribution.</p>
        </div>
        <ErrorBanner message={error} onRetry={fetchData} />
      </div>
    );
  }

  // Check if zero records match applied filter
  const isZeroResults = !loading && stats && stats.total_collisions === 0;

  // Format yearly trends for Recharts LineChart (C1)
  const yearlyTrendData = trends?.yearly_trends?.map((item) => ({
    name: String(item.year),
    'Total Collisions': item.total_collisions,
    'Severe Collisions': item.severe_collisions,
    'Fatal Collisions': item.fatal_collisions,
    severe_pct: item.severe_percentage,
  })) || [];

  // Format severity distribution for Donut Chart (C13)
  const totalCollisions = stats?.total_collisions || 0;
  const severityDonutData = stats
    ? [
        {
          name: 'Fatal',
          value: stats.fatal_collisions,
          percent: totalCollisions > 0 ? (stats.fatal_collisions / totalCollisions) * 100 : 0,
          color: SEVERITY_COLORS.Fatal,
        },
        {
          name: 'Serious',
          value: stats.serious_collisions,
          percent: totalCollisions > 0 ? (stats.serious_collisions / totalCollisions) * 100 : 0,
          color: SEVERITY_COLORS.Serious,
        },
        {
          name: 'Slight',
          value: stats.slight_collisions,
          percent: totalCollisions > 0 ? (stats.slight_collisions / totalCollisions) * 100 : 0,
          color: SEVERITY_COLORS.Slight,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Executive Safety Overview
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            National STATS19 collision statistics, 5-year trajectories, and cluster risk rankings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Window: <strong className="text-sky-400 font-mono">2021 – 2025</strong>
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : (
          <>
            {/* 1. Total Collisions */}
            <KpiCard
              title="Total Collisions"
              value={formatNumber(stats?.total_collisions)}
              subtitle="Recorded in filter"
              icon={Car}
              badge="STATS19"
              colorClass="text-slate-100"
            />

            {/* 2. Severe Collisions */}
            <KpiCard
              title="Severe Collisions"
              value={formatNumber(stats?.total_severe_collisions)}
              subtitle={`Rate: ${formatPercent(stats?.severe_percentage)}`}
              icon={AlertTriangle}
              badge="Fatal + Serious"
              badgeColor="bg-amber-500/10 text-amber-300 border-amber-500/30"
              colorClass="text-amber-400"
            />

            {/* 3. Fatalities */}
            <KpiCard
              title="Fatal Collisions"
              value={formatNumber(stats?.fatal_collisions)}
              subtitle={`Share: ${formatPercent(totalCollisions > 0 ? (stats?.fatal_collisions / totalCollisions) * 100 : 0)}`}
              icon={Flame}
              badge="Level 1"
              badgeColor="bg-rose-500/10 text-rose-300 border-rose-500/30"
              colorClass="text-rose-400"
            />

            {/* 4. Total Casualties */}
            <KpiCard
              title="Total Casualties"
              value={formatNumber(stats?.total_casualties)}
              subtitle={`Avg ${formatDecimal(stats?.avg_casualties_per_collision)} per crash`}
              icon={Users}
              badge="Persons"
              colorClass="text-sky-300"
            />

            {/* 5. Active Hotspots */}
            <KpiCard
              title="Active Hotspots"
              value={formatNumber(stats?.hotspots?.active_in_filter)}
              subtitle={`of ${stats?.hotspots?.total_national || 704} national`}
              icon={MapPin}
              badge="DBSCAN"
              colorClass="text-teal-300"
            />

            {/* 6. Highest Risk Score */}
            <KpiCard
              title="Max Hotspot Risk"
              value={stats?.hotspots?.highest_risk_score ? `${formatDecimal(stats?.hotspots?.highest_risk_score)}` : 'N/A'}
              subtitle={stats?.hotspots?.highest_risk_hotspot_id ? `Cluster #${stats?.hotspots?.highest_risk_hotspot_id}` : 'No clusters'}
              icon={ShieldAlert}
              badge="High Risk"
              badgeColor="bg-rose-500/10 text-rose-300 border-rose-500/30"
              colorClass="text-rose-400"
            />
          </>
        )}
      </div>

      {isZeroResults ? (
        <EmptyStateCard onReset={resetFilters} />
      ) : (
        <>
          {/* Main Visualizations Row: Trend Line & Severity Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Yearly Trend Line Chart (C1) */}
            <div className="lg:col-span-2">
              {loading ? (
                <LoadingSkeleton className="h-[400px]" />
              ) : (
                <div className="space-y-3">
                  <LineChartCard
                    title="5-Year Collision & Severity Trend (C1)"
                    question="How has collision volume and severity evolved across the 2021–2025 period?"
                    caveat="Caveat: Total volume reflects post-pandemic mobility recovery. The severe collision proportion increased steadily from 22.5% in 2021 to 26.2% in 2025."
                    data={yearlyTrendData}
                    lines={[
                      { key: 'Total Collisions', name: 'Total Collisions', color: '#38BDF8', strokeWidth: 2.5 },
                      { key: 'Severe Collisions', name: 'Severe Collisions', color: SEVERITY_COLORS.Severe, strokeWidth: 2.5 },
                    ]}
                    xAxisKey="name"
                    xAxisLabel="Reporting Year"
                    yAxisLabel="Collision Count"
                    height={300}
                    tooltipFormatter={(val, name) => `${formatNumber(val)} ${name}`}
                  />

                  {/* 2020 Context Note Banner */}
                  <div className="glass-panel rounded-xl p-3.5 border-sky-500/20 bg-sky-950/20 text-xs text-slate-300 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-sky-300">Methodological Note on Baseline Years: </strong>
                      Calendar year 2020 was excluded from the primary 5-year analytical baseline due to nationwide COVID-19 travel restrictions and artificial traffic suppression, ensuring 2021–2025 trends reflect post-lockdown mobility equilibrium.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: Severity Breakdown Donut (C13) */}
            <div className="lg:col-span-1">
              {loading ? (
                <LoadingSkeleton className="h-[400px]" />
              ) : (
                <DonutCard
                  title="Severity Composition (C13)"
                  question="What proportion of recorded collisions result in fatal, serious, or slight injuries?"
                  caveat="Caveat: Slight collisions represent the vast majority (~75%) of reporting, but severe events generate over 85% of hospitalizations and societal cost."
                  data={severityDonutData}
                  nameKey="name"
                  dataKey="value"
                  centerValue={stats?.total_collisions}
                  centerLabel="Collisions"
                  height={300}
                />
              )}
            </div>
          </div>

          {/* Quick Analytical Summary Cards Row */}
          {!loading && stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 block">Vulnerable User Collisions</span>
                  <span className="text-lg font-bold text-amber-300 font-mono mt-0.5 block">
                    {formatNumber((stats.vulnerable_user_collisions?.motorcycle || 0) + (stats.vulnerable_user_collisions?.cyclist || 0))}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Motorcycles ({formatNumber(stats.vulnerable_user_collisions?.motorcycle)}) & Cyclists ({formatNumber(stats.vulnerable_user_collisions?.cyclist)})
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 block">Heavy Goods Vehicles (HGVs)</span>
                  <span className="text-lg font-bold text-rose-300 font-mono mt-0.5 block">
                    {formatNumber(stats.vulnerable_user_collisions?.hgv || 0)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Commercial freight and large goods vehicles
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Flame className="w-5 h-5" />
                </div>
              </div>

              <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-slate-800">
                <div>
                  <span className="text-xs text-slate-400 block">Hotspot Linked Collisions</span>
                  <span className="text-lg font-bold text-teal-300 font-mono mt-0.5 block">
                    {formatNumber(stats.hotspots?.linked_collisions_in_filter || 0)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {formatPercent(totalCollisions > 0 ? ((stats.hotspots?.linked_collisions_in_filter || 0) / totalCollisions) * 100 : 0)} of filtered volume located in clusters
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Overview;
