// Common color tokens for severity and charts
export const SEVERITY_COLORS = {
  Fatal: '#D55E00',    // Vermilion / Crimson
  Serious: '#E69F00',  // Amber / Orange
  Slight: '#0072B2',   // Slate / Blue
  Severe: '#D55E00',
  Total: '#009E73',    // Emerald
};

export const RISK_COLORS = {
  High: '#D55E00',
  Medium: '#E69F00',
  Low: '#0072B2',
};

// Format integer with commas (e.g. 513,801)
export function formatNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString();
}

// Format percentage (e.g. 24.2%)
export function formatPercent(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  return `${Number(val).toFixed(decimals)}%`;
}

// Format decimal to fixed decimals
export function formatDecimal(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return Number(val).toFixed(decimals);
}
