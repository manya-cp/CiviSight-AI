import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { AlertCircle, Loader2 } from 'lucide-react';
import { PageShell } from './components/PageShell';
import { DEMO_COMPLAINTS, DEMO_STATUS_HISTORY, DEMO_VERIFICATIONS } from './data/demoData';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AIAnalysisPage } from './pages/AIAnalysisPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuthPages } from './pages/AuthPages';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { CivicRipplePage } from './pages/CivicRipplePage';
import { FixVerifyPage } from './pages/FixVerifyPage';
import { LandingPage } from './pages/LandingPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { TrackComplaintPage } from './pages/TrackComplaintPage';
import { auth } from './services/firebase';
import { getOrCreateUserProfile, subscribeToComplaints } from './services/firestoreService';
import type {
  CivicComplaint,
  ComplaintStatus,
  PageId,
  RepairVerification,
  StatusHistoryEntry,
  UserProfile,
} from './types/civic';

export default function App() {
  const [historyStack, setHistoryStack] = useState<PageId[]>(['citizen-dashboard']);
  const currentPage = historyStack[historyStack.length - 1];

  const [authReady, setAuthReady] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [demoMode, setDemoMode] = useState(true);

  const [liveComplaints, setLiveComplaints] = useState<CivicComplaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const [demoComplaints, setDemoComplaints] = useState<CivicComplaint[]>(DEMO_COMPLAINTS);
  const [demoHistoryMap, setDemoHistoryMap] =
    useState<Record<string, StatusHistoryEntry[]>>(DEMO_STATUS_HISTORY);
  const [demoVerifications, setDemoVerifications] =
    useState<Record<string, RepairVerification[]>>(DEMO_VERIFICATIONS);

  const [selectedComplaint, setSelectedComplaint] = useState<CivicComplaint | null>(DEMO_COMPLAINTS[0] || null);

  // Active dataset depends strictly on Demo Mode vs Live Authenticated Firestore
  const activeComplaints = demoMode ? demoComplaints : liveComplaints;

  const navigate = (page: PageId) => {
    setHistoryStack((prev) => {
      if (prev[prev.length - 1] === page) return prev;
      return [...prev, page];
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (currentPage === 'landing') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setHistoryStack((prev) => {
      if (prev.length <= 1) return ['landing'];
      return prev.slice(0, -1);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Firebase Auth readiness and profile sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLiveComplaints([]);
        setAuthReady(true);
        return;
      }

      try {
        const profile = await getOrCreateUserProfile(
          fbUser.uid,
          fbUser.displayName || fbUser.email?.split('@')[0] || 'Civic User',
          fbUser.email || ''
        );
        setUser(profile);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setUser({
          uid: fbUser.uid,
          name: fbUser.displayName || 'Citizen',
          email: fbUser.email || '',
          role: 'citizen',
        });
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Firestore real-time complaints listener (only attached when authenticated & not in Demo Mode)
  useEffect(() => {
    if (!authReady || !user || demoMode) {
      setLoadingComplaints(false);
      return;
    }

    setLoadingComplaints(true);
    setFirestoreError(null);
    const unsub = subscribeToComplaints(
      user,
      (items) => {
        setLiveComplaints(items);
        setLoadingComplaints(false);
      },
      (err) => {
        setFirestoreError(err.message);
        setLoadingComplaints(false);
      }
    );

    return () => unsub();
  }, [authReady, user, demoMode]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setLiveComplaints([]);
    setSelectedComplaint(null);
    navigate('landing');
  };

  const handleToggleDemoMode = () => {
    setDemoMode((prev) => {
      const next = !prev;
      setSelectedComplaint(next ? demoComplaints[0] : null);
      if (next && (currentPage === 'login' || currentPage === 'register')) {
        navigate('citizen-dashboard');
      }
      return next;
    });
  };

  const handleEnterDemoMode = () => {
    setDemoMode(true);
    setSelectedComplaint(demoComplaints[0]);
    navigate('citizen-dashboard');
  };

  const handleComplaintCreated = (saved: CivicComplaint, nextPage: PageId) => {
    if (saved.isDemo) {
      setDemoComplaints((prev) => [saved, ...prev]);
      setDemoHistoryMap((prev) => ({
        ...prev,
        [saved.complaintId]: [
          {
            historyId: `HIST-${saved.complaintId}-1`,
            complaintId: saved.complaintId,
            complaintUserId: saved.userId,
            status: 'Submitted',
            remarks: 'Submitted in Demo Mode with photographic evidence.',
            updatedBy: saved.reporterName,
            updatedByUid: saved.userId,
            timestamp: saved.createdAt,
            isDemo: true,
          },
          {
            historyId: `HIST-${saved.complaintId}-2`,
            complaintId: saved.complaintId,
            complaintUserId: saved.userId,
            status: 'AI Analysed',
            remarks: `Gemini Vision + Civic Ripple Score (${saved.civicRippleScore}/100) calculated.`,
            updatedBy: 'CIVISIGHT AI Engine',
            updatedByUid: 'system',
            timestamp: saved.updatedAt,
            isDemo: true,
          },
        ],
      }));
    }
    setSelectedComplaint(saved);
    navigate(nextPage);
  };

  const handleDemoAdminUpdate = (
    complaintId: string,
    status: ComplaintStatus,
    department: string,
    notes: string
  ) => {
    const now = new Date().toISOString();
    setDemoComplaints((prev) =>
      prev.map((c) =>
        c.complaintId === complaintId
          ? {
              ...c,
              status,
              assignedDepartment: department,
              resolutionNotes: notes,
              updatedAt: now,
            }
          : c
      )
    );
    setDemoHistoryMap((prev) => ({
      ...prev,
      [complaintId]: [
        ...(prev[complaintId] || DEMO_STATUS_HISTORY[complaintId] || []),
        {
          historyId: `DEMO-HIST-${Date.now()}`,
          complaintId,
          complaintUserId: 'demo',
          status,
          remarks: notes || `Updated to ${status} (${department})`,
          updatedBy: 'Municipal Admin (Demo)',
          updatedByUid: 'demo-admin',
          timestamp: now,
          isDemo: true,
        },
      ],
    }));
  };

  const handleVerificationSaved = (complaintId: string, verification: RepairVerification) => {
    if (verification.isDemo) {
      setDemoVerifications((prev) => ({
        ...prev,
        [complaintId]: [verification, ...(prev[complaintId] || DEMO_VERIFICATIONS[complaintId] || [])],
      }));
      if (verification.result === 'Appears Resolved') {
        handleDemoAdminUpdate(
          complaintId,
          'Verified',
          'FixVerify AI Visual Closure',
          verification.explanation
        );
      }
    }
  };

  const renderPage = () => {
    if (!authReady) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-300">
          <Loader2 className="w-7 h-7 animate-spin text-cyan-300" />
          <p className="text-sm">Initializing Firebase &amp; CIVISIGHT AI workspace...</p>
        </div>
      );
    }

    // Protect authenticated citizen dashboard if neither signed in nor Demo Mode
    if (currentPage === 'citizen-dashboard' && !user && !demoMode) {
      return (
        <AuthPages
          mode="login"
          onNavigate={navigate}
          onAuthSuccess={(profile) => {
            setUser(profile);
            navigate(profile.role === 'admin' ? 'admin-dashboard' : 'citizen-dashboard');
          }}
          onEnterDemoMode={handleEnterDemoMode}
        />
      );
    }

    switch (currentPage) {
      case 'landing':
        return (
          <LandingPage
            onNavigate={navigate}
            user={user}
            demoMode={demoMode}
            onEnterDemoMode={handleEnterDemoMode}
            complaints={activeComplaints}
          />
        );
      case 'login':
      case 'register':
        return (
          <AuthPages
            mode={currentPage}
            onNavigate={navigate}
            onAuthSuccess={(profile) => {
              setUser(profile);
              setDemoMode(false);
              navigate(profile.role === 'admin' ? 'admin-dashboard' : 'citizen-dashboard');
            }}
            onEnterDemoMode={handleEnterDemoMode}
          />
        );
      case 'citizen-dashboard':
        return (
          <CitizenDashboardPage
            user={user}
            demoMode={demoMode}
            complaints={activeComplaints}
            loading={loadingComplaints}
            onNavigate={navigate}
            onSelectComplaint={(c, target) => {
              setSelectedComplaint(c);
              navigate(target);
            }}
          />
        );
      case 'report-issue':
        return (
          <ReportIssuePage
            user={user}
            demoMode={demoMode}
            onComplaintCreated={handleComplaintCreated}
            onNavigate={navigate}
          />
        );
      case 'ai-analysis':
        return (
          <AIAnalysisPage
            complaint={selectedComplaint}
            complaints={activeComplaints}
            onSelectComplaint={(c) => setSelectedComplaint(c)}
            onUpdateComplaintAnalysis={(updated) => {
              setSelectedComplaint(updated);
              if (updated.isDemo) {
                setDemoComplaints((prev) =>
                  prev.map((item) => (item.complaintId === updated.complaintId ? updated : item))
                );
              }
            }}
            onNavigate={navigate}
          />
        );
      case 'civic-ripple':
        return (
          <CivicRipplePage
            complaint={selectedComplaint}
            complaints={activeComplaints}
            onSelectComplaint={(c) => setSelectedComplaint(c)}
            onNavigate={navigate}
          />
        );
      case 'track-complaint':
        return (
          <TrackComplaintPage
            user={user}
            demoMode={demoMode}
            complaints={activeComplaints}
            selectedComplaint={selectedComplaint}
            demoHistoryMap={demoHistoryMap}
            onSelectComplaint={(c, target) => {
              setSelectedComplaint(c);
              if (target) navigate(target);
            }}
            onNavigate={navigate}
          />
        );
      case 'fix-verify':
        return (
          <FixVerifyPage
            user={user}
            demoMode={demoMode}
            complaints={activeComplaints}
            selectedComplaint={selectedComplaint}
            demoVerifications={demoVerifications}
            onVerificationSaved={handleVerificationSaved}
            onNavigate={navigate}
          />
        );
      case 'admin-dashboard':
        return (
          <AdminDashboardPage
            user={user}
            demoMode={demoMode}
            complaints={activeComplaints}
            onDemoAdminUpdate={handleDemoAdminUpdate}
            onSelectComplaint={(c, target) => {
              setSelectedComplaint(c);
              navigate(target);
            }}
            onEnterDemoMode={handleEnterDemoMode}
          />
        );
      case 'analytics':
        return (
          <AnalyticsPage
            complaints={activeComplaints}
            demoMode={demoMode}
            onEnterDemoMode={handleEnterDemoMode}
          />
        );
    }
  };

  return (
    <PageShell
      pageId={currentPage}
      onNavigate={navigate}
      onBack={handleBack}
      canGoBack={historyStack.length > 1}
      user={user}
      demoMode={demoMode}
      onToggleDemoMode={handleToggleDemoMode}
      onLogout={handleLogout}
    >
      {firestoreError && !demoMode && (
        <div className="mb-6 rounded-xl bg-rose-500/15 border border-rose-400/30 p-4 flex items-start gap-3 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>Firestore sync notice: {firestoreError}</span>
        </div>
      )}
      {renderPage()}
    </PageShell>
  );
}
