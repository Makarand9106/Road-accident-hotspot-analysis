import React from 'react';
import { Menu, Database, Shield } from 'lucide-react';

export function Header({ setMobileOpen }) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white lg:hidden"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight leading-snug truncate">
            Smart Road Accident Hotspot Analysis and Risk Prediction System
          </h2>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            UK DfT STATS19 (2021–2025) • Data Visualization & DBMS
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
          <Database className="w-3.5 h-3.5 text-sky-400" />
          <span>PostgreSQL + Express</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
