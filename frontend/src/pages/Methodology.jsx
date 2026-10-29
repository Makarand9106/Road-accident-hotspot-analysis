import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ErdDiagram } from '../components/ErdDiagram';
import {
  BookOpen,
  Database,
  Layers,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  Activity,
  Award,
  Scale,
  Brain,
  Cpu,
} from 'lucide-react';
import { formatNumber, formatPercent, formatDecimal } from '../utils/constants';

export function Methodology() {
  const [healthData, setHealthData] = useState(null);
  const [metricsData, setMetricsData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadLiveMetadata() {
      try {
        const [hRes, mRes] = await Promise.all([
          api.getHealth().catch(() => null),
          api.getModelMetrics().catch(() => null),
        ]);
        if (isMounted) {
          if (hRes) setHealthData(hRes);
          if (mRes) setMetricsData(mRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch live methodology metadata:', err);
      }
    }
    loadLiveMetadata();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalAccidents = healthData?.database?.counts?.accidents || 513801;
  const totalVehicles = healthData?.database?.counts?.vehicles || 937265;
  const totalCasualties = healthData?.database?.counts?.casualties || 652821;
  const totalHotspots = healthData?.database?.counts?.hotspots || 704;

  return (
    <div className="space-y-10 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              System Methodology & Academic Documentation
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Data Visualization & DBMS
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Complete technical architecture, statistical formulations, 3NF schema, DBSCAN clustering, and ML governance.
          </p>
        </div>

        {/* Live Database Audit Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Fact Collisions</span>
            <strong className="text-slate-100 font-bold text-sm">{formatNumber(totalAccidents)}</strong>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Vehicles</span>
            <strong className="text-slate-100 font-bold text-sm">{formatNumber(totalVehicles)}</strong>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Casualties</span>
            <strong className="text-slate-100 font-bold text-sm">{formatNumber(totalCasualties)}</strong>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-950/20">
            <span className="text-purple-300 block text-[10px]">DBSCAN Clusters</span>
            <strong className="text-purple-200 font-bold text-sm">{totalHotspots}</strong>
          </div>
        </div>
      </div>

      {/* SECTION 1: Dataset & STATS19 Background */}
      <section className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 bg-slate-900/60">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <FileText className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-slate-100">
            1. STATS19 Dataset & Source Characteristics
          </h2>
        </div>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            The project ingests the official <strong>UK Department for Transport (DfT) STATS19 Road Safety Dataset</strong> covering the 5 most recent complete calendar reporting years (<strong>2021–2025</strong>), comprising <strong>{formatNumber(totalAccidents)} collisions</strong>, <strong>{formatNumber(totalVehicles)} vehicles</strong>, and <strong>{formatNumber(totalCasualties)} casualties</strong> across Great Britain.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <strong className="text-slate-100 block font-semibold">Exclusion of Calendar Year 2020:</strong>
              <p className="text-slate-400 text-[11px]">
                Year 2020 was deliberately quarantined and excluded from baseline calculations because nationwide COVID-19 lockdown travel restrictions caused an abnormal ~22% drop in traffic volume, introducing artificial structural distortions into multi-year trend regressions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <strong className="text-amber-400 block font-semibold">Absence of Exposure Denominator:</strong>
              <p className="text-slate-400 text-[11px]">
                The STATS19 dataset records incidents only and does not contain baseline traffic flow or Vehicle Kilometres Travelled (VKT). Consequently, collision counts measure <em>empirical incident concentration</em> rather than <em>individual driver risk per vehicle trip</em>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Data Preprocessing & Feature Derivation */}
      <section className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 bg-slate-900/60">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-slate-100">
            2. ETL Preprocessing & Feature Derivation Pipeline
          </h2>
        </div>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            Raw data underwent automated cleaning via <code>python/preprocessing/run_pipeline.py</code>, ensuring strict relational integrity and verifiable audit trails:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-slate-200 block mb-1">1. Sentinel Cleanup</span>
              <p className="text-slate-400 text-[11px]">
                Converted domain sentinel missingness codes (<code>-1, 99, 9, 'NULL', ''</code>) to SQL NULL across all dimension keys.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-slate-200 block mb-1">2. Coordinate Verification</span>
              <p className="text-slate-400 text-[11px]">
                Audited GPS coordinates within GB bounding boxes (Lat 49.5–61.0°N, Lon -8.5–2.0°E); 53 missing coordinates safely flagged.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-slate-200 block mb-1">3. Feature Engineering</span>
              <p className="text-slate-400 text-[11px]">
                Derived commuter time periods, binary severity flag (<code>is_severe</code>: Fatal/Serious), and vehicle involvement indicators.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: 3NF Relational Database Architecture */}
      <section className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 bg-slate-900/60">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-slate-100">
              3. Relational Database Design (3NF) & Schema ERD
            </h2>
          </div>
          <span className="text-xs text-slate-400">PostgreSQL Schema: <code>database/schema.sql</code></span>
        </div>

        <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
          <p>
            The database follows strict Third Normal Form (3NF) principles across <strong>18 PostgreSQL tables</strong>, ensuring zero update anomalies and minimal storage redundancy:
          </p>

          {/* Embedded Scalable SVG ER Diagram */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-400" />
              Entity-Relationship Diagram (ERD):
            </span>
            <ErdDiagram />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-sky-300 block">Fact Table:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5"><code>accident</code> ({formatNumber(totalAccidents)} rows, granular coordinate and temporal telemetry).</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-emerald-300 block">Related Entities:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5"><code>vehicle</code> ({formatNumber(totalVehicles)}) and <code>casualty</code> ({formatNumber(totalCasualties)}) in 1:N relations.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-purple-300 block">Clustering & Auditing:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5"><code>hotspot</code> ({totalHotspots} clusters) and <code>model_metrics</code> (31 audit entries).</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <strong className="text-amber-300 block">13 Lookup Dimensions:</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">District, Police Force, Weather, Road Surface, Light, Road Type, Speed Limits, etc.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: DBSCAN Spatial Hotspot Clustering */}
      <section className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 bg-slate-900/60">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Layers className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-bold text-slate-100">
            4. DBSCAN Spatial Hotspot Clustering & Risk Scoring
          </h2>
        </div>

        <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <strong className="text-slate-100 block font-semibold">Why DBSCAN on Projected Coordinates?</strong>
              <p className="text-slate-300 text-[11px]">
                Road collisions form arbitrary spatial geometries along winding corridors and urban intersections. DBSCAN (Density-Based Spatial Clustering of Applications with Noise) was chosen because:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li>Discovers clusters of arbitrary non-spherical shapes without specifying cluster count <em>k</em>.</li>
                <li>Operates directly on projected <strong>British National Grid (OSGB36) Easting/Northing coordinates</strong>, guaranteeing exact metric Euclidean distances in metres.</li>
                <li>Explicitly classifies isolated rural crashes as noise rather than forcing them into artificial clusters.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <strong className="text-slate-100 block font-semibold">Empirical Parameter Selection:</strong>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
                <div>
                  <span className="text-sky-300 font-bold">ε = 150 metres:</span> Determined via 30-nearest-neighbor distance elbow curve.
                </div>
                <div>
                  <span className="text-amber-300 font-bold">MinPts = 30 collisions:</span> Ensures statistical significance across 5 reporting years (≥ 6 collisions/year).
                </div>
                <div>
                  <span className="text-emerald-300 font-bold">Yield:</span> <strong>704 clusters</strong> encompassing <strong>63,879 member collisions</strong> (12.43% of national total).
                </div>
              </div>
            </div>
          </div>

          {/* Formula Callout */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <strong className="text-slate-100 block font-semibold">Multi-Criteria Composite Hotspot Risk Formula:</strong>
            <code className="text-sky-300 block font-mono text-xs">
              Risk Score = (0.333 × Frequency Percentile) + (0.333 × Severity Percentile) + (0.333 × Trend Percentile)
            </code>
            <p className="text-slate-400 text-[11px]">
              Tiers assigned via operational percentile ranks: <strong>High (Top 20%, Score ≥ 48.4)</strong>, <strong>Medium (Next 30%, Score 24.2–48.4)</strong>, and <strong>Low (Bottom 50%, Score &lt; 24.2)</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5: Explainable Risk Prediction Model */}
      <section className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 bg-slate-900/60">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Brain className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-slate-100">
            5. Explainable Severity-Risk Prediction Model
          </h2>
        </div>

        <div className="text-xs text-slate-300 space-y-4 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 text-red-200 text-xs">
            <strong className="block text-red-300 font-bold mb-1">
              Strict Target Leakage Quarantine (Casualty Data Exclusion):
            </strong>
            <p className="text-slate-300 text-[11px]">
              Under strict scientific principles, <strong>all post-crash casualty outcomes</strong> (e.g. casualty count, casualty severity, passenger age) were completely quarantined and excluded from feature engineering. Casualty trauma is an <em>aftermath medical outcome</em>, not a pre-crash predictor. Including casualty count would cause severe target leakage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <strong className="text-slate-100 block font-semibold">Operational Logistic Regression Classifier:</strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Balanced Logistic Regression was chosen for deployment due to direct log-odds interpretability (<code className="text-sky-300">OR = e^β_i</code>) and zero-dependency in-memory execution. Exported weights in <code>models/risk_model.json</code> execute scoring in <strong>&lt; 0.05 ms</strong> with verified <strong>10⁻¹⁶ mathematical parity</strong> against scikit-learn.
              </p>
            </div>

            <div className="space-y-2">
              <strong className="text-slate-100 block font-semibold">Evaluated Performance (Test Set N = 102,761):</strong>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">ROC-AUC</span>
                  <strong className="text-sky-400 text-sm">0.6402</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">PR-AUC</span>
                  <strong className="text-sky-400 text-sm">0.3669</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Severe Recall</span>
                  <strong className="text-amber-400 text-sm">59.02%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Limitations & Academic Governance */}
      <section className="glass-panel rounded-2xl p-6 border border-slate-700/80 bg-slate-950 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          6. Academic Governance, Teaching Scope & Limitations
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong>Pedagogical Context:</strong> This system is developed as an academic teaching and exploratory capstone dashboard for the Data Visualization & DBMS curriculum. The predictive and hotspot algorithms are intended for statistical exploration and educational demonstration, <strong>NOT</strong> as certified safety-critical emergency dispatch or civil road engineering decision tools.
        </p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong>Statistical Notice:</strong> Correlation does not imply direct causation. Factors such as motorcycle involvement or unlit darkness elevate severe injury probability in empirical data but interact with complex behavioral, vehicular, and environmental variables.
        </p>
      </section>
    </div>
  );
}

export default Methodology;
