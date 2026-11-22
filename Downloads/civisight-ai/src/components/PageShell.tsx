import React, { useState } from 'react';
import { ArrowLeft, LogOut, ShieldCheck, UserCircle2 } from 'lucide-react';
import { PAGE_BACKGROUNDS } from '../constants/backgrounds';
import type { PageId, UserProfile } from '../types/civic';

interface PageShellProps {
  pageId: PageId;
  onNavigate: (page: PageId) => void;
  onBack: () => void;
  canGoBack: boolean;
  user: UserProfile | null;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const PageShell: React.FC<PageShellProps> = ({
  pageId,
  onNavigate,
  onBack,
  canGoBack,
  user,
  demoMode,
  onToggleDemoMode,
  onLogout,
  children,
}) => {
  const [bgFailed, setBgFailed] = useState(false);
  const backdrop = PAGE_BACKGROUNDS[pageId];

  const handleBack = () => {
    if (canGoBack) {
      onBack();
    } else {
      onNavigate(user ? 'citizen-dashboard' : 'landing');
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex flex-col text-slate-100 overflow-x-hidden"
      style={{
        backgroundImage: bgFailed
          ? backdrop.fallbackGradient
          : `url(${backdrop.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Hidden preloader to detect broken asset and swap to gradient fallback */}
      <img
        src={backdrop.imageUrl}
        alt=""
        className="hidden"
        referrerPolicy="no-referrer"
        onError={() => setBgFailed(true)}
      />

      {/* Dark translucent readability overlay */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#040917]/80 via-[#050d21]/78 to-[#030712]/90"
      />

      {/* Top Navigation Bar (Clean 3-Zone Contract) */}
      <header className="relative z-30 border-b border-white/10 bg-[#040917]/75 backdrop-blur-xl">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-white hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            CIVISIGHT AI
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300"
          >
            <button
              type="button"
              onClick={() => onNavigate('citizen-dashboard')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                pageId === 'citizen-dashboard' ? 'text-cyan-300 border-b border-cyan-400' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('report-issue')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                pageId === 'report-issue' || pageId === 'ai-analysis' || pageId === 'civic-ripple'
                  ? 'text-cyan-300 border-b border-cyan-400'
                  : ''
              }`}
            >
              Report &amp; Ripple
            </button>
            <button
              type="button"
              onClick={() => onNavigate('track-complaint')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                pageId === 'track-complaint' ? 'text-cyan-300 border-b border-cyan-400' : ''
              }`}
            >
              Track
            </button>
            <button
              type="button"
              onClick={() => onNavigate('fix-verify')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                pageId === 'fix-verify' ? 'text-cyan-300 border-b border-cyan-400' : ''
              }`}
            >
              FixVerify AI
            </button>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                pageId === 'analytics' ? 'text-cyan-300 border-b border-cyan-400' : ''
              }`}
            >
              Analytics
            </button>
            {(user?.role === 'admin' || demoMode) && (
              <button
                type="button"
                onClick={() => onNavigate('admin-dashboard')}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
                  pageId === 'admin-dashboard' ? 'text-cyan-300 border-b border-cyan-400' : ''
                }`}
              >
                Admin
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Account / Action */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate(user.role === 'admin' ? 'admin-dashboard' : 'citizen-dashboard')}
                  className="hidden sm:inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {user.role === 'admin' ? (
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <UserCircle2 className="w-4 h-4 text-sky-400" />
                  )}
                  <span className="max-w-[140px] truncate">{user.name}</span>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="text-cyan-300 capitalize">{user.role}</span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(pageId === 'login' ? 'register' : 'login')}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {pageId === 'login' ? 'Create Account' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Secondary Context Bar: Back Button (on every page) + Mobile Nav + Demo Indicator */}
      <div className="relative z-20 border-b border-white/5 bg-[#060e24]/60 backdrop-blur-md">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {pageId === 'landing' ? 'Back to Top' : 'Back'}
            </button>

            <div className="lg:hidden flex items-center gap-3 overflow-x-auto text-xs text-slate-300">
              <button type="button" onClick={() => onNavigate('citizen-dashboard')} className="hover:text-white whitespace-nowrap">
                Dashboard
              </button>
              <span aria-hidden="true" className="text-slate-600">/</span>
              <button type="button" onClick={() => onNavigate('report-issue')} className="hover:text-white whitespace-nowrap">
                Report
              </button>
              <span aria-hidden="true" className="text-slate-600">/</span>
              <button type="button" onClick={() => onNavigate('track-complaint')} className="hover:text-white whitespace-nowrap">
                Track
              </button>
              <span aria-hidden="true" className="text-slate-600">/</span>
              <button type="button" onClick={() => onNavigate('fix-verify')} className="hover:text-white whitespace-nowrap">
                FixVerify
              </button>
              <span aria-hidden="true" className="text-slate-600">/</span>
              <button type="button" onClick={() => onNavigate('analytics')} className="hover:text-white whitespace-nowrap">
                Analytics
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {demoMode && (
              <span className="text-amber-300 font-medium whitespace-nowrap">
                DEMO DATA ACTIVE · Sample records clearly separated from live Firestore
              </span>
            )}
            <button
              type="button"
              onClick={onToggleDemoMode}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                demoMode
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-200 hover:bg-amber-500/30'
                  : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {demoMode ? 'Exit Demo Mode' : 'Demo Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Quiet Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#030712]/80 backdrop-blur-md">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span className="font-display font-semibold text-slate-200">CIVISIGHT AI</span>
            <span className="mx-2 text-slate-600">·</span>
            <span>See Beyond the Problem. Predict the Impact. Power the Change.</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => onNavigate('landing')} className="hover:text-slate-200 cursor-pointer">
              Overview
            </button>
            <button type="button" onClick={() => onNavigate('track-complaint')} className="hover:text-slate-200 cursor-pointer">
              Track Complaint
            </button>
            <button type="button" onClick={() => onNavigate('analytics')} className="hover:text-slate-200 cursor-pointer">
              Civic Analytics
            </button>
            <span className="text-slate-500">AI-assisted prioritization; not an official government dispatch link</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
