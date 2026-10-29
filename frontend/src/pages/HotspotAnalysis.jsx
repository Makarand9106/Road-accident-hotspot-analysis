import React, { useState, useEffect } from 'react';
import { useFilters } from '../context/FilterContext';
import { api } from '../services/api';
import { HotspotMap } from '../maps/HotspotMap';
import { HotspotDetailPanel } from '../components/HotspotDetailPanel';
import { HotspotTable } from '../components/HotspotTable';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  MapPin,
  Flame,
  ShieldAlert,
  Info,
  Layers,
  Sparkles,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { formatNumber, formatPercent } from '../utils/constants';

export function HotspotAnalysis() {
  const { debouncedFilters, hasActiveFilters } = useFilters();

  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [flyToLocation, setFlyToLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all 704 national hotspot clusters on mount
  useEffect(() => {
    let isMounted = true;
    async function loadHotspots() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getHotspots({ limit: 1000 });
        if (isMounted && res.hotspots) {
          setHotspots(res.hotspots);
          // Set default selected hotspot to highest risk hotspot (#215 or first)
          if (res.hotspots.length > 0 && !selectedHotspotId) {
            setSelectedHotspotId(res.hotspots[0].hotspot_id);
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load hotspot clusters');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHotspots();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectHotspot = (id) => {
    setSelectedHotspotId(id);
    const target = hotspots.find((h) => h.hotspot_id === id);
    if (target) {
      setFlyToLocation({
        lat: target.centre_lat,
        lon: target.centre_lon,
        zoom: 15,
      });
    }
  };

  const handleFlyToLocation = (loc) => {
    setFlyToLocation(loc);
  };

  if (loading && hotspots.length === 0) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error && hotspots.length === 0) {
    return (
      <div className="space-y-6">
        <ErrorBanner error={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Spatial Hotspot Analysis & Risk Clusters
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
              DBSCAN (ε=150m)
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Exploration of 704 national collision clusters, multi-criteria risk percentiles, and visible incident overlays.
          </p>
        </div>

        {/* Quick Summary KPIs */}
        <div className="flex items-center gap-2 text-xs">
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Clusters</span>
            <strong className="text-slate-100 font-bold text-sm">704</strong>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-950/20">
            <span className="text-red-400 block text-[10px]">High Risk</span>
            <strong className="text-red-300 font-bold text-sm">141 (20%)</strong>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-950/20">
            <span className="text-amber-400 block text-[10px]">Medium Risk</span>
            <strong className="text-amber-300 font-bold text-sm">211 (30%)</strong>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-950/20">
            <span className="text-sky-400 block text-[10px]">Low Risk</span>
            <strong className="text-sky-300 font-bold text-sm">352 (50%)</strong>
          </div>
        </div>
      </div>

      {/* Filter Application Notice (Requirement #3) */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>
            <strong>Global Filter Scope:</strong> DBSCAN spatial clusters (704 hotspots) represent fixed 5-year spatial aggregates; the map's <em>Accident Points</em> layer dynamically updates with your active global filter parameters.
          </span>
        </div>
        {hasActiveFilters && (
          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-semibold text-[11px] whitespace-nowrap">
            Filters Active on Points
          </span>
        )}
      </div>

      {/* Main Interactive Map & Side Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Container (7 or 8 columns on large screens) */}
        <div className={selectedHotspotId ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'}>
          <HotspotMap
            hotspots={hotspots}
            selectedHotspotId={selectedHotspotId}
            onSelectHotspot={handleSelectHotspot}
            globalFilters={debouncedFilters}
            flyToLocation={flyToLocation}
          />
        </div>

        {/* Side Detail Panel (5 or 4 columns on large screens) */}
        {selectedHotspotId && (
          <div className="lg:col-span-5 xl:col-span-4">
            <HotspotDetailPanel
              hotspotId={selectedHotspotId}
              onClose={() => setSelectedHotspotId(null)}
              onFlyToLocation={handleFlyToLocation}
            />
          </div>
        )}
      </div>

      {/* Ranked Hotspots Table */}
      <div className="pt-2">
        <HotspotTable
          hotspots={hotspots}
          selectedHotspotId={selectedHotspotId}
          onSelectHotspot={handleSelectHotspot}
          onFlyToHotspot={handleFlyToLocation}
        />
      </div>
    </div>
  );
}

export default HotspotAnalysis;
