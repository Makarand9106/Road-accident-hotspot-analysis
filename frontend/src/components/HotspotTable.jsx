import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import { formatNumber, formatPercent, formatDecimal } from '../utils/constants';

export function HotspotTable({
  hotspots = [],
  selectedHotspotId,
  onSelectHotspot,
  onFlyToHotspot,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [minCountFilter, setMinCountFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter & Search
  const filteredHotspots = useMemo(() => {
    return hotspots.filter((h) => {
      // Risk level filter
      if (riskFilter !== 'all' && h.risk_level !== riskFilter) {
        return false;
      }

      // Min collision count filter
      if (minCountFilter !== 'all') {
        const threshold = parseInt(minCountFilter, 10);
        if (h.accident_count < threshold) return false;
      }

      // Search query filter (district name or ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDistrict = h.district_name?.toLowerCase().includes(q);
        const matchId = String(h.hotspot_id).includes(q);
        if (!matchDistrict && !matchId) return false;
      }

      return true;
    });
  }, [hotspots, riskFilter, minCountFilter, searchQuery]);

  // Sort
  const sortedHotspots = useMemo(() => {
    return [...filteredHotspots].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredHotspots, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedHotspots.length / pageSize) || 1;
  const paginatedHotspots = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedHotspots.slice(start, start + pageSize);
  }, [sortedHotspots, currentPage, pageSize]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleRowClick = (h) => {
    onSelectHotspot(h.hotspot_id);
    if (onFlyToHotspot) {
      onFlyToHotspot({
        lat: h.centre_lat,
        lon: h.centre_lon,
        zoom: 15,
      });
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col space-y-4 p-5 bg-slate-900/60">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Ranked DBSCAN Hotspot Catalog (C14, C15)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Showing {sortedHotspots.length} of {hotspots.length} clusters nationwide. Click any row to center map and view detail breakdown.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search Box */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search district or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
            />
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center gap-1 bg-slate-950 rounded-xl p-1 border border-slate-800">
            {['all', 'High', 'Medium', 'Low'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  setRiskFilter(lvl);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  riskFilter === lvl
                    ? lvl === 'High'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : lvl === 'Medium'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : lvl === 'Low'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl === 'all' ? 'All Tiers' : lvl}
              </button>
            ))}
          </div>

          {/* Min Collisions Filter */}
          <select
            value={minCountFilter}
            onChange={(e) => {
              setMinCountFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 text-slate-300 focus:outline-none focus:border-sky-500 text-xs"
          >
            <option value="all">Min Collisions: All</option>
            <option value="30">Min: 30+ collisions</option>
            <option value="50">Min: 50+ collisions</option>
            <option value="75">Min: 75+ collisions</option>
            <option value="100">Min: 100+ collisions</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 select-none">
            <tr>
              <th
                onClick={() => handleSort('hotspot_id')}
                className="py-3 px-3 cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  <span>ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('district_name')}
                className="py-3 px-3 cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  <span>District</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('risk_level')}
                className="py-3 px-3 cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center gap-1">
                  <span>Risk Tier</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('risk_score')}
                className="py-3 px-3 cursor-pointer hover:text-slate-200 text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Risk Score</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('accident_count')}
                className="py-3 px-3 cursor-pointer hover:text-slate-200 text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Collisions</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('severe_percentage')}
                className="py-3 px-3 cursor-pointer hover:text-slate-200 text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Severe %</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('radius_m')}
                className="py-3 px-3 cursor-pointer hover:text-slate-200 text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Radius</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('trend_slope')}
                className="py-3 px-3 cursor-pointer hover:text-slate-200 text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Trend / yr</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
            {paginatedHotspots.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  No hotspot clusters found matching current filter criteria.
                </td>
              </tr>
            ) : (
              paginatedHotspots.map((h) => {
                const isSelected = selectedHotspotId === h.hotspot_id;
                return (
                  <tr
                    key={h.hotspot_id}
                    onClick={() => handleRowClick(h)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-500/15 border-l-4 border-l-sky-500 text-slate-100 font-medium'
                        : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      #{h.hotspot_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="truncate max-w-[160px] block font-medium">
                        {h.district_name || 'Unassigned'}
                      </span>
                      {h.is_corridor && (
                        <span className="text-[10px] text-amber-400 font-normal">Corridor ({Math.round(h.radius_m * 2)}m)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          h.risk_level === 'High'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : h.risk_level === 'Medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {h.risk_level}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                      {formatDecimal(h.risk_score, 2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatNumber(h.accident_count)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={
                          h.severe_percentage >= 30
                            ? 'text-red-400 font-semibold'
                            : h.severe_percentage >= 20
                            ? 'text-amber-400'
                            : 'text-sky-400'
                        }
                      >
                        {formatDecimal(h.severe_percentage, 1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {Math.round(h.radius_m)}m
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={
                          h.trend_slope > 0
                            ? 'text-amber-400 font-medium'
                            : h.trend_slope < 0
                            ? 'text-emerald-400 font-medium'
                            : 'text-slate-400'
                        }
                      >
                        {h.trend_slope > 0 ? `+${h.trend_slope.toFixed(1)}` : h.trend_slope.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(h);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-300 text-[11px] font-medium transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
        <div>
          Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({sortedHotspots.length} results)
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 font-semibold text-slate-200">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default HotspotTable;
