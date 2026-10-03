import React from 'react';

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'bg-slate-800 text-slate-300 border-slate-700',
  colorClass = 'text-slate-100',
  className = '',
}) {
  return (
    <div className={`glass-panel glass-panel-hover rounded-xl p-5 relative flex flex-col justify-between overflow-hidden group ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-300 group-hover:text-amber-400 transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="my-1">
        <div className={`text-2xl lg:text-3xl font-bold tracking-tight ${colorClass}`}>
          {value}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
        <span className="truncate">{subtitle}</span>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeColor} shrink-0 ml-2`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export default KpiCard;
