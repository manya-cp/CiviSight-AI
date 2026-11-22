import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { DEMO_REPAIRED_SAMPLE_IMAGE, DEMO_VERIFICATIONS } from '../data/demoData';
import { runFixVerifyComparison, uploadImageFile } from '../services/apiService';
import {
  getVerificationsForComplaint,
  saveRepairVerification,
} from '../services/firestoreService';
import { urlToDataUrl, validateAndPrepareImage } from '../utils/imageUtils';
import type {
  CivicComplaint,
  PageId,
  RepairVerification,
  UserProfile,
} from '../types/civic';

interface FixVerifyPageProps {
  user: UserProfile | null;
  demoMode: boolean;
  complaints: CivicComplaint[];
  selectedComplaint: CivicComplaint | null;
  demoVerifications: Record<string, RepairVerification[]>;
  onVerificationSaved: (complaintId: string, verification: RepairVerification) => void;
  onNavigate: (page: PageId) => void;
}

export const FixVerifyPage: React.FC<FixVerifyPageProps> = ({
  user,
  demoMode,
  complaints,
  selectedComplaint,
  demoVerifications,
  onVerificationSaved,
  onNavigate,
}) => {
  const verifiablePool = complaints.filter(
    (c) => c.status === 'Resolved' || c.status === 'Verified' || c.status === 'In Progress'
  );
  const pool = verifiablePool.length > 0 ? verifiablePool : complaints;

  const [targetId, setTargetId] = useState(
    selectedComplaint?.complaintId ||
      pool.find((c) => c.status === 'Resolved')?.complaintId ||
      pool[0]?.complaintId ||
      ''
  );
  const activeComplaint =
    complaints.find((c) => c.complaintId === targetId) || selectedComplaint || pool[0] || null;

  const [afterDataUrl, setAfterDataUrl] = useState<string | null>(null);
  const [afterMeta, setAfterMeta] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestVerification, setLatestVerification] = useState<RepairVerification | null>(null);
  const [historyList, setHistoryList] = useState<RepairVerification[]>([]);

  useEffect(() => {
    if (selectedComplaint) {
      setTargetId(selectedComplaint.complaintId);
    }
  }, [selectedComplaint]);

  useEffect(() => {
    setLatestVerification(null);
    if (!activeComplaint) {
      setHistoryList([]);
      return;
    }

    if (activeComplaint.isDemo) {
      const items =
        demoVerifications[activeComplaint.complaintId] ||
        DEMO_VERIFICATIONS[activeComplaint.complaintId] ||
        [];
      setHistoryList(items);
      if (items[0]) setLatestVerification(items[0]);
      return;
    }

    if (user) {
      getVerificationsForComplaint(activeComplaint.complaintId, activeComplaint.userId)
        .then((items) => {
          setHistoryList(items);
          if (items[0]) setLatestVerification(items[0]);
        })
        .catch(() => setHistoryList([]));
    }
  }, [activeComplaint?.complaintId, user, demoVerifications]);

  const handleAfterFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const prepared = await validateAndPrepareImage(file);
      setAfterDataUrl(prepared.dataUrl);
      setAfterMeta(`${prepared.width}x${prepared.height} · ${(prepared.sizeBytes / 1024).toFixed(0)} KB`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process after-repair image.');
    }
  };

  const handleLoadSampleRepaired = async () => {
    setError(null);
    try {
      const dataUrl = await urlToDataUrl(DEMO_REPAIRED_SAMPLE_IMAGE);
      setAfterDataUrl(dataUrl);
      setAfterMeta('Sample Repaired Road Surface Photo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load sample after-repair image.');
    }
  };

  const handleRunComparison = async () => {
    if (!activeComplaint) return;
    if (!afterDataUrl) {
      setError('Please upload an after-repair photograph before running FixVerify AI.');
      return;
    }

    const canWriteFirestore =
      Boolean(user) &&
      !activeComplaint.isDemo &&
      (user?.role === 'admin' || user?.uid === activeComplaint.userId);

    setError(null);
    setRunning(true);
    try {
      const uploadedAfter = await uploadImageFile(afterDataUrl);
      const aiComparison = await runFixVerifyComparison({
        beforeImageUrl: activeComplaint.imageUrl,
        afterImageDataUrl: afterDataUrl,
        originalProblem: activeComplaint.impactAnalysis?.detectedProblem || activeComplaint.description,
        category: activeComplaint.category,
        location: activeComplaint.location,
      });

      const verId = `VER-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 5)
        .toUpperCase()}`;

      const verificationDraft: Omit<RepairVerification, 'createdAt'> = {
        verificationId: verId,
        complaintId: activeComplaint.complaintId,
        complaintUserId: activeComplaint.userId,
        originalImageUrl: activeComplaint.imageUrl,
        afterImageUrl: uploadedAfter.url,
        result: aiComparison.result,
        visualDifferences: aiComparison.visualDifferences,
        explanation: aiComparison.explanation,
        confidenceNote: aiComparison.confidenceNote,
        verifiedByUid: user?.uid || 'demo-verifier',
        isDemo: activeComplaint.isDemo || demoMode,
      };

      if (canWriteFirestore && user) {
        const saved = await saveRepairVerification({
          complaint: activeComplaint,
          verification: verificationDraft,
          verifierName: user.name,
        });
        setLatestVerification(saved);
        onVerificationSaved(activeComplaint.complaintId, saved);
      } else {
        const localSaved: RepairVerification = {
          ...verificationDraft,
          createdAt: new Date().toISOString(),
          isDemo: true,
        };
        setLatestVerification(localSaved);
        onVerificationSaved(activeComplaint.complaintId, localSaved);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FixVerify AI comparison failed.');
    } finally {
      setRunning(false);
    }
  };

  if (!activeComplaint) {
    return (
      <div className="max-w-xl mx-auto glass-panel-elevated rounded-2xl p-8 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">FixVerify AI</h1>
        <p className="text-sm text-slate-300">
          Submit a complaint or activate Demo Mode to test AI-assisted before-and-after repair
          verification.
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

  const resultTone =
    latestVerification?.result === 'Appears Resolved'
      ? 'text-emerald-300'
      : latestVerification?.result === 'Partially Resolved'
        ? 'text-amber-300'
        : latestVerification?.result === 'Appears Unresolved'
          ? 'text-rose-400'
          : 'text-sky-300';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <ShieldCheck className="w-4 h-4" />
            <span>FixVerify AI · Before &amp; After Visual Closure</span>
            {activeComplaint.isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-mono">DEMO DATA</span>
              </>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold text-white mt-1">
            AI-Assisted Repair Verification
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Select complaint to verify"
            value={activeComplaint.complaintId}
            onChange={(e) => setTargetId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#09132b] border border-white/15 text-xs text-white"
          >
            {pool.map((c) => (
              <option key={c.complaintId} value={c.complaintId}>
                {c.complaintId} · {c.category} ({c.status})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleLoadSampleRepaired}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
          >
            Load Sample Repaired Road Photo
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-400/30 p-4 flex items-start gap-3 text-sm text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Side-by-side Before and After Comparison */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Before Photograph (Original Report)</span>
            <span className="font-mono text-slate-400">{activeComplaint.complaintId}</span>
          </div>
          <img
            src={activeComplaint.imageUrl}
            alt="Before repair"
            referrerPolicy="no-referrer"
            className="w-full h-72 object-cover rounded-xl border border-white/10 bg-slate-950"
          />
          <p className="text-xs text-slate-300 leading-relaxed">
            {activeComplaint.impactAnalysis?.detectedProblem || activeComplaint.description}
          </p>
        </div>

        <div className="glass-panel-elevated rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">After Photograph (Post-Repair Upload)</span>
            <span className="text-cyan-300">{afterMeta || 'JPEG, PNG, WebP'}</span>
          </div>

          <label className="block cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleAfterFile(e.target.files?.[0])}
            />
            {afterDataUrl || latestVerification?.afterImageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-cyan-400/35">
                <img
                  src={afterDataUrl || latestVerification?.afterImageUrl}
                  alt="After repair"
                  referrerPolicy="no-referrer"
                  className="w-full h-72 object-cover bg-slate-950"
                />
                <div className="px-3 py-2 bg-[#040917]/85 text-xs text-cyan-300 text-right">
                  Click to replace after-repair photo
                </div>
              </div>
            ) : (
              <div className="h-72 rounded-xl border border-dashed border-white/25 hover:border-cyan-400/60 bg-white/5 flex flex-col items-center justify-center text-center p-6 transition-colors">
                <Upload className="w-8 h-8 text-cyan-300 mb-3" />
                <div className="text-sm font-medium text-white">Upload After-Repair Photograph</div>
                <p className="text-xs text-slate-400 mt-1">
                  Gemini Vision will compare surface conditions against the original complaint photo
                </p>
              </div>
            )}
          </label>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400">
              {activeComplaint.status !== 'Resolved' && !activeComplaint.isDemo
                ? `Current status: ${activeComplaint.status}`
                : 'Ready for Gemini comparison'}
            </span>
            <button
              type="button"
              disabled={running || !afterDataUrl}
              onClick={handleRunComparison}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {running ? 'Comparing with Gemini Vision...' : 'Run FixVerify AI Comparison'}
            </button>
          </div>
        </div>
      </div>

      {/* Verification Output Panel */}
      {latestVerification && (
        <section className="glass-panel-elevated rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs text-slate-400">
                AI-Assisted Visual Verification Result · {latestVerification.verificationId}
              </div>
              <h2 className={`font-display text-2xl font-bold mt-1 ${resultTone}`}>
                {latestVerification.result}
              </h2>
            </div>
            <div className="text-xs text-slate-300">
              Complaint Status:{' '}
              <span className="font-semibold text-white">
                {latestVerification.result === 'Appears Resolved' ? 'Verified' : activeComplaint.status}
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Observed Visual Differences</h3>
              <ul className="space-y-2 text-sm text-slate-200">
                {latestVerification.visualDifferences.map((diff, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                    <span>{diff}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">AI Explanation</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {latestVerification.explanation}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-sky-500/10 border border-sky-400/25 p-4 flex items-start gap-3 text-xs text-sky-100">
            <Info className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">AI-Assisted Visual Verification Notice: </span>
              {latestVerification.confidenceNote}
            </div>
          </div>
        </section>
      )}

      {historyList.length > 1 && (
        <section className="glass-panel rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-white">Previous Verification Checks</h3>
          <div className="divide-y divide-white/10 text-xs">
            {historyList.map((item) => (
              <div key={item.verificationId} className="py-2.5 flex items-center justify-between">
                <span className="font-mono text-slate-300">{item.verificationId}</span>
                <span className="text-white font-medium">{item.result}</span>
                <span className="font-mono text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
