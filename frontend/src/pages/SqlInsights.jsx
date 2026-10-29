import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorBanner } from '../components/ErrorBanner';
import {
  Database,
  Play,
  Copy,
  Check,
  Zap,
  ChevronDown,
  ChevronUp,
  Search,
  Code2,
  Table as TableIcon,
  BarChart2,
  Clock,
  Sparkles,
  Info,
  HelpCircle,
  FileCode,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import { formatNumber, formatDecimal } from '../utils/constants';

// Grouping definitions for the 20 queries
const CONCEPT_GROUPS = [
  { id: 'all', name: 'All Queries (20)' },
  { id: 'basics', name: 'Basics & Date/Time', queryIds: [1, 2, 3, 4, 13, 15] },
  { id: 'joins', name: 'Joins & Cross-Tabs', queryIds: [5, 10, 11, 16] },
  { id: 'subqueries', name: 'Subqueries & Correlated', queryIds: [9, 12, 14] },
  { id: 'cte_window', name: 'CTEs & Window Functions', queryIds: [6, 7, 8] },
  { id: 'hotspots', name: 'Hotspots & Regional Risk', queryIds: [17, 18, 19, 20] },
];

export function SqlInsights() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeGroup, setActiveGroup] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQueryId, setExpandedQueryId] = useState(1);
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(false);

  // Execution states for individual queries: { [queryNumber]: { loading: bool, data: Object, error: string, viewMode: 'table'|'chart' } }
  const [queryResults, setQueryResults] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Fetch 20 stored analytical query definitions from backend
  useEffect(() => {
    let isMounted = true;
    async function loadQueries() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getSqlInsights();
        if (isMounted && res.data?.queries) {
          setQueries(res.data.queries);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load SQL queries catalogue');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadQueries();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter queries by active concept group and search query
  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      // Group filter
      if (activeGroup !== 'all') {
        const groupObj = CONCEPT_GROUPS.find((g) => g.id === activeGroup);
        if (groupObj && !groupObj.queryIds.includes(q.query_number)) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const text = `${q.query_number} ${q.title} ${q.question} ${q.concepts} ${q.sql}`.toLowerCase();
        if (!text.includes(searchQuery.toLowerCase().trim())) {
          return false;
        }
      }

      return true;
    });
  }, [queries, activeGroup, searchQuery]);

  // Execute query via backend API
  const handleRunQuery = async (queryNumber) => {
    try {
      setQueryResults((prev) => ({
        ...prev,
        [queryNumber]: { ...(prev[queryNumber] || {}), loading: true, error: null },
      }));

      const res = await api.getSqlInsightByNumber(queryNumber);
      if (res.data) {
        setQueryResults((prev) => ({
          ...prev,
          [queryNumber]: {
            loading: false,
            data: res.data,
            error: null,
            viewMode: prev[queryNumber]?.viewMode || 'table',
          },
        }));
      }
    } catch (err) {
      setQueryResults((prev) => ({
        ...prev,
        [queryNumber]: {
          loading: false,
          data: null,
          error: err.message || 'Failed to execute query.',
          viewMode: 'table',
        },
      }));
    }
  };

  const handleCopySql = (queryNumber, sqlText) => {
    navigator.clipboard.writeText(sqlText);
    setCopiedId(queryNumber);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleViewMode = (queryNumber, mode) => {
    setQueryResults((prev) => ({
      ...prev,
      [queryNumber]: {
        ...(prev[queryNumber] || {}),
        viewMode: mode,
      },
    }));
  };

  // Helper to determine if a query result can be plotted as a chart
  const canChart = (queryNumber, rows) => {
    if (!rows || rows.length === 0) return false;
    // Suitable for charts if query is time/categorical breakdown
    return [1, 2, 3, 4, 6, 7, 8, 15, 17, 20].includes(queryNumber);
  };

  if (loading && queries.length === 0) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error && queries.length === 0) {
    return (
      <div className="space-y-6">
        <ErrorBanner error={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              DBMS Analytical SQL Queries & Optimizer Insights
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              PostgreSQL 16+
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            20 course analytical queries demonstrating CTEs, Window Functions, Dimensional Joins, Correlated Subqueries, and EXPLAIN ANALYZE benchmarks.
          </p>
        </div>

        {/* EXPLAIN ANALYZE Optimization Toggle Button */}
        <button
          type="button"
          onClick={() => setShowOptimizationPanel((p) => !p)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg ${
            showOptimizationPanel
              ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
              : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{showOptimizationPanel ? 'Hide Query Optimization Benchmarks' : 'View EXPLAIN ANALYZE Benchmarks'}</span>
        </button>
      </div>

      {/* Collapsible EXPLAIN ANALYZE Query Optimization Panel */}
      {showOptimizationPanel && (
        <div className="glass-panel rounded-2xl border border-amber-500/40 bg-slate-900/95 shadow-2xl p-6 space-y-6 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-slate-100">
                DBMS Milestone: Query Optimization & Indexing Benchmarks
              </h2>
            </div>
            <span className="text-xs text-slate-400">Source: <code>database/query_optimization.sql</code></span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Experiment 1: Partial B-Tree Index */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 uppercase tracking-wider">
                  Experiment 1: Partial B-Tree Index
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  3.8× Speedup
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                <strong>Workload:</strong> Annual high-severity collision filtering (only ~24% of 513k rows qualify).
              </p>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-red-400">Without Index (Seq Scan): 35.20 ms | 21,462 shared buffer blocks</div>
                <div className="text-emerald-400">With Partial Index: 9.08 ms | 7,241 shared buffer blocks (-66% I/O)</div>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong>Viva Insight:</strong> The partial index (<code>WHERE is_severe = 1</code>) only indexes qualifying records, shrinking index footprint by 76% and navigating directly to matching heap pages without touching slight-severity rows.
              </p>
            </div>

            {/* Experiment 2: Composite Spatial Bounding-Box Index */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 uppercase tracking-wider">
                  Experiment 2: Composite Spatial Index
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  2.8× Speedup
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                <strong>Workload:</strong> Interactive Leaflet map bounding box queries (e.g. Greater London bounds).
              </p>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-red-400">Without Index (Seq Scan): 26.50 ms | 21,462 shared buffer blocks</div>
                <div className="text-emerald-400">With Composite Index: 9.40 ms | 6,850 shared buffer blocks (-68% I/O)</div>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong>Viva Insight:</strong> A composite B-tree on <code>(latitude, longitude)</code> allows two-dimensional range bounding, discarding 96% of rows before heap page access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Concepts & Search Controls */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Concept Group Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {CONCEPT_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGroup(g.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeGroup === g.id
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-lg shadow-sky-500/20'
                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search queries, concepts, SQL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
          />
        </div>
      </div>

      {/* 20 Analytical Query Cards Accordion */}
      <div className="space-y-4">
        {filteredQueries.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 text-sm">
            No analytical queries match the active filter criteria.
          </div>
        ) : (
          filteredQueries.map((q) => {
            const isExpanded = expandedQueryId === q.query_number;
            const resState = queryResults[q.query_number];
            const isCopied = copiedId === q.query_number;

            return (
              <div
                key={q.query_number}
                className={`glass-panel rounded-2xl border transition-all overflow-hidden ${
                  isExpanded ? 'border-sky-500/50 bg-slate-900/90 shadow-xl' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {/* Header Bar */}
                <div
                  onClick={() => setExpandedQueryId(isExpanded ? null : q.query_number)}
                  className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      Q{q.query_number < 10 ? `0${q.query_number}` : q.query_number}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        {q.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {q.question}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Execution time badge if already run */}
                    {resState?.data && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <Clock className="w-3 h-3" />
                        {resState.data.execution_time_ms} ms ({resState.data.row_count} rows)
                      </span>
                    )}

                    <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400 border border-slate-800 font-mono">
                      {q.concepts.split(',')[0]}
                    </span>

                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Content Section */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-800/80 space-y-5 bg-slate-950/40 animate-fade-in">
                    {/* Question & Concepts Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <span className="font-semibold text-sky-400 block text-[11px] uppercase tracking-wider">
                          Analytical Business Question
                        </span>
                        <p className="text-slate-200 leading-relaxed">{q.question}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <span className="font-semibold text-amber-400 block text-[11px] uppercase tracking-wider">
                          DBMS Concepts Implemented
                        </span>
                        <p className="text-slate-300 leading-relaxed font-mono">{q.concepts}</p>
                      </div>
                    </div>

                    {/* Viva & Methodological Explanation */}
                    {q.viva_explanation && (
                      <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-200/90 leading-relaxed flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-blue-300 font-semibold mb-0.5">Viva Examination Commentary:</strong>
                          <p className="text-slate-300 text-[11px]">{q.viva_explanation}</p>
                        </div>
                      </div>
                    )}

                    {/* Read-Only SQL Code Block */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                          <Code2 className="w-3.5 h-3.5 text-sky-400" />
                          PostgreSQL Analytical Query Statement
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopySql(q.query_number, q.sql)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition-all"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'Copied' : 'Copy SQL'}</span>
                        </button>
                      </div>

                      <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 overflow-x-auto text-xs font-mono text-sky-300/90 leading-relaxed shadow-inner">
                        <code>{q.sql}</code>
                      </pre>
                    </div>

                    {/* Action Bar: Run Query Button */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={resState?.loading}
                        onClick={() => handleRunQuery(q.query_number)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {resState?.loading ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 animate-spin text-slate-950" />
                            <span>Executing Against PostgreSQL...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Execute Query #{q.query_number} (GET /api/sql-insights/{q.query_number})</span>
                          </>
                        )}
                      </button>

                      {/* View Mode Toggle if rows returned */}
                      {resState?.data?.rows && canChart(q.query_number, resState.data.rows) && (
                        <div className="flex items-center gap-1 bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs">
                          <button
                            type="button"
                            onClick={() => toggleViewMode(q.query_number, 'table')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                              resState.viewMode !== 'chart' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <TableIcon className="w-3.5 h-3.5" /> Table
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleViewMode(q.query_number, 'chart')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                              resState.viewMode === 'chart' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <BarChart2 className="w-3.5 h-3.5" /> Chart
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Query Execution Error */}
                    {resState?.error && (
                      <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                        <strong>Execution Error:</strong> {resState.error}
                      </div>
                    )}

                    {/* Results Container */}
                    {resState?.data?.rows && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-semibold text-slate-300">
                            Query Output ({resState.data.row_count} rows returned in {resState.data.execution_time_ms} ms)
                          </span>
                        </div>

                        {/* Chart View */}
                        {resState.viewMode === 'chart' ? (
                          <div className="h-64 w-full p-4 rounded-xl bg-slate-950 border border-slate-800">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={resState.data.rows.slice(0, 20)}
                                margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                              >
                                <XAxis
                                  dataKey={Object.keys(resState.data.rows[0])[0]}
                                  stroke="#64748b"
                                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                                  angle={-20}
                                  textAnchor="end"
                                />
                                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                <RechartsTooltip
                                  contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderColor: '#334155',
                                    borderRadius: '0.75rem',
                                    fontSize: '12px',
                                    color: '#f8fafc',
                                  }}
                                />
                                <Bar
                                  dataKey={
                                    Object.keys(resState.data.rows[0]).find(
                                      (k) =>
                                        k.includes('count') ||
                                        k.includes('total') ||
                                        k.includes('percentage') ||
                                        k.includes('collisions') ||
                                        k.includes('score')
                                    ) || Object.keys(resState.data.rows[0])[1]
                                  }
                                  fill="#0ea5e9"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          /* Table View */
                          <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-80 custom-scrollbar">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0">
                                <tr>
                                  {Object.keys(resState.data.rows[0]).map((col) => (
                                    <th key={col} className="py-2.5 px-3">
                                      {col.replace(/_/g, ' ')}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                                {resState.data.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-800/40">
                                    {Object.values(row).map((val, cIdx) => (
                                      <td key={cIdx} className="py-2 px-3 whitespace-nowrap">
                                        {val === null || val === undefined ? (
                                          <span className="text-slate-600">NULL</span>
                                        ) : typeof val === 'number' ? (
                                          formatDecimal(val, 2)
                                        ) : (
                                          String(val)
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SqlInsights;
