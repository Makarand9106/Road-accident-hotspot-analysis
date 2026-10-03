import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';

export function HotspotAnalysis() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Hotspot Analysis & Spatial Clustering</h1>
          <p className="text-sm text-slate-400 mt-1">
            Interactive Leaflet spatial density map, DBSCAN 150m clusters, and corridor detection.
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-sky-500/30 flex flex-col items-center justify-center max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
          <MapPin className="w-8 h-8" />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 mb-3">
          Milestone 11 Arrival
        </span>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Interactive Hotspot Map Arriving in Milestone 11</h2>
        <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
          The 704 national spatial clusters, DBSCAN 150m epsilon boundaries, corridor geometries, and high-risk ranking table will be rendered with React-Leaflet in the next milestone.
        </p>
      </div>
    </div>
  );
}

export default HotspotAnalysis;
