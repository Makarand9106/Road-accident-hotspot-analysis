import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FilterProvider } from './context/FilterContext';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import AccidentAnalysis from './pages/AccidentAnalysis';
import HotspotAnalysis from './pages/HotspotAnalysis';
import RiskPrediction from './pages/RiskPrediction';
import SqlInsights from './pages/SqlInsights';
import Methodology from './pages/Methodology';
import NotFound from './pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <FilterProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="analysis" element={<AccidentAnalysis />} />
            <Route path="hotspots" element={<HotspotAnalysis />} />
            <Route path="prediction" element={<RiskPrediction />} />
            <Route path="sql-insights" element={<SqlInsights />} />
            <Route path="methodology" element={<Methodology />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </FilterProvider>
    </BrowserRouter>
  );
}

export default App;
