import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import FilterBar from './FilterBar';

const ROUTE_TITLES = {
  '/': 'Executive Overview | Smart Road Safety',
  '/analysis': 'Accident Factor Analysis | Smart Road Safety',
  '/hotspots': 'Geospatial Hotspot Analysis | Smart Road Safety',
  '/prediction': 'Risk Prediction Simulator | Smart Road Safety',
  '/sql-insights': 'DBMS SQL Insights | Smart Road Safety',
  '/methodology': 'System Methodology & ERD | Smart Road Safety',
};

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const title = ROUTE_TITLES[location.pathname] || 'Smart Road Accident Hotspot Analysis & Risk Prediction System';
    document.title = title;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Header setMobileOpen={setMobileOpen} />

        {/* Global Filter Bar */}
        <FilterBar />

        {/* Page Content Container */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>

        {/* Global Unified Dashboard Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md py-6 px-4 lg:px-8 text-xs text-slate-400">
          <div className="max-w-[1600px] w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 text-center sm:text-left">
              <span className="font-semibold text-slate-300">
                UK DfT STATS19 Road Safety Dataset (2021–2025)
              </span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span>Contains public sector information licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">Open Government Licence v3.0</a></span>
            </div>

            <div className="text-[11px] text-slate-500 text-center md:text-right">
              <span className="font-medium text-slate-400">Academic & Teaching Project:</span> Data Visualization + DBMS Capstone • Not certified for emergency or operational dispatch.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Layout;
