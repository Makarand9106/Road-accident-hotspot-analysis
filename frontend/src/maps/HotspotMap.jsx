import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Tooltip,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import './LeafletSetup';
import { api } from '../services/api';
import { SEVERITY_COLORS, RISK_COLORS, formatNumber, formatPercent } from '../utils/constants';
import { Layers, Eye, EyeOff, AlertCircle, Loader2, Navigation, ZoomIn } from 'lucide-react';

/**
 * Controller component for programmatic map movements (flyTo)
 */
function MapController({ targetCoord, targetZoom }) {
  const map = useMap();

  useEffect(() => {
    if (targetCoord && targetCoord[0] && targetCoord[1]) {
      map.flyTo(targetCoord, targetZoom || 14, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [targetCoord, targetZoom, map]);

  return null;
}

/**
 * Bounds listener to fetch accident points and grid cells for the visible viewport
 */
function ViewportListener({ onBoundsChange, activeLayers }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        min_lat: bounds.getSouth(),
        max_lat: bounds.getNorth(),
        min_lon: bounds.getWest(),
        max_lon: bounds.getEast(),
        zoom: map.getZoom(),
      });
    },
  });

  // Initial trigger
  useEffect(() => {
    const bounds = map.getBounds();
    onBoundsChange({
      min_lat: bounds.getSouth(),
      max_lat: bounds.getNorth(),
      min_lon: bounds.getWest(),
      max_lon: bounds.getEast(),
      zoom: map.getZoom(),
    });
  }, [activeLayers]);

  return null;
}

