import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { LeafletMap } from '../components/LeafletMap';
import { DEMO_STATUS_HISTORY } from '../data/demoData';
import {
  getComplaintById,
  getStatusHistoryForComplaint,
} from '../services/firestoreService';
import type {
  CivicComplaint,
  ComplaintStatus,
  PageId,
  StatusHistoryEntry,
  UserProfile,
} from '../types/civic';

const LIFECYCLE_STEPS: ComplaintStatus[] = [
  'Submitted',
  'AI Analysed',
  'Under Review',
  'In Progress',
  'Resolved',
  'Verified',
];

interface TrackComplaintPageProps {
  user: UserProfile | null;
  demoMode: boolean;
  complaints: CivicComplaint[];
  selectedComplaint: CivicComplaint | null;
  demoHistoryMap: Record<string, StatusHistoryEntry[]>;
  onSelectComplaint: (c: CivicComplaint, nextPage?: PageId) => void;
  onNavigate: (page: PageId) => void;
}

export const TrackComplaintPage: React.FC<TrackComplaintPageProps> = ({
  user,
  complaints,
  selectedComplaint,
  demoHistoryMap,
  onSelectComplaint,
  onNavigate,
}) => {
  const [searchId, setSearchId] = useState(
    selectedComplaint?.complaintId || complaints[0]?.complaintId || ''
  );
  const [activeComplaint, setActiveComplaint] = useState<CivicComplaint | null>(
    selectedComplaint || complaints[0] || null
  );
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const target = selectedComplaint || complaints[0] || null;
    if (target) {
      setActiveComplaint(target);
      setSearchId(target.complaintId);
    }
  }, [selectedComplaint, complaints]);

  useEffect(() => {
    if (!activeComplaint) {
      setHistory([]);
      return;
    }

    if (activeComplaint.isDemo) {
      const demoEntries =
        demoHistoryMap[activeComplaint.complaintId] ||
        DEMO_STATUS_HISTORY[activeComplaint.complaintId] || [
          {
            historyId: 'DEMO-INIT',
            complaintId: activeComplaint.complaintId,
            complaintUserId: activeComplaint.userId,
            status: activeComplaint.status,
            remarks: activeComplaint.resolutionNotes || 'Report recorded in Demo Mode.',
            updatedBy: activeComplaint.reporterName,
            updatedByUid: activeComplaint.userId,
            timestamp: activeComplaint.updatedAt,
            isDemo: true,
          },
        ];
      setHistory(demoEntries);
      return;
    }

    if (user) {
      getStatusHistoryForComplaint(activeComplaint.complaintId, activeComplaint.userId)
        .then(setHistory)
        .catch(() => setHistory([]));
    }
  }, [activeComplaint, user, demoHistoryMap]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchId.trim();
    if (!q) return;
    setError(null);
    setSearching(true);

    try {
      const localMatch = complaints.find(
        (c) => c.complaintId.toLowerCase() === q.toLowerCase()
      );
      if (localMatch) {
        setActiveComplaint(localMatch);
        return;
      }

      if (!user) {
        setError(
          `No demo record found for "${q}". Sign in with Firebase Authentication to search live Firestore complaint IDs.`
        );
        return;
      }

      const remote = await getComplaintById(q);
      if (!remote) {
        setError(`No complaint found with ID "${q}". Verify the Complaint ID and try again.`);
      } else {
        setActiveComplaint(remote);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch complaint record.');
    } finally {
      setSearching(false);
    }
  };

  const currentStepIndex = activeComplaint
    ? LIFECYCLE_STEPS.indexOf(activeComplaint.status)
    : -1;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-300">
            Transparent Civic Lifecycle · Real-Time Status Audit
          </p>
          <h1 className="font-display text-3xl font-bold text-white mt-1">
            Track Complaint Progress
          </h1>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Complaint ID (e.g. DEMO-CIV-1042)"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lookup'}
          </button>
        </form>
      </div>

      {/* Quick chips for available complaints */}
      {complaints.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">Your / Active Complaints:</span>
          {complaints.slice(0, 6).map((c) => (
            <button
              key={c.complaintId}
              type="button"
              onClick={() => {
                setSearchId(c.complaintId);
                setActiveComplaint(c);
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg border font-mono transition-colors cursor-pointer ${
                activeComplaint?.complaintId === c.complaintId
                  ? 'bg-sky-500/25 border-sky-400 text-cyan-200'
                  : 'bg-white/5 border-white/15 text-slate-300 hover:text-white'
              }`}
            >
              {c.complaintId}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-400/30 p-4 flex items-start gap-3 text-sm text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!activeComplaint ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-300">
            Search for a Complaint ID above, or submit an issue to generate a trackable ID.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 6-Stage Lifecycle Stepper */}
          <div className="glass-panel-elevated rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="font-mono text-cyan-300 font-semibold">
                  {activeComplaint.complaintId}
                </span>
                <span aria-hidden="true">·</span>
                <span>Current Status:</span>
                <span className="font-semibold text-white">{activeComplaint.status}</span>
                {activeComplaint.isDemo && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300 font-mono">DEMO DATA</span>
                  </>
                )}
              </div>

              {(activeComplaint.status === 'Resolved' || activeComplaint.status === 'Verified') && (
                <button
                  type="button"
                  onClick={() => onSelectComplaint(activeComplaint, 'fix-verify')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/35 text-xs font-semibold text-emerald-200 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Open FixVerify AI
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {LIFECYCLE_STEPS.map((step, index) => {
                const completed = index <= currentStepIndex;
                const current = index === currentStepIndex;
                return (
                  <div
                    key={step}
                    className={`rounded-xl p-3 border text-xs ${
                      current
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : completed
                          ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
                          : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono">0{index + 1}</span>
                      {completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                    <div className="font-medium">{step}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Complaint Snapshot + Map */}
            <div className="lg:col-span-5 space-y-6">
              <div className="glass-panel rounded-2xl overflow-hidden">
                <img
                  src={activeComplaint.imageUrl}
                  alt={activeComplaint.category}
                  referrerPolicy="no-referrer"
                  className="w-full h-56 object-cover bg-slate-950"
                />
                <div className="p-5 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category</span>
                    <span className="text-white font-medium">{activeComplaint.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Severity / Ripple</span>
                    <span className="text-cyan-300 font-mono tabular-nums">
                      {activeComplaint.severity} · {activeComplaint.civicRippleScore}/100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Department</span>
                    <span className="text-white text-right">{activeComplaint.assignedDepartment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Submitted</span>
                    <span className="text-slate-200 font-mono tabular-nums">
                      {new Date(activeComplaint.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-slate-300 leading-relaxed">
                    {activeComplaint.description}
                  </div>
                </div>
              </div>

              {typeof activeComplaint.latitude === 'number' &&
                typeof activeComplaint.longitude === 'number' && (
                  <div className="glass-panel rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-cyan-300" />
                      <span>{activeComplaint.location}</span>
                    </div>
                    <LeafletMap
                      markers={[
                        {
                          id: activeComplaint.complaintId,
                          title: activeComplaint.complaintId,
                          subtitle: activeComplaint.location,
                          latitude: activeComplaint.latitude,
                          longitude: activeComplaint.longitude,
                          severity: activeComplaint.severity,
                          rippleScore: activeComplaint.civicRippleScore,
                        },
                      ]}
                      heightClass="h-48"
                    />
                  </div>
                )}
            </div>

            {/* Status History & Admin Updates */}
            <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display text-lg font-semibold text-white">
                  Status History &amp; Administrator Updates
                </h2>
                <button
                  type="button"
                  onClick={() => onSelectComplaint(activeComplaint, 'civic-ripple')}
                  className="text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
                >
                  Inspect Ripple Score →
                </button>
              </div>

              {activeComplaint.resolutionNotes && (
                <div className="rounded-xl bg-sky-500/10 border border-sky-400/25 p-4 space-y-1">
                  <div className="text-xs font-semibold text-cyan-300">Latest Municipal Note</div>
                  <p className="text-sm text-slate-200">{activeComplaint.resolutionNotes}</p>
                </div>
              )}

              {history.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Detailed audit entries are restricted to the complaint owner and authorized
                  administrators.
                </p>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div
                      key={entry.historyId}
                      className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-white">{entry.status}</span>
                        <span className="font-mono text-slate-400 tabular-nums">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{entry.remarks}</p>
                      <div className="text-[11px] text-slate-400">Updated by: {entry.updatedBy}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('citizen-dashboard')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-white cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
