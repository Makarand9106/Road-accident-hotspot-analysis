import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RiskPredictionForm } from '../prediction/RiskPredictionForm';
import { PredictionResultCard } from '../prediction/PredictionResultCard';
import { ModelCard } from '../prediction/ModelCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorBanner } from '../components/ErrorBanner';
import { Sparkles, Brain, Sliders, ShieldAlert } from 'lucide-react';

export function RiskPrediction() {
  const [metricsData, setMetricsData] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);
  const [serverError, setServerError] = useState(null);

  // Load model metrics and schema on mount
  useEffect(() => {
    let isMounted = true;
    async function loadMetrics() {
      try {
        setIsLoadingMetrics(true);
        setMetricsError(null);
        const res = await api.getModelMetrics();
        if (isMounted && res.data) {
          setMetricsData(res.data);
        }
      } catch (err) {
        if (isMounted) setMetricsError(err.message || 'Failed to load model diagnostics');
      } finally {
        if (isMounted) setIsLoadingMetrics(false);
      }
    }

    loadMetrics();

    // Run an initial baseline prediction so the results card is populated immediately
    handlePredict({
      time_period: 'Daytime',
      day_of_week_name: 'Tuesday',
      weather_condition_name: 'Fine no high winds',
      road_surface_condition_name: 'Dry',
      light_condition_name: 'Daylight',
      road_type_name: 'Single carriageway',
      road_class_name: 'Unclassified',
      junction_detail_name: 'T or staggered junction',
      junction_control_name: 'Give way or uncontrolled',
      urban_rural_name: 'Urban',
      hour: 14,
      month: 6,
      speed_limit: 30,
      number_of_vehicles: 2,
      is_weekend: 0,
      involves_motorcycle: 0,
      involves_hgv: 0,
      involves_cyclist: 0,
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePredict = async (scenarioPayload) => {
    try {
      setIsPredicting(true);
      setServerError(null);
      const res = await api.predictRisk(scenarioPayload);
      if (res.data) {
        setPredictionResult(res.data);
      }
    } catch (err) {
      console.error('Prediction request failed:', err);
      setServerError(err.message || 'Error occurred while computing scenario risk.');
    } finally {
      setIsPredicting(false);
    }
  };

  if (isLoadingMetrics && !metricsData) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (metricsError && !metricsData) {
    return (
      <div className="space-y-6">
        <ErrorBanner error={metricsError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Explainable Severity-Risk Prediction Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Logistic Regression
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time interactive scenario simulation, logit attribution scoring, and model transparency diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Training Base</span>
            <strong className="text-slate-100 font-bold text-sm">513,801</strong>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Severe Rate</span>
            <strong className="text-amber-400 font-bold text-sm">24.21%</strong>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Parity Precision</span>
            <strong className="text-emerald-400 font-bold text-sm">10⁻¹⁶</strong>
          </div>
        </div>
      </div>

      {/* Top Section: Form Simulator & Prediction Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Inputs (7 cols on lg) */}
        <div className="lg:col-span-7">
          <RiskPredictionForm
            onSubmit={handlePredict}
            isLoading={isPredicting}
            serverError={serverError}
          />
        </div>

        {/* Prediction Result Display (5 cols on lg) */}
        <div className="lg:col-span-5">
          <PredictionResultCard result={predictionResult} />
        </div>
      </div>

      {/* Bottom Section: Model Card & Metrics Transparency */}
      <div className="pt-4 border-t border-slate-800">
        <ModelCard metricsData={metricsData} />
      </div>
    </div>
  );
}

export default RiskPrediction;
