import React from 'react';
import { BookOpen } from 'lucide-react';

export function Methodology() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">System Methodology & Documentation</h1>
          <p className="text-sm text-slate-400 mt-1">
            Data pipeline, 3NF schema architecture, DBSCAN clustering, and ML evaluation criteria.
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-purple-500/30 flex flex-col items-center justify-center max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-3">
          Milestone 11 Arrival
        </span>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Project Viva Guide Arriving in Milestone 11</h2>
        <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
          Comprehensive system documentation, architectural diagrams, DBSCAN parameter justification, and DBMS design explanations are scheduled for Milestone 11.
        </p>
      </div>
    </div>
  );
}

export default Methodology;
