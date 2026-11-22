import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  Info,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { analyzeCivicIssue } from '../services/apiService';
import type { CivicComplaint, PageId } from '../types/civic';

interface AIAnalysisPageProps {
  complaint: CivicComplaint | null;
  complaints: CivicComplaint[];
  onSelectComplaint: (c: CivicComplaint) => void;
  onUpdateComplaintAnalysis: (updated: CivicComplaint) => void;
  onNavigate: (page: PageId) => void;
}

export const AIAnalysisPage: React.FC<AIAnalysisPageProps> = ({
  complaint,
  complaints,
  onSelectComplaint,
  onUpdateComplaintAnalysis,
  onNavigate,
}) => {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const active = complaint || complaints[0] || null;

  if (!active) {
    return (
      <div className="max-w-xl mx-auto glass-panel-elevated rounded-2xl p-8 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">No Issue Selected for AI Analysis</h1>
        <p className="text-sm text-slate-300">
          Report a new civic issue with a photograph or enable Demo Mode to inspect Gemini Vision results.
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

  const handleRerunGemini = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await analyzeCivicIssue({
        imageUrl: active.imageUrl,
        categoryHint: active.category,
        description: active.description,
        location: active.location,
        nearbyLandmarks: active.nearbyLandmarks,
      });
      onUpdateComplaintAnalysis({
        ...active,
        category: res.problemCategory,
        severity: res.severityLevel,
        severityScore: res.severityScore,
        civicRippleScore: res.civicRippleScore,
        impactAnalysis: res.impactAnalysis,
        recommendations: res.recommendedActions,
      });
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Gemini re-analysis failed.');
    } finally {
      setRetrying(false);
    }
  };

  const severityTone =
    active.severity === 'Critical'
      ? 'text-rose-400'
      : active.severity === 'High'
        ? 'text-amber-300'
        : active.severity === 'Moderate'
          ? 'text-sky-300'
          : 'text-emerald-300';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-300">
            <span>Gemini Vision Civic Diagnostic</span>
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
            {active.impactAnalysis.detectedProblem}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {complaints.length > 1 && (
            <select
              aria-label="Select complaint for AI analysis"
              value={active.complaintId}
              onChange={(e) => {
                const found = complaints.find((c) => c.complaintId === e.target.value);
                if (found) onSelectComplaint(found);
              }}
              className="px-3 py-2 rounded-xl bg-[#09132b] border border-white/15 text-xs text-white"
            >
              {complaints.map((c) => (
                <option key={c.complaintId} value={c.complaintId}>
                  {c.complaintId} — {c.category}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={retrying}
            onClick={handleRerunGemini}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
            Re-run Gemini Vision
          </button>
          <button
            type="button"
            onClick={() => onNavigate('civic-ripple')}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            Open Civic Ripple Intelligence
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {retryError && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-400/30 p-4 flex items-start gap-3 text-sm text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{retryError}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Submitted Photo + Severity Meter */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl overflow-hidden">
            <img
              src={active.imageUrl}
              alt={active.impactAnalysis.detectedProblem}
              referrerPolicy="no-referrer"
              className="w-full h-72 object-cover bg-slate-950"
            />
            <div className="p-5 space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Classified Category</span>
                <span className="font-semibold text-white">{active.impactAnalysis.problemCategory}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Location</span>
                <span className="text-slate-200 text-right max-w-[240px] truncate">{active.location}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel-elevated rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Estimated Visual Severity</span>
              <span className={`text-sm font-semibold ${severityTone}`}>{active.severity}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold text-white tabular-nums">
                {active.severityScore}
              </span>
              <span className="text-sm text-slate-400">/ 100</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-500 transition-all"
                style={{ width: `${active.severityScore}%` }}
              />
            </div>

            <div className="pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs text-slate-300">
              <Info className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{active.impactAnalysis.confidenceExplanation}</p>
            </div>
          </div>
        </div>

        {/* Right: Structured Visual Observations, Consequences, Actions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Eye className="w-4 h-4 text-cyan-300" />
              <h2>Direct Visual Observations</h2>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-200">
              {active.impactAnalysis.visualObservations.map((obs, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-mono text-xs text-cyan-400 mt-1">0{idx + 1}.</span>
                  <span className="leading-relaxed">{obs}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Activity className="w-4 h-4 text-amber-300" />
              <h2>Potential Consequences if Unaddressed</h2>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-300">
              {active.impactAnalysis.possibleConsequences.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-amber-300 mt-1">•</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <h2>Recommended Immediate Corrective Actions</h2>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-200">
              {active.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-mono text-xs text-emerald-300 mt-1">{idx + 1}.</span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
