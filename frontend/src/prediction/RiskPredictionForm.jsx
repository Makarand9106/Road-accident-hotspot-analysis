import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RotateCcw,
  Sliders,
  Send,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  Flame,
  ShieldCheck,
  Bike,
  Truck,
  Car,
} from 'lucide-react';

// Preset scenarios for instant demonstration
const PRESET_SCENARIOS = [
  {
    name: 'Standard Urban Daytime Car (Medium)',
    payload: {
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
    },
  },
  {
    name: 'Nocturnal Rural Motorcycle 60mph (High)',
    payload: {
      time_period: 'Night',
      day_of_week_name: 'Saturday',
      weather_condition_name: 'Fine no high winds',
      road_surface_condition_name: 'Dry',
      light_condition_name: 'Darkness - no lighting',
      road_type_name: 'Single carriageway',
      road_class_name: 'A',
      junction_detail_name: 'Not at junction or within 20 metres',
      junction_control_name: 'Not at junction',
      urban_rural_name: 'Rural',
      hour: 23,
      month: 7,
      speed_limit: 60,
      number_of_vehicles: 1,
      is_weekend: 1,
      involves_motorcycle: 1,
      involves_hgv: 0,
      involves_cyclist: 0,
    },
  },
  {
    name: 'Winter Morning Peak Cyclist in Rain (High)',
    payload: {
      time_period: 'Morning Peak',
      day_of_week_name: 'Wednesday',
      weather_condition_name: 'Raining no high winds',
      road_surface_condition_name: 'Wet or damp',
      light_condition_name: 'Daylight',
      road_type_name: 'Single carriageway',
      road_class_name: 'A',
      junction_detail_name: 'Crossroads',
      junction_control_name: 'Auto traffic signal',
      urban_rural_name: 'Urban',
      hour: 8,
      month: 11,
      speed_limit: 30,
      number_of_vehicles: 2,
      is_weekend: 0,
      involves_motorcycle: 0,
      involves_hgv: 0,
      involves_cyclist: 1,
    },
  },
  {
    name: 'Motorway Adverse Weather (Low/Medium)',
    payload: {
      time_period: 'Daytime',
      day_of_week_name: 'Friday',
      weather_condition_name: 'Raining + high winds',
      road_surface_condition_name: 'Wet or damp',
      light_condition_name: 'Daylight',
      road_type_name: 'Dual carriageway',
      road_class_name: 'Motorway',
      junction_detail_name: 'Slip road',
      junction_control_name: 'Give way or uncontrolled',
      urban_rural_name: 'Rural',
      hour: 15,
      month: 10,
      speed_limit: 70,
      number_of_vehicles: 3,
      is_weekend: 0,
      involves_motorcycle: 0,
      involves_hgv: 1,
      involves_cyclist: 0,
    },
  },
];

const INITIAL_FORM = {
  time_period: 'Daytime',
  day_of_week_name: 'Monday',
  weather_condition_name: 'Fine no high winds',
  road_surface_condition_name: 'Dry',
  light_condition_name: 'Daylight',
  road_type_name: 'Single carriageway',
  road_class_name: 'A',
  junction_detail_name: 'T or staggered junction',
  junction_control_name: 'Give way or uncontrolled',
  urban_rural_name: 'Urban',
  speed_limit: 30,
  number_of_vehicles: 2,
  hour: 12,
  month: 6,
  is_weekend: 0,
  involves_motorcycle: 0,
  involves_hgv: 0,
  involves_cyclist: 0,
};

