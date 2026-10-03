import React, { useState, useEffect } from 'react';
import {
  Clock,
  CloudSun,
  Milestone,
  Truck,
  Calendar,
  AlertTriangle,
  Info,
  ShieldCheck,
  Bike,
} from 'lucide-react';
import { useFilters } from '../context/FilterContext';
import { api } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorBanner, EmptyStateCard } from '../components/ErrorBanner';
import { BarChartCard } from '../charts/BarChartCard';
import { LineChartCard } from '../charts/LineChartCard';
import { HeatmapCard } from '../charts/HeatmapCard';
import {
  formatNumber,
  formatPercent,
  formatDecimal,
  SEVERITY_COLORS,
} from '../utils/constants';

const TABS = [
  { id: 'temporal', label: 'Temporal Factors', icon: Clock },
  { id: 'environment', label: 'Environmental Conditions', icon: CloudSun },
  { id: 'road', label: 'Road & Speed Limits', icon: Milestone },
  { id: 'vehicles', label: 'Vehicles & Vulnerability', icon: Truck },
];

export function AccidentAnalysis() {
  const { debouncedFilters, resetFilters } = useFilters();
  const [activeTab, setActiveTab] = useState('temporal');

  // Tab Data States
  const [temporalData, setTemporalData] = useState(null);
  const [environmentData, setEnvironmentData] = useState(null);
  const [roadData, setRoadData] = useState(null);
  const [vehicleData, setVehicleData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'temporal') {
        const res = await api.getTemporalAnalysis(debouncedFilters);
        setTemporalData(res.data);
      } else if (activeTab === 'environment') {
        const res = await api.getEnvironmentAnalysis(debouncedFilters);
        setEnvironmentData(res.data);
      } else if (activeTab === 'road') {
        const res = await api.getRoadAnalysis(debouncedFilters);
        setRoadData(res.data);
      } else if (activeTab === 'vehicles') {
        const res = await api.getVehicleAnalysis(debouncedFilters);
        setVehicleData(res.data);
      }
    } catch (err) {
      console.error(`Failed to load ${activeTab} data:`, err);
      setError(err.message || 'Error communicating with backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, debouncedFilters]);

  // Tab 1 (Temporal) Prepared Formats
  const monthlyBarData =
    temporalData?.monthly?.map((m) => ({
      name: m.month_name,
      'Total Collisions': m.total_collisions,
      'Severe Collisions': m.severe_collisions,
      'Severe %': m.severe_percentage,
    })) || [];

  const weekdayBarData =
    temporalData?.weekday?.map((w) => ({
      name: w.day_name.slice(0, 3),
      'Total Collisions': w.total_collisions,
      'Severe Collisions': w.severe_collisions,
      'Severe %': w.severe_percentage,
    })) || [];

  const hourlyLineData =
    temporalData?.hourly?.map((h) => ({
      name: `${String(h.hour).padStart(2, '0')}:00`,
      'Total Collisions': h.total_collisions,
      'Severe Collisions': h.severe_collisions,
    })) || [];

  const hourlySevereRateData =
    temporalData?.hourly?.map((h) => ({
      name: `${String(h.hour).padStart(2, '0')}:00`,
      'Severe Rate (%)': h.severe_percentage,
    })) || [];

  // Tab 2 (Environment) Prepared Formats
  const weatherBarData =
    environmentData?.weather
      ?.filter((w) => w.condition !== 'Unknown' && w.total_collisions > 100)
      .map((w) => ({
        name: w.condition,
        'Total Collisions': w.total_collisions,
        'Severe %': w.severe_percentage,
      })) || [];

  const surfaceBarData =
    environmentData?.road_surface
      ?.filter((s) => s.condition !== 'Unknown' && s.total_collisions > 100)
      .map((s) => ({
        name: s.condition,
        'Total Collisions': s.total_collisions,
        'Severe %': s.severe_percentage,
      })) || [];

  const lightBarData =
    environmentData?.light_condition
      ?.filter((l) => l.condition !== 'Unknown')
      .map((l) => ({
        name: l.condition,
        'Total Collisions': l.total_collisions,
        'Severe %': l.severe_percentage,
      })) || [];

  // Tab 3 (Road) Prepared Formats
  const roadTypeBarData =
    roadData?.road_types
      ?.filter((r) => r.road_type !== 'Unknown')
      .map((r) => ({
        name: r.road_type,
        'Total Collisions': r.total_collisions,
        'Severe %': r.severe_percentage,
      })) || [];

  const speedLimitData =
    roadData?.speed_limits?.map((s) => ({
      name: `${s.speed_limit} mph`,
      'Total Collisions': s.total_collisions,
      'Severe %': s.severe_percentage,
      'Fatal %': s.fatal_percentage,
      avg_casualties: s.avg_casualties,
    })) || [];

  const urbanRuralData =
    roadData?.urban_rural
      ?.filter((u) => u.area !== 'Unknown')
      .map((u) => ({
        name: u.area,
        'Total Collisions': u.total_collisions,
        'Severe %': u.severe_percentage,
      })) || [];

  // Tab 4 (Vehicles) Prepared Formats
  const topVehiclesData =
    vehicleData?.top_vehicle_categories?.slice(0, 8).map((v) => ({
      name: v.vehicle_type,
      'Vehicles Involved': v.vehicle_count,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Accident Factor Analysis
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Multidimensional investigation across temporal patterns, weather conditions, highway infrastructure, and vehicle types.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20 border border-sky-500/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton className="h-[360px]" />
          <LoadingSkeleton className="h-[360px]" />
          <LoadingSkeleton className="h-[360px]" />
          <LoadingSkeleton className="h-[360px]" />
        </div>
      )}

      {/* Tab 1: Temporal Content */}
      {!loading && !error && activeTab === 'temporal' && (
        <div className="space-y-6">
          {/* C5 Heatmap Full Width */}
          <HeatmapCard
            title="7-Day × 24-Hour Collision Density Heatmap (C5)"
            question="At what precise hours and days do collisions concentrate across the national network?"
            caveat="Caveat: High concentration during weekday rush hours (8 AM & 5 PM) is exposure-driven. Notice how weekend night hours show significantly darker relative severity."
            data={temporalData?.matrix}
          />

          {/* Diurnal Charts Row: C4 Hourly Diurnal & C6 Severe Rate by Hour */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* C4: 24-Hour Diurnal Volume */}
            <LineChartCard
              title="24-Hour Diurnal Crash Profile (C4)"
              question="How does collision volume vary by hour of the day?"
              caveat="Caveat: Morning rush (08:00) and evening rush (17:00) create dual volume spikes due to peak vehicular congestion."
              data={hourlyLineData}
              lines={[
                { key: 'Total Collisions', name: 'Total Collisions', color: '#38BDF8', strokeWidth: 2.5 },
                { key: 'Severe Collisions', name: 'Severe Collisions', color: SEVERITY_COLORS.Severe, strokeWidth: 2.5 },
              ]}
              xAxisKey="name"
              xAxisLabel="Hour of Day"
              yAxisLabel="Collision Volume"
              height={300}
            />

            {/* C6: Severe Crash Percentage by Hour */}
            <LineChartCard
              title="Hourly Severe Collision Proportion (C6)"
              question="At what times of day is an accident most likely to result in fatal or serious injury?"
              caveat="Caveat: While overnight hours have lower total crash volume, the severe casualty proportion peaks between 01:00 and 04:00 (~30–33%) due to higher speeds and intoxication."
              data={hourlySevereRateData}
              lines={[
                { key: 'Severe Rate (%)', name: 'Severe Proportion (%)', color: '#D55E00', strokeWidth: 3 },
              ]}
              xAxisKey="name"
              xAxisLabel="Hour of Day"
              yAxisLabel="Severe %"
              height={300}
              tooltipFormatter={(val) => `${formatDecimal(val)}%`}
            />
          </div>

          {/* Monthly & Weekday Row: C2 Monthly Bar & C3 Weekday Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* C2: Monthly Distribution & Severity Rate */}
            <BarChartCard
              title="Monthly Collision Distribution & Severe % (C2)"
              question="Are collisions seasonal, and does injury severity spike during winter months?"
              caveat="Caveat: Collision volumes remain relatively steady across summer and autumn, but winter months exhibit elevated surface friction risks."
              data={monthlyBarData}
              bars={[{ key: 'Total Collisions', name: 'Collisions', color: '#0072B2' }]}
              lineKey="Severe %"
              lineName="Severe Rate (%)"
              lineColor="#D55E00"
              xAxisKey="name"
              xAxisLabel="Month"
              yAxisLabel="Collisions"
              height={300}
            />

            {/* C3: Weekday Distribution & Severity Rate */}
            <BarChartCard
              title="Day-of-Week Collision Distribution & Severe % (C3)"
              question="Which days of the week experience the highest accident frequency and severity?"
              caveat="Caveat: Friday experiences the peak absolute collision volume, while Saturday and Sunday exhibit higher percentage severity."
              data={weekdayBarData}
              bars={[{ key: 'Total Collisions', name: 'Collisions', color: '#0072B2' }]}
              lineKey="Severe %"
              lineName="Severe Rate (%)"
              lineColor="#D55E00"
              xAxisKey="name"
              xAxisLabel="Day of Week"
              yAxisLabel="Collisions"
              height={300}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Environment Content */}
      {!loading && !error && activeTab === 'environment' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* C7: Weather Condition vs Severe Rate */}
            <BarChartCard
              title="Weather Conditions vs Injury Severity (C7)"
              question="How do adverse atmospheric conditions (rain, fog, high winds) affect collision severity?"
              caveat="Caveat: 80%+ of collisions occur in fine weather due to exposure. However, fine + high winds and fog show the highest severe casualty proportions (28–30%)."
              data={weatherBarData}
              layout="vertical"
              xAxisKey="name"
              bars={[{ key: 'Total Collisions', name: 'Total Collisions', color: '#0284C7' }]}
              lineKey="Severe %"
              lineName="Severe %"
              lineColor="#D55E00"
              height={340}
            />

            {/* C8: Road Surface Condition vs Severe Rate */}
            <BarChartCard
              title="Road Surface Conditions & Severity (C8)"
              question="Does wet, snowy, or icy asphalt increase the likelihood of severe trauma?"
              caveat="Caveat: Wet or damp asphalt accounts for ~23% of collisions. Floods (>3cm) and icy conditions produce elevated severe rates."
              data={surfaceBarData}
              layout="vertical"
              xAxisKey="name"
              bars={[{ key: 'Total Collisions', name: 'Total Collisions', color: '#0284C7' }]}
              lineKey="Severe %"
              lineName="Severe %"
              lineColor="#D55E00"
              height={340}
            />
          </div>

          {/* C9: Light Condition Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChartCard
              title="Lighting Conditions vs Injury Severity (C9)"
              question="How does ambient darkness without street lighting affect accident severity?"
              caveat="Caveat: Unlit darkness is the single most hazardous lighting environment, with severe collision rates reaching 35.0% compared to 23.2% in daylight."
              data={lightBarData}
              layout="vertical"
              xAxisKey="name"
              bars={[{ key: 'Total Collisions', name: 'Total Collisions', color: '#0284C7' }]}
              lineKey="Severe %"
              lineName="Severe %"
              lineColor="#D55E00"
              height={300}
            />

            {/* Explanatory Callout Card */}
            <div className="glass-panel rounded-xl p-6 flex flex-col justify-between border-sky-500/20 bg-sky-950/20">
              <div>
                <div className="flex items-center gap-2 text-sky-400 font-semibold mb-2">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Key Environmental Insight</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-2">
                  The Darkness Multiplier & Exposure Bias
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed space-y-2">
                  Raw collision frequency is highest in <strong className="text-white">Daylight</strong> and <strong className="text-white">Fine</strong> weather because traffic volume is greatest then. However, the probability of an accident turning fatal or serious jumps by <strong className="text-amber-400">+50.7% relative</strong> when driving in <strong className="text-amber-400">Darkness without streetlights</strong> (34.95% severe vs 23.19% in daylight).
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-sky-500/20 flex items-center justify-between text-xs text-slate-400">
                <span>Model Weight Rank: #2</span>
                <span className="font-mono text-sky-300">+0.518 Log-Odds</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Road Infrastructure Content */}
      {!loading && !error && activeTab === 'road' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* C11: Posted Speed Limit Progression */}
            <BarChartCard
              title="Speed Limit vs Severe & Fatal Rates (C11)"
              question="Does legal speed limit correlate with collision severity and fatality risk?"
              caveat="Caveat: Monotonic progression: 20 mph zones have 0.47% fatal rate, while 60 mph single carriageways have 3.84% fatal and 34.5% severe rate."
              data={speedLimitData}
              bars={[{ key: 'Total Collisions', name: 'Total Collisions', color: '#0072B2' }]}
              lineKey="Severe %"
              lineName="Severe %"
              lineColor="#D55E00"
              xAxisKey="name"
              xAxisLabel="Posted Speed Limit"
              yAxisLabel="Collisions"
              height={320}
            />

            {/* Urban vs Rural Comparison */}
            <BarChartCard
              title="Urban vs Rural Safety Profile"
              question="How do accident density and severity differ between built-up and rural roads?"
              caveat="Caveat: Urban roads hold 67.2% of all crashes due to intersection complexity, but Rural roads have significantly higher severity (29.4% vs 21.7%) due to higher vehicle speeds."
              data={urbanRuralData}
              bars={[{ key: 'Total Collisions', name: 'Total Collisions', color: '#0072B2' }]}
              lineKey="Severe %"
              lineName="Severe %"
              lineColor="#D55E00"
              xAxisKey="name"
              xAxisLabel="Geographic Classification"
              yAxisLabel="Collisions"
              height={320}
            />
          </div>

          {/* C10: Road Type Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChartCard
              title="Road Type Distribution & Severity (C10)"
              question="Which highway designs (Single carriageway, Dual, Roundabout) experience the highest injury rates?"
              caveat="Caveat: Single carriageways account for 72.6% of collisions and have the highest severe proportion (25.9%) due to head-on collision exposure."
              data={roadTypeBarData}
              layout="vertical"
              xAxisKey="name"
              bars={[{ key: 'Total Collisions', name: 'Total Collisions', color: '#0284C7' }]}
              lineKey="Severe %"
              lineName="Severe %"
              lineColor="#D55E00"
              height={320}
            />

            {/* Speed Limit DBMS Insight Callout */}
            <div className="glass-panel rounded-xl p-6 flex flex-col justify-between border-amber-500/20 bg-amber-950/20">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Speed Limit Physics & DBMS Query 15</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-2">
                  Kinetic Energy Impact on Casualty Severity
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Kinetic energy scales with the square of velocity ($E_k = \frac{1}{2}mv^2$). In STATS19 data, stepping from 30 mph to 60 mph increases the fatality probability by <strong className="text-rose-400">4.4×</strong> (0.87% → 3.84%), and severe collision rate increases from 22.65% to 34.49%.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-amber-500/20 flex items-center justify-between text-xs text-slate-400">
                <span>60 mph Fatal Rate: 3.84%</span>
                <span>20 mph Fatal Rate: 0.47%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Vehicles & Vulnerability Content */}
      {!loading && !error && activeTab === 'vehicles' && (
        <div className="space-y-6">
          {/* Vulnerable User Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Motorcycle */}
            <div className="glass-panel rounded-xl p-5 border-amber-500/30 bg-amber-950/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-amber-400">Motorcycles</span>
                <Bike className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {formatNumber(vehicleData?.vulnerable_user_rates?.motorcycle?.collisions)}
              </div>
              <div className="mt-2 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Severe Rate:</span>
                  <strong className="text-amber-400 font-mono">
                    {formatPercent(vehicleData?.vulnerable_user_rates?.motorcycle?.severe_rate_pct)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Share of Crashes:</span>
                  <span className="font-mono text-slate-300">
                    {formatPercent(vehicleData?.vulnerable_user_rates?.motorcycle?.share_of_all_crashes_pct)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cyclist */}
            <div className="glass-panel rounded-xl p-5 border-sky-500/30 bg-sky-950/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-sky-400">Pedal Cyclists</span>
                <Bike className="w-5 h-5 text-sky-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {formatNumber(vehicleData?.vulnerable_user_rates?.cyclist?.collisions)}
              </div>
              <div className="mt-2 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Severe Rate:</span>
                  <strong className="text-sky-300 font-mono">
                    {formatPercent(vehicleData?.vulnerable_user_rates?.cyclist?.severe_rate_pct)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Share of Crashes:</span>
                  <span className="font-mono text-slate-300">
                    {formatPercent(vehicleData?.vulnerable_user_rates?.cyclist?.share_of_all_crashes_pct)}
                  </span>
                </div>
              </div>
            </div>

            {/* HGV */}
            <div className="glass-panel rounded-xl p-5 border-rose-500/30 bg-rose-950/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-rose-400">Heavy Goods (HGV)</span>
                <Truck className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {formatNumber(vehicleData?.vulnerable_user_rates?.hgv?.collisions)}
              </div>
              <div className="mt-2 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Severe Rate:</span>
                  <strong className="text-rose-400 font-mono">
                    {formatPercent(vehicleData?.vulnerable_user_rates?.hgv?.severe_rate_pct)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Share of Crashes:</span>
                  <span className="font-mono text-slate-300">
                    {formatPercent(vehicleData?.vulnerable_user_rates?.hgv?.share_of_all_crashes_pct)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* C12: Top Vehicle Types Involved */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BarChartCard
                title="Top Vehicle Categories in STATS19 (C12)"
                question="Which types of vehicles are most frequently involved in recorded collisions?"
                caveat="Caveat: Passenger cars comprise 68% of all involved vehicles. However, two-wheelers suffer disproportionately higher casualty severity upon impact."
                data={topVehiclesData}
                layout="vertical"
                xAxisKey="name"
                bars={[{ key: 'Vehicles Involved', name: 'Vehicles Involved', color: '#0072B2' }]}
                height={340}
              />
            </div>

            <div className="lg:col-span-1">
              <div className="glass-panel rounded-xl p-6 h-full flex flex-col justify-between border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-100 mb-2">
                    Vulnerable User Impact
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Motorcyclists exhibit the highest severe injury rate across all vehicle categories (<strong className="text-amber-400">33.83%</strong>), being nearly <strong className="text-white">1.5× more likely</strong> to suffer fatal or serious injury than car occupants in a collision.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>STATS19 Vehicle Table • 937,265 records analyzed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccidentAnalysis;
