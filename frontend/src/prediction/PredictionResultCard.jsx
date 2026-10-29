import React from 'react';
import {
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  Scale,
  Zap,
} from 'lucide-react';
import { formatNumber, formatPercent, formatDecimal } from '../utils/constants';

export function PredictionResultCard({ result }) {
  if (!result) return null;

  const {
    probability,
    probability_pct,
    risk_tier,
    baseline_severe_rate_pct,
    risk_multiplier,
    logit_score,
    top_risk_factors = [],
    top_protective_factors = [],
  } = result;

  const isHigh = risk_tier === 'High';
  const isMedium = risk_tier === 'Medium';
  const isLow = risk_tier === 'Low';

  return (
    <div className="glass-panel rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden bg-slate-900/90 animate-fade-in space-y-6 p-6">
      {/* Top Banner & Risk Tier Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${
              isHigh
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-red-500/10'
                : isMedium
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-500/10'
                : 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sky-500/10'
            }`}
          >
            {isHigh ? '!' : isMedium ? '~' : '✓'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Predicted Severity Classification
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isHigh
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : isMedium
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                }`}
              >
                {risk_tier} Risk Tier
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight mt-0.5">
              {formatDecimal(probability_pct, 2)}% Probability of Severe Outcome
            </h2>
          </div>
        </div>

        {/* Baseline Comparison Badge */}
        <div className="glass-panel px-4 py-2.5 rounded-xl border border-slate-800 flex flex-col items-end">
          <span className="text-[11px] text-slate-400">Baseline Multiplier</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className={`text-lg font-black ${
                risk_multiplier > 1.5
                  ? 'text-red-400'
                  : risk_multiplier > 1.0
                  ? 'text-amber-400'
                  : 'text-sky-400'
              }`}
            >
              {risk_multiplier}×
            </span>
            <span className="text-xs text-slate-400">historical average</span>
          </div>
        </div>
      </div>

      {/* Visual Risk Tier Calibration Scale */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span>0% Safe</span>
          <span className="text-sky-400">Baseline ({formatDecimal(baseline_severe_rate_pct, 1)}%)</span>
          <span className="text-amber-400">2× Baseline ({formatDecimal(baseline_severe_rate_pct * 2, 1)}%)</span>
          <span>100% Severe</span>
        </div>

        {/* Multi-segment Scale Bar */}
        <div className="relative h-4 w-full rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
          <div className="w-[24.2%] h-full bg-sky-500/30 border-r border-sky-500/50" />
          <div className="w-[24.2%] h-full bg-amber-500/30 border-r border-amber-500/50" />
          <div className="w-[51.6%] h-full bg-red-500/30" />

          {/* Indicator Needle */}
          <div
            className="absolute top-0 bottom-0 w-1.5 bg-white shadow-glow rounded-full transition-all duration-700 -translate-x-1/2"
            style={{ left: `${Math.min(Math.max(probability_pct, 2), 98)}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-slate-500 px-1">
          <span>Low Tier (p &lt; 24.2%)</span>
          <span>Medium Tier (24.2% ≤ p &lt; 48.4%)</span>
          <span>High Tier (p ≥ 48.4%)</span>
        </div>
      </div>

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Computed Logit (z)</span>
          <strong className="text-base text-slate-100 font-bold">{logit_score > 0 ? `+${logit_score}` : logit_score}</strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">Linear log-odds sum</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Severe Probability</span>
          <strong className="text-base text-amber-400 font-bold">{formatDecimal(probability_pct, 1)}%</strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">Fatal or Serious injury</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Slight Probability</span>
          <strong className="text-base text-sky-400 font-bold">{formatDecimal(100 - probability_pct, 1)}%</strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">Minor / vehicle damage</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">National Baseline</span>
          <strong className="text-base text-slate-300 font-bold">{formatDecimal(baseline_severe_rate_pct, 1)}%</strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">513k STATS19 crashes</span>
        </div>
      </div>

      {/* Explainability Breakdown: Top 5 Risk Factors & Top Protective Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Risk Factors (Positive Contributions) */}
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-red-400" />
              Top Elevating Risk Factors (+ Log-Odds)
            </h3>
          </div>

          {top_risk_factors.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              No strong positive risk factors present in this scenario.
            </p>
          ) : (
            <div className="space-y-2">
              {top_risk_factors.map((f, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-950/60 border border-red-500/20 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-200">{f.description}</span>
                    <span className="font-bold text-red-400">+{f.contribution.toFixed(3)}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-red-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(Math.abs(f.contribution) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 Protective Factors (Negative Contributions) */}
        <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-sky-400" />
              Top Mitigating Protective Factors (- Log-Odds)
            </h3>
          </div>

          {top_protective_factors.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              No strong mitigating factors active in this scenario.
            </p>
          ) : (
            <div className="space-y-2">
              {top_protective_factors.map((f, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-950/60 border border-sky-500/20 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-200">{f.description}</span>
                    <span className="font-bold text-sky-400">{f.contribution.toFixed(3)}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-sky-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(Math.abs(f.contribution) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PredictionResultCard;
