import React from 'react';

export function ErdDiagram() {
  return (
    <div className="w-full overflow-x-auto p-4 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner">
      <svg
        viewBox="0 0 1100 680"
        className="w-full min-w-[850px] max-h-[640px] select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="gradFact" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="gradEntity" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#065f46" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="gradCluster" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#831843" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="gradDim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
          </linearGradient>
          <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* FACT TABLE: ACCIDENT */}
        <g filter="url(#shadow)">
          <rect x="390" y="160" width="320" height="360" rx="12" fill="url(#gradFact)" stroke="#38bdf8" strokeWidth="2" />
          <rect x="390" y="160" width="320" height="38" rx="12" fill="#0284c7" />
          <text x="550" y="184" fill="#ffffff" fontWeight="bold" fontSize="14" textAnchor="middle">
            ACCIDENT (Core Fact Table)
          </text>
          
          <g fontSize="11" fill="#e2e8f0" fontFamily="monospace">
            <text x="405" y="215" fill="#38bdf8" fontWeight="bold">PK  accident_index (VARCHAR 13)</text>
            <text x="405" y="235">    accident_year (INT)</text>
            <text x="405" y="255">    accident_date (DATE)</text>
            <text x="405" y="275">    accident_time (TIME)</text>
            <text x="405" y="295" fill="#fbbf24">FK  severity_id (SMALLINT)</text>
            <text x="405" y="315" fill="#fbbf24">FK  police_force_id (SMALLINT)</text>
            <text x="405" y="335" fill="#fbbf24">FK  district_id (SMALLINT)</text>
            <text x="405" y="355" fill="#fbbf24">FK  weather_condition_id (SMALLINT)</text>
            <text x="405" y="375" fill="#fbbf24">FK  road_surface_condition_id (SMALLINT)</text>
            <text x="405" y="395" fill="#fbbf24">FK  light_condition_id (SMALLINT)</text>
            <text x="405" y="415" fill="#fbbf24">FK  road_type_id (SMALLINT)</text>
            <text x="405" y="435" fill="#fbbf24">FK  hotspot_id (INT)</text>
            <text x="405" y="455">    latitude, longitude (NUMERIC)</text>
            <text x="405" y="475">    speed_limit, number_of_vehicles</text>
            <text x="405" y="495">    is_severe (SMALLINT 0/1)</text>
          </g>
        </g>

        {/* ENTITY TABLE: VEHICLE */}
        <g filter="url(#shadow)">
          <rect x="50" y="160" width="260" height="170" rx="10" fill="url(#gradEntity)" stroke="#10b981" strokeWidth="1.5" />
          <rect x="50" y="160" width="260" height="32" rx="10" fill="#059669" />
          <text x="180" y="181" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">
            VEHICLE (1 : N with Accident)
          </text>
          <g fontSize="10.5" fill="#e2e8f0" fontFamily="monospace">
            <text x="65" y="210" fill="#34d399" fontWeight="bold">PK  vehicle_id (BIGINT)</text>
            <text x="65" y="230" fill="#fbbf24">FK  accident_index (VARCHAR)</text>
            <text x="65" y="250" fill="#fbbf24">FK  vehicle_type_id (SMALLINT)</text>
            <text x="65" y="270">    driver_sex, driver_age_band</text>
            <text x="65" y="290">    vehicle_manoeuvre_id</text>
            <text x="65" y="310">    generic_make_model</text>
          </g>
        </g>

        {/* ENTITY TABLE: CASUALTY */}
        <g filter="url(#shadow)">
          <rect x="50" y="370" width="260" height="170" rx="10" fill="url(#gradEntity)" stroke="#10b981" strokeWidth="1.5" />
          <rect x="50" y="370" width="260" height="32" rx="10" fill="#059669" />
          <text x="180" y="391" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">
            CASUALTY (1 : N with Accident)
          </text>
          <g fontSize="10.5" fill="#e2e8f0" fontFamily="monospace">
            <text x="65" y="420" fill="#34d399" fontWeight="bold">PK  casualty_id (BIGINT)</text>
            <text x="65" y="440" fill="#fbbf24">FK  accident_index (VARCHAR)</text>
            <text x="65" y="460" fill="#fbbf24">FK  casualty_class_id (SMALLINT)</text>
            <text x="65" y="480" fill="#fbbf24">FK  severity_id (SMALLINT)</text>
            <text x="65" y="500">    casualty_sex, casualty_age</text>
            <text x="65" y="520">    pedestrian_location_id</text>
          </g>
        </g>

        {/* CLUSTERING TABLE: HOTSPOT */}
        <g filter="url(#shadow)">
          <rect x="790" y="160" width="260" height="200" rx="10" fill="url(#gradCluster)" stroke="#f43f5e" strokeWidth="1.5" />
          <rect x="790" y="160" width="260" height="32" rx="10" fill="#e11d48" />
          <text x="920" y="181" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">
            HOTSPOT (DBSCAN Clusters)
          </text>
          <g fontSize="10.5" fill="#e2e8f0" fontFamily="monospace">
            <text x="805" y="210" fill="#fda4af" fontWeight="bold">PK  hotspot_id (INT)</text>
            <text x="805" y="230">    centre_lat, centre_lon</text>
            <text x="805" y="250">    radius_m (METRIC 150m+)</text>
            <text x="805" y="270">    accident_count, severe_ratio</text>
            <text x="805" y="290">    frequency, severity, trend</text>
            <text x="805" y="310">    risk_score (13.5 - 96.5)</text>
            <text x="805" y="330">    risk_level (High/Med/Low)</text>
            <text x="805" y="350" fill="#fbbf24">FK  nearest_district_id</text>
          </g>
        </g>

        {/* DIMENSION LOOKUP TABLES (TOP ROW) */}
        <g filter="url(#shadow)">
          {/* SEVERITY */}
          <rect x="320" y="40" width="140" height="70" rx="8" fill="url(#gradDim)" stroke="#64748b" />
          <text x="390" y="60" fill="#93c5fd" fontWeight="bold" fontSize="11" textAnchor="middle">SEVERITY</text>
          <text x="330" y="80" fill="#cbd5e1" fontSize="9.5" fontFamily="monospace">PK severity_id</text>
          <text x="330" y="95" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">   severity_name</text>

          {/* POLICE FORCE */}
          <rect x="480" y="40" width="140" height="70" rx="8" fill="url(#gradDim)" stroke="#64748b" />
          <text x="550" y="60" fill="#93c5fd" fontWeight="bold" fontSize="11" textAnchor="middle">POLICE_FORCE</text>
          <text x="490" y="80" fill="#cbd5e1" fontSize="9.5" fontFamily="monospace">PK police_force_id</text>
          <text x="490" y="95" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">   police_force_name</text>

          {/* DISTRICT */}
          <rect x="640" y="40" width="150" height="70" rx="8" fill="url(#gradDim)" stroke="#64748b" />
          <text x="715" y="60" fill="#93c5fd" fontWeight="bold" fontSize="11" textAnchor="middle">DISTRICT</text>
          <text x="650" y="80" fill="#cbd5e1" fontSize="9.5" fontFamily="monospace">PK district_id</text>
          <text x="650" y="95" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">   district_name</text>

          {/* AUDIT / MODEL METRICS */}
          <rect x="790" y="420" width="260" height="120" rx="10" fill="url(#gradDim)" stroke="#8b5cf6" strokeWidth="1.5" />
          <rect x="790" y="420" width="260" height="30" rx="10" fill="#6d28d9" />
          <text x="920" y="440" fill="#ffffff" fontWeight="bold" fontSize="12" textAnchor="middle">
            MODEL_METRICS (Audit Log)
          </text>
          <g fontSize="10.5" fill="#e2e8f0" fontFamily="monospace">
            <text x="805" y="470" fill="#c4b5fd" fontWeight="bold">PK  metric_id (INT)</text>
            <text x="805" y="490">    model_name (VARCHAR)</text>
            <text x="805" y="510">    metric_name, metric_value</text>
            <text x="805" y="530">    created_at (TIMESTAMP)</text>
          </g>
        </g>

        {/* CONNECTOR RELATIONSHIP LINES */}
        <g stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 2">
          {/* Vehicle -> Accident */}
          <line x1="310" y1="245" x2="390" y2="245" stroke="#10b981" />
          {/* Casualty -> Accident */}
          <line x1="310" y1="455" x2="390" y2="455" stroke="#10b981" />
          {/* Hotspot -> Accident */}
          <line x1="710" y1="260" x2="790" y2="260" stroke="#f43f5e" />
          {/* Severity -> Accident */}
          <line x1="390" y1="110" x2="450" y2="160" stroke="#38bdf8" />
          {/* Police Force -> Accident */}
          <line x1="550" y1="110" x2="550" y2="160" stroke="#38bdf8" />
          {/* District -> Accident */}
          <line x1="715" y1="110" x2="650" y2="160" stroke="#38bdf8" />
        </g>

        {/* Legend Box */}
        <g transform="translate(390, 560)">
          <rect width="320" height="70" rx="8" fill="#090d16" stroke="#1e293b" />
          <text x="160" y="20" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle">
            Relational Schema Cardinality Guide
          </text>
          <circle cx="25" cy="45" r="5" fill="#38bdf8" />
          <text x="35" y="49" fill="#cbd5e1" fontSize="10">Fact Table</text>
          
          <circle cx="115" cy="45" r="5" fill="#10b981" />
          <text x="125" y="49" fill="#cbd5e1" fontSize="10">1:N Entities</text>
          
          <circle cx="205" cy="45" r="5" fill="#f43f5e" />
          <text x="215" y="49" fill="#cbd5e1" fontSize="10">Clusters</text>
          
          <circle cx="275" cy="45" r="5" fill="#94a3b8" />
          <text x="285" y="49" fill="#cbd5e1" fontSize="10">Lookups</text>
        </g>
      </svg>
    </div>
  );
}

export default ErdDiagram;
