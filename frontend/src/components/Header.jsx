import React, { useState, useEffect } from 'react';
import { Menu, Database, Shield, Activity, WifiOff } from 'lucide-react';
import { api } from '../services/api';

export function Header({ setMobileOpen }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const check = () => {
      api.getHealth()
        .then(() => { if (isMounted) setIsOnline(true); })
        .catch(() => { if (isMounted) setIsOnline(false); });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 gap-4">
      {/* Left: Mobile Toggle + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all lg:hidden shrink-0"
          aria-label="Open sidebar menu"
          id="mobile-menu-btn"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-500 to-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight leading-snug truncate text-slate-100">
              Road Accident Hotspot Analysis &amp; Risk Prediction
            </h2>
          </div>
          <p className="text-[10px] text-slate-500 hidden sm:block mt-0.5 ml-8">
            UK DfT STATS19 (2021–2025) &bull; Data Visualization &amp; DBMS Capstone
          </p>
        </div>
      </div>

      {/* Right: Status Chips */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-[11px] text-slate-300">
          <Database className="w-3 h-3 text-sky-400" />
          <span className="font-medium">PostgreSQL</span>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
          isOnline
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="hidden sm:inline">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span className="hidden sm:inline">Offline</span>
            </>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono font-semibold">
          <Activity className="w-3 h-3" />
          513,801
        </div>
      </div>
    </header>
  );
}

export default Header;
