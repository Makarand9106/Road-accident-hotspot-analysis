import React from 'react';
import {
  ShieldCheck,
  BarChart3,
  Award,
  AlertTriangle,
  Info,
  Scale,
  Zap,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { formatNumber, formatPercent, formatDecimal } from '../utils/constants';

// Pre-computed Logistic Regression Odds Ratios (e^w_i) for C16 Chart
const ODDS_RATIO_DATA = [
  { feature: 'Motorcycle Involved', odds_ratio: 2.155, type: 'risk' },
  { feature: 'Cyclist Involved', odds_ratio: 1.664, type: 'risk' },
  { feature: 'Single Carriageway', odds_ratio: 1.388, type: 'risk' },
  { feature: 'HGV Involved', odds_ratio: 1.286, type: 'risk' },
  { feature: 'Speed Limit (+1 SD)', odds_ratio: 1.212, type: 'risk' },
  { feature: 'Fine + High Winds', odds_ratio: 1.220, type: 'risk' },
  { feature: 'Wet or Damp Surface', odds_ratio: 1.214, type: 'risk' },
  { feature: 'Night Diurnal Period', odds_ratio: 1.124, type: 'risk' },
  { feature: 'Darkness (Unlit Lights)', odds_ratio: 1.105, type: 'risk' },
  { feature: 'Motorway Layout', odds_ratio: 0.758, type: 'protective' },
  { feature: 'Urban Area', odds_ratio: 0.794, type: 'protective' },
  { feature: 'Morning Peak Period', odds_ratio: 0.805, type: 'protective' },
  { feature: 'Daylight Ambient', odds_ratio: 0.854, type: 'protective' },
  { feature: 'Vehicles (+1 SD)', odds_ratio: 0.821, type: 'protective' },
];

export function ModelCard({ metricsData }) {
  const perf = metricsData?.active_model || {};
  const dbMetrics = metricsData?.database_model_metrics || {};
  const lrMetrics = dbMetrics['Logistic Regression'] || {};

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden bg-slate-900/60 p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-sky-400" />
            <h2 className="text-xl font-bold text-slate-100">
              Model Card & Statistical Diagnostics
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Audited & Exported
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical evaluation metrics, confusion matrix, odds-ratio attributions, and class imbalance governance.
          </p>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Target:</span>
          <code className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-300">
            is_severe (Fatal/Serious vs Slight)
          </code>
        </div>
      </div>

      {/* 1. Core Evaluation Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">ROC-AUC Score</span>
          <strong className="text-xl font-bold text-sky-400 block mt-0.5">0.6402</strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">Baseline: 0.5000</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">PR-AUC (Avg Prec)</span>
          <strong className="text-xl font-bold text-sky-400 block mt-0.5">0.3669</strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">Baseline: 0.2421</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Severe Recall</span>
          <strong className="text-xl font-bold text-amber-400 block mt-0.5">59.02%</strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">Catches 59% severe</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Precision</span>
          <strong className="text-xl font-bold text-slate-200 block mt-0.5">32.28%</strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">32% true positives</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">F1-Score</span>
          <strong className="text-xl font-bold text-slate-200 block mt-0.5">0.4173</strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">Harmonic balance</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Brier Calibration</span>
          <strong className="text-xl font-bold text-emerald-400 block mt-0.5">0.2345</strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">Mean squared error</span>
        </div>
      </div>

      {/* 2. Confusion Matrix & Calibration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Confusion Matrix Card */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
            2×2 Confusion Matrix (Test Set N = 102,761)
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
              <span className="font-semibold block text-[11px]">True Negatives (TN)</span>
              <strong className="text-lg font-bold text-slate-100">47,090 (60.5%)</strong>
              <p className="text-[10px] text-emerald-400/80 mt-0.5">Correctly flagged slight</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300">
              <span className="font-semibold block text-[11px]">False Positives (FP)</span>
              <strong className="text-lg font-bold text-slate-100">30,798 (39.5%)</strong>
              <p className="text-[10px] text-amber-400/80 mt-0.5">Slight predicted as severe</p>
            </div>
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-red-300">
              <span className="font-semibold block text-[11px]">False Negatives (FN)</span>
              <strong className="text-lg font-bold text-slate-100">10,193 (41.0%)</strong>
              <p className="text-[10px] text-red-400/80 mt-0.5">Severe missed by model</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 text-blue-300">
              <span className="font-semibold block text-[11px]">True Positives (TP)</span>
              <strong className="text-lg font-bold text-slate-100">14,680 (59.0%)</strong>
              <p className="text-[10px] text-blue-400/80 mt-0.5">Correctly flagged severe</p>
            </div>
          </div>
        </div>

        {/* Risk Tier Calibration Progression */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            Empirical Risk Tier Monotonic Calibration
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-sky-500/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-sky-400">Low Risk Tier (p &lt; 24.2%)</span>
                <span className="text-[11px] text-slate-400 block">2,933 test collisions (2.85% of set)</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-100 text-sm">9.89%</span>
                <span className="text-[10px] text-slate-400 block">Observed severe rate</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-400">Medium Risk Tier (24.2% ≤ p &lt; 48.4%)</span>
                <span className="text-[11px] text-slate-400 block">48,469 test collisions (47.17% of set)</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-100 text-sm">17.50%</span>
                <span className="text-[10px] text-slate-400 block">Observed severe rate</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-red-500/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-red-400">High Risk Tier (p ≥ 48.4%)</span>
                <span className="text-[11px] text-slate-400 block">51,359 test collisions (49.98% of set)</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-100 text-sm">31.35%</span>
                <span className="text-[10px] text-slate-400 block">Observed severe rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Top Odds-Ratio Chart (C16) */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Logistic Regression Feature Odds Ratios (C16)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multiplicative change in severe collision odds (<code className="text-sky-300">OR = e^(beta_i)</code>). Values &gt; 1.0 indicate elevated risk; values &lt; 1.0 indicate protective factors.
            </p>
          </div>
          <span className="text-[11px] text-slate-500">Reference: OR = 1.0 (Neutral)</span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ODDS_RATIO_DATA}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0.5, 2.5]}
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis
                dataKey="feature"
                type="category"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#cbd5e1' }}
                width={130}
              />
              <RechartsTooltip
                formatter={(val) => [`${Number(val).toFixed(3)}x odds`, 'Odds Ratio']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <ReferenceLine x={1.0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Bar dataKey="odds_ratio" radius={[0, 4, 4, 0]}>
                {ODDS_RATIO_DATA.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.type === 'risk' ? '#ef4444' : '#0ea5e9'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Model Benchmark Comparison Table */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Benchmarking Classifiers (Test Set N = 102,761)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Model Pipeline</th>
                <th className="py-2.5 px-3">Recall</th>
                <th className="py-2.5 px-3">Precision</th>
                <th className="py-2.5 px-3">F1-Score</th>
                <th className="py-2.5 px-3">ROC-AUC</th>
                <th className="py-2.5 px-3">PR-AUC</th>
                <th className="py-2.5 px-3">Deployment Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="hover:bg-slate-800/40">
                <td className="py-2 px-3 text-slate-400">Dummy Prior Baseline</td>
                <td className="py-2 px-3 text-slate-500">0.0%</td>
                <td className="py-2 px-3 text-slate-500">0.0%</td>
                <td className="py-2 px-3 text-slate-500">0.0000</td>
                <td className="py-2 px-3 text-slate-500">0.5000</td>
                <td className="py-2 px-3 text-slate-500">0.2421</td>
                <td className="py-2 px-3 text-slate-500">Naive Ceiling</td>
              </tr>
              <tr className="bg-sky-500/10 font-medium text-slate-100 border-l-4 border-l-sky-500">
                <td className="py-2.5 px-3 font-bold text-sky-300">Balanced Logistic Regression</td>
                <td className="py-2.5 px-3 text-amber-400 font-bold">59.02%</td>
                <td className="py-2.5 px-3">32.28%</td>
                <td className="py-2.5 px-3 font-bold text-sky-400">0.4173</td>
                <td className="py-2.5 px-3 font-bold text-sky-400">0.6402</td>
                <td className="py-2.5 px-3 font-bold text-sky-400">0.3669</td>
                <td className="py-2.5 px-3 text-emerald-400 font-semibold">Active Operational Model</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2 px-3">Decision Tree (Depth 4)</td>
                <td className="py-2 px-3">58.71%</td>
                <td className="py-2 px-3">32.46%</td>
                <td className="py-2 px-3">0.4181</td>
                <td className="py-2 px-3">0.6400</td>
                <td className="py-2 px-3">0.3520</td>
                <td className="py-2 px-3 text-slate-400">Interpretability Benchmark</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2 px-3">Random Forest (Depth 10)</td>
                <td className="py-2 px-3 text-amber-400">62.57%</td>
                <td className="py-2 px-3">34.35%</td>
                <td className="py-2 px-3 text-slate-100">0.4435</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">0.6701</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">0.3943</td>
                <td className="py-2 px-3 text-slate-400">Non-linear Ceiling</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Limitations & Academic Governance Box */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Model Governance, Limitations & Target Leakage Quarantine
        </div>
        <p className="leading-relaxed text-slate-300">
          <strong>Educational & Analytical Scope:</strong> This machine learning tool is an exploratory statistical simulator developed for the Data Visualization & DBMS curriculum. It is <strong>NOT</strong> an operational emergency dispatch system or certified civil engineering tool.
        </p>
        <p className="leading-relaxed text-slate-400 text-[11px]">
          <strong>Strict Leakage Quarantine:</strong> To eliminate post-crash target leakage, all casualty outcome fields (such as casualty count, casualty severity, and passenger age) are strictly quarantined from the training pipeline. The model relies solely on situational conditions observable prior to impact.
        </p>
      </div>
    </div>
  );
}

export default ModelCard;