export function RiskPredictionForm({ onSubmit, isLoading, serverError }) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [validationErrors, setValidationErrors] = useState({});

  // Auto-sync weekend flag with day of week
  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'day_of_week_name') {
        next.is_weekend = value === 'Saturday' || value === 'Sunday' ? 1 : 0;
      }
      return next;
    });

    // Clear validation error on change
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleApplyPreset = (preset) => {
    setFormData(preset.payload);
    setValidationErrors({});
    onSubmit(preset.payload);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.speed_limit || formData.speed_limit < 10 || formData.speed_limit > 80) {
      errs.speed_limit = 'Speed limit must be between 10 and 80 mph';
    }
    if (!formData.number_of_vehicles || formData.number_of_vehicles < 1 || formData.number_of_vehicles > 20) {
      errs.number_of_vehicles = 'Vehicles involved must be at least 1';
    }
    if (formData.hour < 0 || formData.hour > 23) {
      errs.hour = 'Hour must be between 0 and 23';
    }
    if (formData.month < 1 || formData.month > 12) {
      errs.month = 'Month must be between 1 and 12';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setValidationErrors({});
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 shadow-2xl p-6 bg-slate-900/80">
      {/* Form Title & Scenario Presets */}
      <div className="space-y-4 pb-5 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-sky-400" />
              Scenario Feature Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate prospective environmental, roadway, and vehicle parameters known at crash initiation.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all self-start"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Form
          </button>
        </div>

        {/* Presets Bar */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Load Quick Scenario Presets:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PRESET_SCENARIOS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="text-left px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/60 transition-all text-xs group"
              >
                <span className="font-semibold text-slate-200 group-hover:text-sky-300 block truncate">
                  {p.name}
                </span>
                <span className="text-[10px] text-slate-500">
                  {p.payload.speed_limit}mph • {p.payload.road_type_name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Server & Client Error Banners */}
      {serverError && (
        <div className="mt-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Validation Error (HTTP 400):</strong>
            <p>{serverError}</p>
          </div>
        </div>
      )}

      {/* Main Feature Inputs Grid */}
      <form onSubmit={handleSubmit} className="space-y-6 pt-5">
        {/* SECTION 1: Temporal & Time */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            1. Temporal & Diurnal Conditions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Time Period</label>
              <select
                value={formData.time_period}
                onChange={(e) => handleChange('time_period', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Morning Peak">Morning Peak (07:00–10:00)</option>
                <option value="Daytime">Daytime (10:00–16:00)</option>
                <option value="Evening Peak">Evening Peak (16:00–19:00)</option>
                <option value="Evening">Evening (19:00–23:00)</option>
                <option value="Night">Night (23:00–07:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Day of Week</label>
              <select
                value={formData.day_of_week_name}
                onChange={(e) => handleChange('day_of_week_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Hour of Day (0–23)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={formData.hour}
                onChange={(e) => handleChange('hour', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Month of Year (1–12)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={formData.month}
                onChange={(e) => handleChange('month', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Environmental & Ambient Lighting */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            2. Environmental & Ambient Conditions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Weather Condition</label>
              <select
                value={formData.weather_condition_name}
                onChange={(e) => handleChange('weather_condition_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Fine no high winds">Fine no high winds</option>
                <option value="Raining no high winds">Raining no high winds</option>
                <option value="Snowing no high winds">Snowing no high winds</option>
                <option value="Fine + high winds">Fine + high winds</option>
                <option value="Raining + high winds">Raining + high winds</option>
                <option value="Snowing + high winds">Snowing + high winds</option>
                <option value="Fog or mist">Fog or mist</option>
                <option value="Other">Other</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Road Surface Condition</label>
              <select
                value={formData.road_surface_condition_name}
                onChange={(e) => handleChange('road_surface_condition_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Dry">Dry</option>
                <option value="Wet or damp">Wet or damp</option>
                <option value="Frost or ice">Frost or ice</option>
                <option value="Snow">Snow</option>
                <option value="Flood over 3cm. deep">Flood over 3cm. deep</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Ambient Light Condition</label>
              <select
                value={formData.light_condition_name}
                onChange={(e) => handleChange('light_condition_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Daylight">Daylight</option>
                <option value="Darkness - lights lit">Darkness - street lights lit</option>
                <option value="Darkness - lights unlit">Darkness - street lights unlit</option>
                <option value="Darkness - no lighting">Darkness - no street lighting</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: Road Geometry & Speed Limits */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            3. Roadway Infrastructure & Speed
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Posted Speed Limit</label>
              <select
                value={formData.speed_limit}
                onChange={(e) => handleChange('speed_limit', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
              >
                <option value={20}>20 mph</option>
                <option value={30}>30 mph</option>
                <option value={40}>40 mph</option>
                <option value={50}>50 mph</option>
                <option value={60}>60 mph</option>
                <option value={70}>70 mph</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Road Layout Type</label>
              <select
                value={formData.road_type_name}
                onChange={(e) => handleChange('road_type_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Single carriageway">Single carriageway</option>
                <option value="Dual carriageway">Dual carriageway</option>
                <option value="Roundabout">Roundabout</option>
                <option value="One way street">One way street</option>
                <option value="Slip road">Slip road</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Road Hierarchy Class</label>
              <select
                value={formData.road_class_name}
                onChange={(e) => handleChange('road_class_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="A">Class A</option>
                <option value="B">Class B</option>
                <option value="C">Class C</option>
                <option value="Motorway">Motorway</option>
                <option value="A(M)">A(M)</option>
                <option value="Unclassified">Unclassified</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Junction Detail</label>
              <select
                value={formData.junction_detail_name}
                onChange={(e) => handleChange('junction_detail_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="T or staggered junction">T or staggered junction</option>
                <option value="Crossroads">Crossroads</option>
                <option value="Not at junction or within 20 metres">Not at junction</option>
                <option value="Other junction">Other junction</option>
                <option value="Junction with more than four arms (not roundabout)">More than 4 arms junction</option>
                <option value="Using private drive or entrance">Private drive/entrance</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Junction Control</label>
              <select
                value={formData.junction_control_name}
                onChange={(e) => handleChange('junction_control_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="Give way or uncontrolled">Give way / uncontrolled</option>
                <option value="Auto traffic signal">Auto traffic signal</option>
                <option value="Stop sign">Stop sign</option>
                <option value="Authorised person">Authorised person</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Urban or Rural</label>
              <select
                value={formData.urban_rural_name}
                onChange={(e) => handleChange('urban_rural_name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
              >
                <option value="Urban">Urban Area</option>
                <option value="Rural">Rural Area</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: Vehicle Mix & Vulnerable Road Users */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            4. Vehicle Mix & Vulnerable Road User Involvement
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
            {/* Number of Vehicles */}
            <div className="text-xs">
              <label className="block text-slate-400 mb-1">Vehicles Involved</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.number_of_vehicles}
                onChange={(e) => handleChange('number_of_vehicles', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500 font-bold"
              />
            </div>

            {/* Motorcycle Toggle */}
            <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
              formData.involves_motorcycle
                ? 'bg-red-500/20 border-red-500/50 text-red-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
            }`}>
              <input
                type="checkbox"
                checked={formData.involves_motorcycle === 1}
                onChange={(e) => handleChange('involves_motorcycle', e.target.checked ? 1 : 0)}
                className="hidden"
              />
              <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                formData.involves_motorcycle ? 'bg-red-500 border-red-400 text-white' : 'border-slate-600'
              }`}>
                {formData.involves_motorcycle ? '✓' : ''}
              </div>
              <span className="text-xs font-semibold">Motorcycle Involved</span>
            </label>

            {/* Cyclist Toggle */}
            <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
              formData.involves_cyclist
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
            }`}>
              <input
                type="checkbox"
                checked={formData.involves_cyclist === 1}
                onChange={(e) => handleChange('involves_cyclist', e.target.checked ? 1 : 0)}
                className="hidden"
              />
              <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                formData.involves_cyclist ? 'bg-amber-500 border-amber-400 text-white' : 'border-slate-600'
              }`}>
                {formData.involves_cyclist ? '✓' : ''}
              </div>
              <span className="text-xs font-semibold">Cyclist Involved</span>
            </label>

            {/* HGV Toggle */}
            <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
              formData.involves_hgv
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
            }`}>
              <input
                type="checkbox"
                checked={formData.involves_hgv === 1}
                onChange={(e) => handleChange('involves_hgv', e.target.checked ? 1 : 0)}
                className="hidden"
              />
              <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                formData.involves_hgv ? 'bg-purple-500 border-purple-400 text-white' : 'border-slate-600'
              }`}>
                {formData.involves_hgv ? '✓' : ''}
              </div>
              <span className="text-xs font-semibold">Heavy Goods (HGV)</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
                <span>Computing In-Memory Logit Scoring...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Calculate Severity Risk Probability (POST /api/predict)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RiskPredictionForm;
