import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  MapPin,
  ShieldAlert,
  Waves,
} from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CivicComplaint, PageId } from '../types/civic';

interface CivicRipplePageProps {
  complaint: CivicComplaint | null;
  complaints: CivicComplaint[];
  onSelectComplaint: (c: CivicComplaint) => void;
  onNavigate: (page: PageId) => void;
}

export const CivicRipplePage: React.FC<CivicRipplePageProps> = ({
  complaint,
  complaints,
  onSelectComplaint,
  onNavigate,
}) => {
  const active = complaint || complaints[0] || null;

  if (!active) {
    return (
      <div className="max-w-xl mx-auto glass-panel-elevated rounded-2xl p-8 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">Civic Ripple Intelligence</h1>
        <p className="text-sm text-slate-300">
          Submit a civic complaint or enable Demo Mode to inspect how CIVISIGHT AI predicts
          community impact across four weighted dimensions.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('report-issue')}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium cursor-pointer"
        >
          Report an Issue
        </button>
      </div>
    );
  }

  const ia = active.impactAnalysis;
  const radarData = [
    { dimension: 'Infrastructure', score: ia.infrastructureImpact },
    { dimension: 'Public Safety', score: ia.publicSafetyImpact },
    { dimension: 'Environmental', score: ia.environmentalImpact },
    { dimension: 'Disruption', score: ia.communityDisruption },
  ];

  const dimensions = [
    {
      name: 'Infrastructure Impact',
      score: ia.infrastructureImpact,
      weight: '30%',
      color: 'bg-sky-400',
      desc: 'Structural stress on roadways, utilities, drainage, and municipal assets.',
    },
    {
      name: 'Public Safety Impact',
      score: ia.publicSafetyImpact,
      weight: '30%',
      color: 'bg-rose-400',
      desc: 'Immediate hazard exposure for pedestrians, motorists, schools, and clinics.',
    },
    {
      name: 'Environmental Impact',
      score: ia.environmentalImpact,
      weight: '20%',
      color: 'bg-emerald-400',
      desc: 'Water waste, sewage/drainage contamination, and urban ecological risk.',
    },
    {
      name: 'Community Disruption',
      score: ia.communityDisruption,
      weight: '20%',
      color: 'bg-violet-400',
      desc: 'Transit delays, commercial access friction, and daily neighborhood mobility.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-300">
            <Waves className="w-4 h-4" />
            <span>Civic Ripple Intelligence</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{active.complaintId}</span>
            {active.isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-mono">DEMO DATA</span>
              </>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold text-white mt-1">
            Community Impact &amp; Priority Assessment
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {complaints.length > 1 && (
            <select
              aria-label="Select complaint for Civic Ripple Intelligence"
              value={active.complaintId}
              onChange={(e) => {
                const found = complaints.find((c) => c.complaintId === e.target.value);
                if (found) onSelectComplaint(found);
              }}
              className="px-3 py-2 rounded-xl bg-[#09132b] border border-white/15 text-xs text-white"
            >
              {complaints.map((c) => (
                <option key={c.complaintId} value={c.complaintId}>
                  {c.complaintId} — {c.category} (Ripple {c.civicRippleScore})
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => onNavigate('track-complaint')}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            Track Lifecycle
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Limited Context Warning when nearby landmarks are unavailable */}
      {ia.limitedContextWarning && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-400/35 p-4 flex items-start gap-3 text-sm text-amber-100">
          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-200">Limited Proximity Context</div>
            <p className="text-xs text-amber-100/90 mt-0.5 leading-relaxed">
              Nearby sensitive location details were not provided for this report. The Civic Ripple
              Score is calculated strictly from visual observations and the street label, without
              school, clinic, or transit proximity weighting.
            </p>
          </div>
        </div>
      )}

      {/* Top Row: Composite Score + Radar Chart */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 glass-panel-elevated rounded-2xl p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Composite Civic Ripple Score</span>
              <span className="font-semibold text-cyan-300">{ia.recommendedPriority}</span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-display text-6xl font-extrabold text-white tabular-nums">
                {active.civicRippleScore}
              </span>
              <span className="text-lg text-slate-400">/ 100</span>
            </div>

            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400"
                style={{ width: `${active.civicRippleScore}%` }}
              />
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">{ia.rippleExplanation}</p>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400">Site: </span>
                <span className="text-white font-medium">{active.location}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <Compass className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400">Nearby Sensitive Locations: </span>
                <span className="text-slate-200">
                  {active.nearbyLandmarks?.trim()
                    ? active.nearbyLandmarks
                    : 'Not supplied (impact assessment limited)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Radar Chart + 4 Dimensions */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 sm:p-7 grid md:grid-cols-2 gap-6 items-center">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="rgba(148,163,184,0.22)" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar
                  name="Ripple Dimension"
                  dataKey="score"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.32}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09132b',
                    border: '1px solid rgba(56,189,248,0.35)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            {dimensions.map((dim) => (
              <div key={dim.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white">
                    {dim.name} <span className="text-slate-400">({dim.weight})</span>
                  </span>
                  <span className="font-mono font-bold text-cyan-300 tabular-nums">{dim.score}/100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full ${dim.color}`} style={{ width: `${dim.score}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{dim.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transparent Calculation Rules Table */}
      <section className="glass-panel rounded-2xl p-6 sm:p-7 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            How the Civic Ripple Score Was Calculated
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent rule-based weighting: 30% Infrastructure + 30% Public Safety + 20%
            Environmental + 20% Community Disruption. Estimates prioritize triage and do not
            represent verified engineering measurements.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Impact Dimension</th>
                <th className="py-2.5 px-3 font-medium text-right">Weight</th>
                <th className="py-2.5 px-3 font-medium text-right">Visual Base</th>
                <th className="py-2.5 px-3 font-medium text-right">Context Adj.</th>
                <th className="py-2.5 px-3 font-medium text-right">Final</th>
                <th className="py-2.5 pl-4 font-medium">Rule Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(ia.ruleBreakdown || []).map((row) => (
                <tr key={row.dimension}>
                  <td className="py-3 pr-4 font-medium text-white">{row.dimension}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                    {Math.round(row.weight * 100)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                    {row.baseScore}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-cyan-300">
                    +{row.contextAdjustment}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-white">
                    {row.finalScore}
                  </td>
                  <td className="py-3 pl-4 text-slate-300 text-xs">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Consequences + Corrective Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <h2>Potential Community Consequences</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            {ia.possibleConsequences.map((c, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="text-amber-300 mt-1">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <h2>Suggested Corrective Actions</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-200">
            {active.recommendations.map((r, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="font-mono text-xs text-emerald-300 mt-1">{idx + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
