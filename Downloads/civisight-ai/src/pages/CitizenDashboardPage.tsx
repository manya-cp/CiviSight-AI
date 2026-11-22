import React from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LeafletMap } from '../components/LeafletMap';
import type { CivicComplaint, PageId, UserProfile } from '../types/civic';

interface CitizenDashboardPageProps {
  user: UserProfile | null;
  demoMode: boolean;
  complaints: CivicComplaint[];
  loading: boolean;
  onNavigate: (page: PageId) => void;
  onSelectComplaint: (complaint: CivicComplaint, targetPage: PageId) => void;
}

export const CitizenDashboardPage: React.FC<CitizenDashboardPageProps> = ({
  user,
  demoMode,
  complaints,
  loading,
  onNavigate,
  onSelectComplaint,
}) => {
  const totalReports = complaints.length;
  const pendingCount = complaints.filter(
    (c) => c.status === 'Submitted' || c.status === 'AI Analysed'
  ).length;
  const underResolutionCount = complaints.filter(
    (c) => c.status === 'Under Review' || c.status === 'In Progress'
  ).length;
  const resolvedCount = complaints.filter(
    (c) => c.status === 'Resolved' || c.status === 'Verified'
  ).length;
  const criticalCount = complaints.filter((c) => c.severity === 'Critical').length;

  const avgRipple =
    complaints.length > 0
      ? Math.round(complaints.reduce((acc, c) => acc + c.civicRippleScore, 0) / complaints.length)
      : 0;

  const highestRipple = complaints.reduce<CivicComplaint | null>(
    (best, c) => (!best || c.civicRippleScore > best.civicRippleScore ? c : best),
    null
  );

  // Compute activity breakdown by category from actual records
  const categoryMap = new Map<string, { category: string; count: number; avgRipple: number; sum: number }>();
  complaints.forEach((c) => {
    const shortCat = c.category.split(' ')[0];
    const curr = categoryMap.get(shortCat) || { category: shortCat, count: 0, avgRipple: 0, sum: 0 };
    curr.count += 1;
    curr.sum += c.civicRippleScore;
    curr.avgRipple = Math.round(curr.sum / curr.count);
    categoryMap.set(shortCat, curr);
  });
  const chartData = Array.from(categoryMap.values());

  const mapMarkers = complaints
    .filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number')
    .map((c) => ({
      id: c.complaintId,
      title: `${c.complaintId} · ${c.category}`,
      subtitle: c.location,
      latitude: c.latitude!,
      longitude: c.longitude!,
      severity: c.severity,
      rippleScore: c.civicRippleScore,
    }));

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-300">
            {demoMode ? 'DEMO DATA · Sample Civic Workspace' : `Citizen Workspace · ${user?.email}`}
          </p>
          <h1 className="font-display text-3xl font-bold text-white mt-1">
            Welcome, {user ? user.name : 'Demo Explorer'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('track-complaint')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4 text-cyan-300" />
            Track by ID
          </button>
          <button
            type="button"
            onClick={() => onNavigate('report-issue')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Report New Issue
          </button>
        </div>
      </div>

      {/* 5 Required KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Reports', value: totalReports, accent: 'text-white' },
          { label: 'Pending Complaints', value: pendingCount, accent: 'text-sky-300' },
          { label: 'Under Resolution', value: underResolutionCount, accent: 'text-amber-300' },
          { label: 'Resolved / Verified', value: resolvedCount, accent: 'text-emerald-300' },
          { label: 'Critical Issues', value: criticalCount, accent: 'text-rose-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-panel rounded-2xl p-5">
            <div className="text-xs text-slate-400">{kpi.label}</div>
            <div className={`mt-2 text-3xl font-display font-bold tabular-nums ${kpi.accent}`}>
              {loading ? '—' : kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Activity Chart + AI Insights */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Civic Activity by Category</h2>
              <p className="text-xs text-slate-400">
                {demoMode ? 'Computed from clearly labeled DEMO DATA' : 'Computed from your stored Firestore complaints'}
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-300 tabular-nums">
              Avg Ripple: {avgRipple}/100
            </span>
          </div>

          {chartData.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center border border-dashed border-white/15 rounded-xl p-6">
              <p className="text-sm text-slate-300">No complaints recorded in this workspace yet.</p>
              <button
                type="button"
                onClick={() => onNavigate('report-issue')}
                className="mt-3 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
              >
                Submit Your First Issue
              </button>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09132b',
                      border: '1px solid rgba(56,189,248,0.3)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="count" name="Complaints" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* AI Insights & Geospatial Map */}
        <div className="lg:col-span-5 glass-panel-elevated rounded-2xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
              <Activity className="w-4 h-4" />
              <span>AI Priority Insights</span>
            </div>
            {highestRipple ? (
              <div className="space-y-2">
                <h3 className="font-display text-lg font-semibold text-white">
                  Highest Ripple Score: {highestRipple.civicRippleScore}/100
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className="font-mono text-sky-300">{highestRipple.complaintId}</span> ({highestRipple.category} at{' '}
                  {highestRipple.location}) carries a{' '}
                  <span className="text-white font-medium">{highestRipple.impactAnalysis.recommendedPriority}</span>{' '}
                  priority rating.
                </p>
                <button
                  type="button"
                  onClick={() => onSelectComplaint(highestRipple, 'civic-ripple')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 cursor-pointer"
                >
                  Inspect Ripple Dimensions
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-300 leading-relaxed">
                Upload an infrastructure photograph in Report Issue to generate Gemini Vision
                diagnostics and a 4-dimension Civic Ripple Score.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                OpenStreetMap Issue Locations
              </span>
              <span className="tabular-nums">{mapMarkers.length} pinned</span>
            </div>
            <LeafletMap markers={mapMarkers} heightClass="h-44" />
          </div>
        </div>
      </div>

      {/* Recent Complaints Table / Cards */}
      <section className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Recent Civic Complaints</h2>
            <p className="text-xs text-slate-400">
              Click any complaint to examine Gemini AI Analysis, Civic Ripple Score, Tracking, or FixVerify AI.
            </p>
          </div>
          {demoMode && (
            <span className="text-xs font-mono text-amber-300">DEMO DATA RECORDS</span>
          )}
        </div>

        {complaints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-10 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-medium text-white">No submitted complaints yet</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Start by reporting an infrastructure issue with a photo, or enable Demo Mode in the
              top bar to explore sample records.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('report-issue')}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
            >
              Report an Issue
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {complaints.map((c) => (
              <div
                key={c.complaintId}
                className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={c.imageUrl}
                    alt={c.category}
                    referrerPolicy="no-referrer"
                    className="w-20 h-16 rounded-lg object-cover border border-white/15 shrink-0 bg-slate-900"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono text-sky-300 font-medium">{c.complaintId}</span>
                      <span aria-hidden="true">·</span>
                      <span>{c.category}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          c.severity === 'Critical'
                            ? 'text-rose-400 font-semibold'
                            : c.severity === 'High'
                              ? 'text-amber-300 font-semibold'
                              : 'text-sky-300 font-medium'
                        }
                      >
                        {c.severity} Severity
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-300 font-medium">{c.status}</span>
                      {c.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300 font-mono">DEMO DATA</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">
                      {c.impactAnalysis?.detectedProblem || c.description}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">{c.location}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <div className="mr-2 text-right">
                    <div className="text-[11px] text-slate-400">Ripple Score</div>
                    <div className="font-mono text-base font-bold text-cyan-300 tabular-nums">
                      {c.civicRippleScore}/100
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectComplaint(c, 'ai-analysis')}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-medium text-slate-200 whitespace-nowrap cursor-pointer"
                  >
                    AI Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectComplaint(c, 'civic-ripple')}
                    className="px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 border border-sky-400/30 text-xs font-medium text-cyan-200 whitespace-nowrap cursor-pointer"
                  >
                    Ripple Score
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectComplaint(c, 'track-complaint')}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-medium text-slate-200 whitespace-nowrap cursor-pointer"
                  >
                    Track
                  </button>
                  {(c.status === 'Resolved' || c.status === 'Verified') && (
                    <button
                      type="button"
                      onClick={() => onSelectComplaint(c, 'fix-verify')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-xs font-medium text-emerald-200 whitespace-nowrap cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      FixVerify
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
