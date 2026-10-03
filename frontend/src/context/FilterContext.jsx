import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

const FilterContext = createContext(null);

export const DEFAULT_FILTERS = {
  year_from: '',
  year_to: '',
  police_force: '',
  district: '',
  severity: '',
  weather: '',
  road_surface: '',
  vehicle_type: '',
  time_period: '',
  speed_limit: '',
  is_weekend: '',
};

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState(DEFAULT_FILTERS);
  const [filterOptions, setFilterOptions] = useState({
    years: [2021, 2022, 2023, 2024, 2025],
    police_forces: [],
    local_authority_districts: [],
    weather_conditions: [],
    road_surface_conditions: [],
    light_conditions: [],
    road_types: [],
    speed_limits: [20, 30, 40, 50, 60, 70],
    time_periods: ['Morning Peak', 'Daytime', 'Evening Peak', 'Evening', 'Night'],
    severities: [
      { id: 'Fatal', name: 'Fatal' },
      { id: 'Serious', name: 'Serious' },
      { id: 'Slight', name: 'Slight' },
      { id: 'Severe', name: 'Severe (Fatal or Serious)' },
    ],
    vehicle_types: ['motorcycle', 'hgv', 'cyclist', 'car'],
  });
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  // Fetch filter dropdown options once on mount
  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      try {
        setIsLoadingOptions(true);
        const res = await api.getFilterOptions();
        if (isMounted && res.data) {
          setFilterOptions((prev) => ({
            ...prev,
            ...res.data,
            severities: [
              { id: 'Fatal', name: 'Fatal' },
              { id: 'Serious', name: 'Serious' },
              { id: 'Slight', name: 'Slight' },
              { id: 'Severe', name: 'Severe (Fatal/Serious)' },
            ],
          }));
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load filter metadata options:', err);
          setOptionsError(err.message);
        }
      } finally {
        if (isMounted) setIsLoadingOptions(false);
      }
    }
    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce filter updates to prevent rapid API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 250);

    return () => clearTimeout(timer);
  }, [filters]);

  const setFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // If police force changes, clear district if it no longer applies
      if (key === 'police_force' && value === '') {
        next.district = '';
      }
      return next;
    });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined).length;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;

  const value = {
    filters,
    debouncedFilters,
    filterOptions,
    isLoadingOptions,
    optionsError,
    setFilter,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
