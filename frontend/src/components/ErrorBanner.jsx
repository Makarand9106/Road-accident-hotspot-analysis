import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function ErrorBanner({ message, onRetry, className = '' }) {
  return (
    <div className={`glass-panel border-amber-500/30 bg-amber-950/20 text-amber-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-100">Unable to load data</h4>
          <p className="text-sm text-amber-300/80 mt-1">{message || 'An unexpected error occurred while communicating with the backend API.'}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Request
        </button>
      )}
    </div>
  );
}

export function EmptyStateCard({ title = "No Collisions Match Filters", message = "Try broadening your filter criteria (e.g. adjust year range, police force, or severity).", onReset }) {
  return (
    <div className="glass-panel rounded-xl p-12 text-center flex flex-col items-center justify-center my-6">
      <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mb-4 text-slate-400">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">{message}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="px-4 py-2 bg-sky-600/30 hover:bg-sky-600/40 text-sky-200 border border-sky-500/30 rounded-lg text-sm font-medium transition-colors"
        >
          Reset All Filters
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
