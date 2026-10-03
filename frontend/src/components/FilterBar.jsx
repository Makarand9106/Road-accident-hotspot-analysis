import React from 'react';
import { Filter, RotateCcw, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useFilters } from '../context/FilterContext';

export function FilterBar() {
  const {
    filters,
    filterOptions,
    setFilter,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
    isLoadingOptions,
  } = useFilters();

  return (
    <div className="sticky top-16 z-20 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 lg:px-8 py-3 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filter label & active count */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <span>Filters</span>
          </div>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white shadow-sm animate-pulse">
              {activeFilterCount} active
            </span>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="flex flex-wrap items-center gap-2 text-xs flex-1 justify-start md:justify-end">
          {/* Year From */}
          <div className="relative">
            <select
              id="filter-year-from"
              value={filters.year_from || ''}
              onChange={(e) => setFilter('year_from', e.target.value)}
              className="appearance-none bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="">From: All (2021)</option>
              {filterOptions.years?.map((yr) => (
                <option key={`yf-${yr}`} value={yr}>
                  From: {yr}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Year To */}
          <div className="relative">
            <select
              id="filter-year-to"
              value={filters.year_to || ''}
              onChange={(e) => setFilter('year_to', e.target.value)}
              className="appearance-none bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="">To: All (2025)</option>
              {filterOptions.years?.map((yr) => (
                <option key={`yt-${yr}`} value={yr}>
                  To: {yr}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Police Force */}
          <div className="relative max-w-[160px]">
            <select
              id="filter-police-force"
              value={filters.police_force || ''}
              onChange={(e) => setFilter('police_force', e.target.value)}
              className="appearance-none bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500 transition-colors truncate w-full"
            >
              <option value="">Police Force: All</option>
              {filterOptions.police_forces?.map((pf) => (
                <option key={`pf-${pf.id}`} value={pf.id}>
                  {pf.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Severity */}
          <div className="relative">
            <select
              id="filter-severity"
              value={filters.severity || ''}
              onChange={(e) => setFilter('severity', e.target.value)}
              className="appearance-none bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="">Severity: All</option>
              <option value="Fatal">Fatal</option>
              <option value="Serious">Serious</option>
              <option value="Slight">Slight</option>
              <option value="Severe">Severe (Fatal/Serious)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Weather */}
          <div className="relative max-w-[150px]">
            <select
              id="filter-weather"
              value={filters.weather || ''}
              onChange={(e) => setFilter('weather', e.target.value)}
              className="appearance-none bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500 transition-colors truncate w-full"
            >
              <option value="">Weather: All</option>
              {filterOptions.weather_conditions?.map((w) => (
                <option key={`w-${w.id}`} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Road Surface */}
          <div className="relative max-w-[150px]">
            <select
              id="filter-surface"
              value={filters.road_surface || ''}
              onChange={(e) => setFilter('road_surface', e.target.value)}
              className="appearance-none bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500 transition-colors truncate w-full"
            >
              <option value="">Surface: All</option>
              {filterOptions.road_surface_conditions?.map((s) => (
                <option key={`s-${s.id}`} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Vehicle Type */}
          <div className="relative">
            <select
              id="filter-vehicle-type"
              value={filters.vehicle_type || ''}
              onChange={(e) => setFilter('vehicle_type', e.target.value)}
              className="appearance-none bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="">Vehicle: All</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="hgv">HGV / Heavy</option>
              <option value="cyclist">Pedal Cyclist</option>
              <option value="car">Car / Van</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Time Period */}
          <div className="relative">
            <select
              id="filter-time-period"
              value={filters.time_period || ''}
              onChange={(e) => setFilter('time_period', e.target.value)}
              className="appearance-none bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg pl-2.5 pr-7 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="">Period: All</option>
              <option value="Morning Peak">Morning Peak</option>
              <option value="Daytime">Daytime</option>
              <option value="Evening Peak">Evening Peak</option>
              <option value="Evening">Evening</option>
              <option value="Night">Night</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              id="btn-reset-filters"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm shrink-0"
              title="Reset all applied filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FilterBar;
