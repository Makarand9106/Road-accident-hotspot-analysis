import React from 'react';
import { Sparkles } from 'lucide-react';

export function RiskPrediction() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Machine Learning Risk Predictor</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time scenario simulation and explainable severity risk scoring powered by logistic regression.
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-amber-500/30 flex flex-col items-center justify-center max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-3">
          Milestone 11 Arrival
        </span>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Interactive Risk Simulator Arriving in Milestone 11</h2>
        <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
          The interactive what-if driving scenario simulator, feature contribution breakdown, and baseline risk comparisons are scheduled for Milestone 11.
        </p>
      </div>
    </div>
  );
}

export default RiskPrediction;