export function HotspotMap({
  hotspots = [],
  selectedHotspotId = null,
  onSelectHotspot,
  globalFilters = {},
  flyToLocation = null,
}) {
  // Layer visibility state
  const [layers, setLayers] = useState({
    hotspots: true,
    accidents: false,
  });

  // Visible bounds data
  const [currentBounds, setCurrentBounds] = useState(null);
  const [accidents, setAccidents] = useState([]);
  const [accidentMeta, setAccidentMeta] = useState({ total: 0, is_truncated: false, count: 0 });
  const [isLoadingAccidents, setIsLoadingAccidents] = useState(false);

  // Quick navigation cities
  const CITIES = [
    { name: 'UK National', coords: [54.5, -2.5], zoom: 6 },
    { name: 'Greater London', coords: [51.5074, -0.1278], zoom: 11 },
    { name: 'West Midlands', coords: [52.4862, -1.8904], zoom: 11 },
    { name: 'Greater Manchester', coords: [53.4808, -2.2426], zoom: 11 },
    { name: 'West Yorkshire', coords: [53.8008, -1.5491], zoom: 11 },
    { name: 'Scotland Central', coords: [55.8642, -4.2518], zoom: 11 },
  ];

  const [activeCity, setActiveCity] = useState('UK National');
  const [mapTarget, setMapTarget] = useState(null);

  // Sync external flyTo location if provided
  useEffect(() => {
    if (flyToLocation && flyToLocation.lat && flyToLocation.lon) {
      setMapTarget({
        coords: [flyToLocation.lat, flyToLocation.lon],
        zoom: flyToLocation.zoom || 14,
      });
    }
  }, [flyToLocation]);

  const handleBoundsChange = useCallback((bounds) => {
    setCurrentBounds(bounds);
  }, []);

  // Fetch accident points when layer is active and viewport moves
  useEffect(() => {
    if (!layers.accidents || !currentBounds) return;

    let isMounted = true;
    const fetchAccidents = async () => {
      try {
        setIsLoadingAccidents(true);
        const res = await api.getAccidents({
          min_lat: currentBounds.min_lat,
          max_lat: currentBounds.max_lat,
          min_lon: currentBounds.min_lon,
          max_lon: currentBounds.max_lon,
          limit: 1000,
          ...globalFilters,
        });

        if (isMounted && res.accidents) {
          setAccidents(res.accidents);
          setAccidentMeta({
            total: res.total || res.accidents.length,
            count: res.accidents.length,
            is_truncated: res.is_truncated || false,
          });
        }
      } catch (err) {
        console.error('Failed to fetch bounding box accidents:', err);
      } finally {
        if (isMounted) setIsLoadingAccidents(false);
      }
    };

    const timer = setTimeout(fetchAccidents, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [layers.accidents, currentBounds, globalFilters]);

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Helper color for hotspot risk circles
  const getHotspotColor = (riskLevel) => {
    switch (riskLevel) {
      case 'High':
        return { stroke: '#ef4444', fill: '#ef4444' };
      case 'Medium':
        return { stroke: '#f59e0b', fill: '#f59e0b' };
      case 'Low':
      default:
        return { stroke: '#38bdf8', fill: '#38bdf8' };
    }
  };

  // Helper color for severity accident points
  const getSeverityColor = (sevName) => {
    switch (sevName) {
      case 'Fatal':
        return '#D55E00';
      case 'Serious':
        return '#E69F00';
      case 'Slight':
      default:
        return '#0072B2';
    }
  };

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Top Controls Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 max-w-[calc(100%-80px)]">
        {/* City Fast Jump Presets */}
        <div className="glass-panel rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-lg border border-slate-700/60">
          <Navigation className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-semibold text-slate-300 mr-1 hidden sm:inline">Regions:</span>
          <div className="flex items-center gap-1">
            {CITIES.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setActiveCity(c.name);
                  setMapTarget({ coords: c.coords, zoom: c.zoom });
                }}
                className={`text-xs px-2 py-0.5 rounded-lg transition-all ${
                  activeCity === c.name
                    ? 'bg-sky-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layer Toggle Control Overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <div className="glass-panel rounded-xl p-2.5 shadow-xl border border-slate-700/70 space-y-2 min-w-[200px]">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Map Layers</span>
          </div>

          {/* Hotspot Circles Toggle */}
          <button
            type="button"
            onClick={() => toggleLayer('hotspots')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              layers.hotspots
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>DBSCAN Hotspots ({hotspots.length})</span>
            </div>
            {layers.hotspots ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {/* Accident Points Toggle */}
          <button
            type="button"
            onClick={() => toggleLayer('accidents')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              layers.accidents
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Accident Points</span>
              {isLoadingAccidents && <Loader2 className="w-3 h-3 animate-spin text-amber-400 ml-1" />}
            </div>
            {layers.accidents ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>

        {/* Truncation / Notice Warning when accident limit is hit */}
        {layers.accidents && accidentMeta.is_truncated && (
          <div className="glass-panel rounded-xl p-2.5 shadow-xl border border-amber-500/40 bg-amber-950/80 max-w-[240px] animate-fade-in">
            <div className="flex items-start gap-2 text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-tight">
                <strong>Max limit capped:</strong> Showing 1,000 of {formatNumber(accidentMeta.total)} visible crashes. Zoom in closer for granular inspection.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000]">
        <div className="glass-panel rounded-xl p-3 shadow-xl border border-slate-700/60 text-xs space-y-2 max-w-xs">
          <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wider">Legend</span>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-300 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500" />
              <span>High Risk Hotspot</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D55E00]" />
              <span>Fatal Collision</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500" />
              <span>Medium Risk Hotspot</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E69F00]" />
              <span>Serious Collision</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-500/40 border border-sky-500" />
              <span>Low Risk Hotspot</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0072B2]" />
              <span>Slight Collision</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 leading-tight">
            Circle radius reflects DBSCAN metric cluster boundary (radius_m).
          </div>
        </div>
      </div>

      {/* Main React-Leaflet Map Container */}
      <MapContainer
        center={[54.5, -2.5]}
        zoom={6}
        minZoom={5}
        maxZoom={18}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* OpenStreetMap Tile Layer with Required Attribution */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Viewport Bounds Listener */}
        <ViewportListener
          onBoundsChange={handleBoundsChange}
          activeLayers={layers}
        />

        {/* Programmatic Map Controller */}
        {mapTarget && (
          <MapController
            targetCoord={mapTarget.coords}
            targetZoom={mapTarget.zoom}
          />
        )}

        {/* LAYER 1: DBSCAN Hotspot Circles */}
        {layers.hotspots &&
          hotspots.map((h) => {
            const isSelected = selectedHotspotId === h.hotspot_id;
            const colors = getHotspotColor(h.risk_level);

            return (
              <Circle
                key={`hotspot-${h.hotspot_id}`}
                center={[h.centre_lat, h.centre_lon]}
                radius={Math.max(h.radius_m || 150, 100)}
                pathOptions={{
                  color: isSelected ? '#ffffff' : colors.stroke,
                  fillColor: colors.fill,
                  fillOpacity: isSelected ? 0.7 : 0.4,
                  weight: isSelected ? 3 : 1.5,
                }}
                eventHandlers={{
                  click: () => {
                    onSelectHotspot(h.hotspot_id);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <div className="text-xs p-1 space-y-0.5">
                    <p className="font-bold text-slate-900">
                      Hotspot #{h.hotspot_id} ({h.district_name})
                    </p>
                    <p className="text-slate-700">
                      Risk Level: <strong className={h.risk_level === 'High' ? 'text-red-600' : h.risk_level === 'Medium' ? 'text-amber-600' : 'text-blue-600'}>{h.risk_level}</strong> (Score: {h.risk_score})
                    </p>
                    <p className="text-slate-600">
                      Total Collisions: <strong>{h.accident_count}</strong> ({h.severe_percentage}% severe)
                    </p>
                    <p className="text-[10px] text-slate-500 italic">Click to inspect cluster details</p>
                  </div>
                </Tooltip>
              </Circle>
            );
          })}

        {/* LAYER 2: Visible Accident Points (Filtered by Bounding Box) */}
        {layers.accidents &&
          accidents.map((a) => {
            if (!a.latitude || !a.longitude) return null;
            const color = getSeverityColor(a.severity_name);

            return (
              <CircleMarker
                key={`acc-${a.accident_index}`}
                center={[parseFloat(a.latitude), parseFloat(a.longitude)]}
                radius={4}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: color,
                  fillOpacity: 0.85,
                  weight: 0.8,
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="text-xs p-1 space-y-1">
                    <div className="font-bold text-slate-900 border-b pb-1">
                      Collision #{a.accident_index}
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-700">
                      <span>Severity:</span>
                      <strong style={{ color }}>{a.severity_name}</strong>
                      <span>Date / Time:</span>
                      <span>{a.accident_date ? String(a.accident_date).substring(0, 10) : 'N/A'} {a.accident_time || ''}</span>
                      <span>Speed Limit:</span>
                      <span>{a.speed_limit || 30} mph</span>
                      <span>Vehicles:</span>
                      <span>{a.number_of_vehicles}</span>
                      <span>Casualties:</span>
                      <span>{a.number_of_casualties}</span>
                      <span>Weather:</span>
                      <span>{a.weather || 'Unknown'}</span>
                      <span>Road Surface:</span>
                      <span>{a.road_surface || 'Unknown'}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
}

export default HotspotMap;
