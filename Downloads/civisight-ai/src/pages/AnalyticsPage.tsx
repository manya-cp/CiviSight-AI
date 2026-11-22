import React, { useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LeafletMap } from '../components/LeafletMap';
import { generateAnalyticsInsights } from '../services/apiService';
import type { AnalyticsInsightsResponse, CivicComplaint } from '../types/civic';

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#f43f5e',
  High: '#f59e0b',
  Moderate: '#38bdf8',
  Low: '#10b981',
};

interface AnalyticsPageProps {
  complaints: CivicComplaint[];
  demoMode: boolean;
  onEnterDemoMode: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  complaints,
  demoMode,
  onEnterDemoMode,
}) => {
  const [aiInsights, setAiInsights] = useState<AnalyticsInsightsResponse | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Aggregate strictly from actual stored records
  const categoryCounts = new Map<string, number>();
  const severityCounts = new Map<string, number>();
  const monthCounts = new Map<string, { month: string; count: number; avgRipple: number; sumRipple: number }>();

  let resolvedCount = 0;
  let totalResolutionHours = 0;

  complaints.forEach((c) => {
    categoryCounts.set(c.category, (categoryCounts.get(c.category) || 0) + 1);
    severityCounts.set(c.severity, (severityCounts.get(c.severity) || 0) + 1);

    const dateObj = new Date(c.createdAt);
    const monthKey = Number.isNaN(dateObj.getTime())
      ? 'Unknown'
      : dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const mEntry = monthCounts.get(monthKey) || { month: monthKey, count: 0, avgRipple: 0, sumRipple: 0 };
    mEntry.count += 1;
    mEntry.sumRipple += c.civicRippleScore;
    mEntry.avgRipple = Math.round(mEntry.sumRipple / mEntry.count);
    monthCounts.set(monthKey, mEntry);

    if (c.status === 'Resolved' || c.status === 'Verified') {
      resolvedCount += 1;
      const start = new Date(c.createdAt).getTime();
      const end = new Date(c.updatedAt).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        totalResolutionHours += (end - start) / (1000 * 60 * 60);
      }
    }
  });

  const categoryData = Array.from(categoryCounts.entries()).map(([name, value]) => ({
    name: name.replace(' & ', '/'),
    count: value,
  }));

  const severityData = ['Critical', 'High', 'Moderate', 'Low']
    .map((sev) => ({
      name: sev,
      value: severityCounts.get(sev) || 0,
    }))
    .filter((d) => d.value > 0);

  const trendData = Array.from(monthCounts.values());

  const avgResolutionHours =
    resolvedCount > 0 ? Math.round(totalResolutionHours / resolvedCount) : 0;
  const resolutionRate =
    complaints.length > 0 ? Math.round((resolvedCount / complaints.length) * 100) : 0;

  const highPriorityLocations = [...complaints]
    .sort((a, b) => b.civicRippleScore - a.civicRippleScore)
    .slice(0, 6);

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

  const handleGenerateBriefing = async () => {
    setInsightsError(null);
    setLoadingInsights(true);
    try {
      const summary = {
        dataSource: demoMode ? 'DEMO DATA (Sample Dataset)' : 'Live Authenticated Firestore Records',
        totalComplaints: complaints.length,
        resolvedOrVerified: resolvedCount,
        resolutionRatePercent: resolutionRate,
        averageResolutionHours: avgResolutionHours,
        byCategory: categoryData,
        bySeverity: severityData,
        topPriorityLocations: highPriorityLocations.map((c) => ({
          id: c.complaintId,
          location: c.location,
          category: c.category,
          rippleScore: c.civicRippleScore,
          status: c.status,
        })),
      };
      const res = await generateAnalyticsInsights(summary);
      setAiInsights(res);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : 'Unable to generate Gemini briefing.');
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <BarChart3 className="w-4 h-4" />
            <span>Civic Analytics &amp; Insights</span>
            <span aria-hidden="true">·</span>
            <span className={demoMode ? 'text-amber-300 font-mono' : 'text-emerald-300 font-mono'}>
              {demoMode ? 'SOURCE: DEMO DATA' : 'SOURCE: LIVE FIRESTORE RECORDS'}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white mt-1">
            Infrastructure Telemetry &amp; Trends
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!demoMode && complaints.length === 0 && (
            <button
              type="button"
              onClick={onEnterDemoMode}
              className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/35 text-xs font-medium text-amber-200 cursor-pointer"
            >
              Load Demo Dataset
            </button>
          )}
          <button
            type="button"
            disabled={loadingInsights || complaints.length === 0}
            onClick={handleGenerateBriefing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            {loadingInsights ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate Gemini Executive Briefing
          </button>
        </div>
      </div>

      {insightsError && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-400/30 p-4 flex items-start gap-3 text-sm text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{insightsError}</span>
        </div>
      )}

      {aiInsights && (
        <section className="glass-panel-elevated rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display text-lg font-semibold text-white">
              Gemini Municipal Operations Briefing
            </h2>
            <span className="text-xs text-cyan-300 font-mono">
              {demoMode ? 'DEMO DATA ANALYSIS' : 'LIVE DATA ANALYSIS'}
            </span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{aiInsights.executiveSummary}</p>
          <div className="grid md:grid-cols-2 gap-5 text-sm">
            <div>
              <div className="text-xs font-semibold text-amber-300 mb-2">Priority Hotspots</div>
              <ul className="space-y-1.5 text-slate-300">
                {aiInsights.priorityHotspots.map((h, i) => (
                  <li key={i}>• {h}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-300 mb-2">
                Operational Recommendations
              </div>
              <ul className="space-y-1.5 text-slate-300">
                {aiInsights.operationalRecommendations.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-400 pt-2 border-t border-white/10">{aiInsights.dataCaveat}</p>
        </section>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <div className="text-xs text-slate-400">Stored Records Analyzed</div>
          <div className="mt-1 text-3xl font-display font-bold text-white tabular-nums">
            {complaints.length}
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="text-xs text-slate-400">Resolution Rate</div>
          <div className="mt-1 text-3xl font-display font-bold text-emerald-300 tabular-nums">
            {resolutionRate}%
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="text-xs text-slate-400">Avg. Resolution Time</div>
          <div className="mt-1 text-3xl font-display font-bold text-cyan-300 tabular-nums">
            {resolvedCount > 0 ? `${avgResolutionHours}h` : 'N/A'}
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="text-xs text-slate-400">Peak Ripple Score</div>
          <div className="mt-1 text-3xl font-display font-bold text-amber-300 tabular-nums">
            {highPriorityLocations[0]?.civicRippleScore ?? 0}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      {complaints.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-300">
            No stored records available yet in your current workspace. Submit a complaint or activate
            Demo Mode to inspect interactive charts.
          </p>
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-white">
                Category-Wise Complaints
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#09132b',
                        border: '1px solid rgba(56,189,248,0.35)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar dataKey="count" name="Complaints" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-white">
                Severity Distribution
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={86}
                      paddingAngle={3}
                    >
                      {severityData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={SEVERITY_COLORS[entry.name] || '#38bdf8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#09132b',
                        border: '1px solid rgba(56,189,248,0.35)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-300">
                {severityData.map((d) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5 tabular-nums">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: SEVERITY_COLORS[d.name] }}
                    />
                    {d.name}: {d.value}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-white">
                Monthly Complaint &amp; Ripple Trends
              </h2>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#09132b',
                        border: '1px solid rgba(56,189,248,0.35)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgRipple"
                      name="Avg Ripple Score"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.22}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-6 glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-white">
                Geospatial Cluster View
              </h2>
              <LeafletMap markers={mapMarkers} heightClass="h-60" />
            </div>
          </div>

          {/* High Priority Locations */}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-white">
              High-Priority Locations Ranked by Civic Ripple Score
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2 pr-4 font-medium">Complaint ID</th>
                    <th className="py-2 px-3 font-medium">Location</th>
                    <th className="py-2 px-3 font-medium">Category</th>
                    <th className="py-2 px-3 font-medium">Status</th>
                    <th className="py-2 pl-3 font-medium text-right">Ripple Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {highPriorityLocations.map((c) => (
                    <tr key={c.complaintId}>
                      <td className="py-3 pr-4 font-mono text-cyan-300">
                        {c.complaintId}
                        {c.isDemo ? ' (DEMO)' : ''}
                      </td>
                      <td className="py-3 px-3 text-white">{c.location}</td>
                      <td className="py-3 px-3 text-slate-300">{c.category}</td>
                      <td className="py-3 px-3 text-emerald-300">{c.status}</td>
                      <td className="py-3 pl-3 text-right font-mono font-bold text-white tabular-nums">
                        {c.civicRippleScore}/100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
