import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  MapPin,
  Sparkles,
  Database,
  BookOpen,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { formatNumber } from '../utils/constants';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/analysis', label: 'Accident Analysis', icon: BarChart3 },
  { path: '/hotspots', label: 'Hotspot Analysis', icon: MapPin, badge: 'M11' },
  { path: '/prediction', label: 'Risk Prediction', icon: Sparkles, badge: 'M11' },
  { path: '/sql-insights', label: 'SQL Insights', icon: Database, badge: 'M11' },
  { path: '/methodology', label: 'Methodology', icon: BookOpen, badge: 'M11' },
];

export function Sidebar({ mobileOpen, setMobileOpen }) {
  const [dbStatus, setDbStatus] = useState({ connected: false, totalAccidents: 0 });

  useEffect(() => {
    let isMounted = true;
    api
      .getHealth()
      .then((res) => {
        if (isMounted && res.status === 'ok' && res.database?.connected) {
          setDbStatus({
            connected: true,
            totalAccidents: res.database.counts?.accidents || 513801,
          });
        }
      })
      .catch((err) => {
        console.error('Health check failed in Sidebar:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900/95 border-r border-slate-800 backdrop-blur-xl flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800/80 bg-slate-950/40">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-sky-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                Road Safety
              </h1>
              <p className="text-[10px] text-amber-400/90 font-medium tracking-wide">
                Analytics & Risk AI
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 mt-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Database Live Status Indicator */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="glass-panel p-3 rounded-lg border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                PostgreSQL DB
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">Total Collisions:</span>
              <strong className="text-white">
                {dbStatus.totalAccidents ? formatNumber(dbStatus.totalAccidents) : '513,801'}
              </strong>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
