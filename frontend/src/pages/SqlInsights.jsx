import React from 'react';
import { Database } from 'lucide-react';

export function SqlInsights() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">DBMS Course SQL Insights</h1>
          <p className="text-sm text-slate-400 mt-1">
            20 analytical SQL queries demonstrating advanced PostgreSQL DBMS concepts.
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-emerald-500/30 flex flex-col items-center justify-center max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
          <Database className="w-8 h-8" />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
          Milestone 11 Arrival
        </span>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Live SQL Query Runner Arriving in Milestone 11</h2>
        <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
          The interactive SQL query catalogue, execution timer, query explanation inspector, and tabular result view are scheduled for Milestone 11.
        </p>
      </div>
    </div>
  );
}

export default SqlInsights;
