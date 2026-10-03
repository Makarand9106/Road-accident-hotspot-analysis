import React from 'react';

export function LoadingSkeleton({ className = 'h-64' }) {
  return (
    <div className={`glass-panel rounded-xl p-6 relative overflow-hidden animate-pulse ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-slate-800 rounded w-1/3"></div>
        <div className="h-4 bg-slate-800 rounded w-1/6"></div>
      </div>
      <div className="space-y-3 pt-2">
        <div className="h-4 bg-slate-800/80 rounded w-full"></div>
        <div className="h-4 bg-slate-800/60 rounded w-5/6"></div>
        <div className="h-32 bg-slate-800/40 rounded-lg w-full mt-4"></div>
      </div>
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="glass-panel rounded-xl p-5 relative overflow-hidden animate-pulse flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        <div className="h-8 w-8 bg-slate-800 rounded-lg"></div>
      </div>
      <div className="h-8 bg-slate-700/80 rounded w-3/4 my-2"></div>
      <div className="h-3 bg-slate-800/60 rounded w-2/3"></div>
    </div>
  );
}

export default LoadingSkeleton;
