import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-16">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Page Not Found</h1>
      <p className="text-sm text-slate-400 mb-6">
        The requested dashboard route does not exist.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Home className="w-4 h-4" />
        Back to Overview
      </Link>
    </div>
  );
}

export default NotFound;
