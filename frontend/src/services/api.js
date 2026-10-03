const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * Builds a query string from an object, stripping out empty/null/undefined values.
 */
function buildQueryString(params = {}) {
  const cleanParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      cleanParams.append(key, value);
    }
  });

  const qs = cleanParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data?.message || `HTTP ${response.status}: ${response.statusText}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error(`Network error connecting to API at ${url}:`, error);
      throw new Error(`Unable to connect to API server at ${BASE_URL}. Ensure the backend is running.`);
    }
    throw error;
  }
}

export const api = {
  // Health & Metadata
  getHealth: () => fetchJson('/health'),
  getFilterOptions: () => fetchJson('/meta/filters'),

  // Accident Fact Statistics & Trends
  getAccidentStats: (filters = {}) => fetchJson(`/accidents/stats${buildQueryString(filters)}`),
  getAccidentTrends: (filters = {}) => fetchJson(`/accidents/trends${buildQueryString(filters)}`),
  getAccidents: (params = {}) => fetchJson(`/accidents${buildQueryString(params)}`),

  // Multidimensional Exploratory Analysis
  getTemporalAnalysis: (filters = {}) => fetchJson(`/analysis/temporal${buildQueryString(filters)}`),
  getEnvironmentAnalysis: (filters = {}) => fetchJson(`/analysis/environment${buildQueryString(filters)}`),
  getRoadAnalysis: (filters = {}) => fetchJson(`/analysis/road${buildQueryString(filters)}`),
  getSeverityAnalysis: (filters = {}) => fetchJson(`/analysis/severity${buildQueryString(filters)}`),
  getVehicleAnalysis: (filters = {}) => fetchJson(`/analysis/vehicles${buildQueryString(filters)}`),

  // Hotspots & Spatial Analytics
  getHotspots: (params = {}) => fetchJson(`/hotspots${buildQueryString(params)}`),
  getHotspotById: (id) => fetchJson(`/hotspots/${id}`),
  getRiskSummary: () => fetchJson('/risk'),

  // DBMS Analytical SQL Insights
  getSqlInsights: () => fetchJson('/sql-insights'),
  getSqlInsightByNumber: (num) => fetchJson(`/sql-insights/${num}`),

  // Machine Learning Model
  getModelMetrics: () => fetchJson('/model/metrics'),
  predictRisk: (scenarioPayload) =>
    fetchJson('/predict', {
      method: 'POST',
      body: JSON.stringify(scenarioPayload),
    }),
};

export default api;
