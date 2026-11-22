import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { adminUpdateComplaintStatus } from '../services/firestoreService';
import type {
  CivicComplaint,
  ComplaintStatus,
  IssueCategory,
  PageId,
  SeverityLevel,
  UserProfile,
} from '../types/civic';

const STATUS_OPTIONS: ComplaintStatus[] = [
  'Submitted',
  'AI Analysed',
  'Under Review',
  'In Progress',
  'Resolved',
  'Verified',
];

const DEPARTMENTS = [
  'Department of Public Works — Roadway Maintenance',
  'Municipal Water & Sewer Utility',
  'Stormwater & Flood Control Unit',
  'Sanitation & Solid Waste Operations',
  'Smart Grid & Street Lighting Division',
  'Municipal Traffic Engineering',
];

interface AdminDashboardPageProps {
  user: UserProfile | null;
  demoMode: boolean;
  complaints: CivicComplaint[];
  onDemoAdminUpdate: (
    complaintId: string,
    status: ComplaintStatus,
    department: string,
    notes: string
  ) => void;
  onSelectComplaint: (c: CivicComplaint, targetPage: PageId) => void;
  onEnterDemoMode: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  user,
  demoMode,
  complaints,
  onDemoAdminUpdate,
  onSelectComplaint,
  onEnterDemoMode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<ComplaintStatus>('Under Review');
  const [draftDept, setDraftDept] = useState(DEPARTMENTS[0]);
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAuthorizedAdmin = demoMode || user?.role === 'admin';

  if (!isAuthorizedAdmin) {
    return (
      <div className="max-w-xl mx-auto glass-panel-elevated rounded-2xl p-8 text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-white">
          Administrator Authorization Required
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          Role-based access control is active. Citizen accounts cannot modify municipal department
          assignments or complaint lifecycle statuses. Sign in with the authorized administrator
          account or explore the Admin Command Centre inside Demo Mode.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={onEnterDemoMode}
            className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-sm font-medium cursor-pointer"
          >
            Preview Admin in Demo Mode
          </button>
        </div>
      </div>
    );
  }

  const filtered = complaints
    .filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.complaintId.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.impactAnalysis?.detectedProblem.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'ALL' || c.category === (categoryFilter as IssueCategory);
      const matchesSev = severityFilter === 'ALL' || c.severity === (severityFilter as SeverityLevel);
      const matchesLoc =
        !locationFilter.trim() ||
        c.location.toLowerCase().includes(locationFilter.toLowerCase().trim());
      return matchesSearch && matchesCat && matchesSev && matchesLoc;
    })
    .sort((a, b) => b.civicRippleScore - a.civicRippleScore);

  const startEdit = (c: CivicComplaint) => {
    setEditingId(c.complaintId);
    setDraftStatus(c.status);
    setDraftDept(
      DEPARTMENTS.includes(c.assignedDepartment) ? c.assignedDepartment : DEPARTMENTS[0]
    );
    setDraftNotes(c.resolutionNotes || '');
    setError(null);
    setSuccessMsg(null);
  };

  const handleSaveUpdate = async (c: CivicComplaint) => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      if (c.isDemo || demoMode || !user) {
        onDemoAdminUpdate(c.complaintId, draftStatus, draftDept, draftNotes);
        setSuccessMsg(`Updated ${c.complaintId} in Demo Mode.`);
        setEditingId(null);
      } else {
        await adminUpdateComplaintStatus({
          complaint: c,
          newStatus: draftStatus,
          assignedDepartment: draftDept,
          resolutionNotes: draftNotes,
          adminUser: user,
        });
        setSuccessMsg(`Saved status update for ${c.complaintId} to Firestore.`);
        setEditingId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update complaint status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <ShieldCheck className="w-4 h-4" />
            <span>Municipal Operations Command Centre</span>
            {demoMode && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-mono">DEMO DATA SANDBOX</span>
              </>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold text-white mt-1">
            Admin Dispatch &amp; Triage Queue
          </h1>
        </div>
        <div className="text-xs text-slate-400 font-mono tabular-nums">
          Sorted by Civic Ripple Score · {filtered.length} matching records
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-2xl p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ID or issue..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#09132b] border border-white/15 text-xs text-white"
          >
            <option value="ALL">All Categories</option>
            <option value="Road & Pothole">Road &amp; Pothole</option>
            <option value="Water Leakage">Water Leakage</option>
            <option value="Garbage & Sanitation">Garbage &amp; Sanitation</option>
            <option value="Open Drainage">Open Drainage</option>
            <option value="Streetlight Failure">Streetlight Failure</option>
            <option value="Flooding & Blocked Drain">Flooding &amp; Blocked Drain</option>
            <option value="Other Infrastructure">Other Infrastructure</option>
          </select>
        </div>

        <select
          aria-label="Filter by severity"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-[#09132b] border border-white/15 text-xs text-white"
        >
          <option value="ALL">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Moderate">Moderate</option>
          <option value="Low">Low</option>
        </select>

        <input
          type="text"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          placeholder="Filter by location..."
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-400/30 p-4 flex items-start gap-3 text-sm text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-4 flex items-center gap-3 text-sm text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((c) => {
          const isEditing = editingId === c.complaintId;
          return (
            <div key={c.complaintId} className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <img
                    src={c.imageUrl}
                    alt={c.category}
                    referrerPolicy="no-referrer"
                    className="w-24 h-20 rounded-xl object-cover border border-white/15 shrink-0 bg-slate-950"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono text-cyan-300 font-semibold">{c.complaintId}</span>
                      <span aria-hidden="true">·</span>
                      <span>{c.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-white font-medium">{c.severity}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-300 font-medium">{c.status}</span>
                      {c.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300 font-mono">DEMO DATA</span>
                        </>
                      )}
                    </div>
                    <h2 className="font-display text-base font-semibold text-white">
                      {c.impactAnalysis?.detectedProblem || c.description}
                    </h2>
                    <p className="text-xs text-slate-300">
                      Location: {c.location} · Dept: {c.assignedDepartment}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <div className="mr-2 text-right">
                    <div className="text-[11px] text-slate-400">Ripple Score</div>
                    <div className="font-mono text-xl font-bold text-cyan-300 tabular-nums">
                      {c.civicRippleScore}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectComplaint(c, 'ai-analysis')}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-xs text-slate-200 cursor-pointer"
                  >
                    AI Analysis
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectComplaint(c, 'fix-verify')}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-xs text-slate-200 cursor-pointer"
                  >
                    Review FixVerify
                  </button>
                  <button
                    type="button"
                    onClick={() => (isEditing ? setEditingId(null) : startEdit(c))}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white cursor-pointer"
                  >
                    {isEditing ? 'Close Editor' : 'Manage Dispatch'}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="pt-4 border-t border-white/10 grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Update Status</label>
                    <select
                      value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value as ComplaintStatus)}
                      className="w-full px-3 py-2 rounded-xl bg-[#09132b] border border-white/15 text-xs text-white"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Assign Department</label>
                    <select
                      value={draftDept}
                      onChange={(e) => setDraftDept(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#09132b] border border-white/15 text-xs text-white"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Resolution Notes</label>
                    <input
                      type="text"
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Dispatch crew notes or inspection summary..."
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleSaveUpdate(c)}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save Update
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
