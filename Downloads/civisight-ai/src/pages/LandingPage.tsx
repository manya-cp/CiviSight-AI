import React from 'react';
import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  Compass,
  Eye,
  Layers,
  MapPin,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { CivicComplaint, PageId, UserProfile } from '../types/civic';

interface LandingPageProps {
  onNavigate: (page: PageId) => void;
  user: UserProfile | null;
  demoMode: boolean;
  onEnterDemoMode: () => void;
  complaints: CivicComplaint[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  user,
  demoMode,
  onEnterDemoMode,
  complaints,
}) => {
  const activeCount = complaints.length;
  const criticalCount = complaints.filter((c) => c.severity === 'Critical' || c.severity === 'High').length;
  const verifiedCount = complaints.filter((c) => c.status === 'Verified' || c.status === 'Resolved').length;

  return (
    <div className="space-y-20 pb-12">
      {/* Hero Section */}
      <section className="pt-8 sm:pt-14 pb-6 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <p className="text-xs sm:text-sm font-medium tracking-wide text-cyan-300">
            CIVISIGHT AI · See Beyond the Problem. Predict the Impact. Power the Change.
          </p>
          <h1
            className="font-display font-bold tracking-tight text-white leading-[1.08] max-w-2xl"
            style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)', textWrap: 'balance' }}
          >
            Building Safer Cities Through Intelligent Civic Action.
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            An AI-powered platform that transforms everyday infrastructure complaints into
            actionable civic intelligence—evaluating community ripple effects, guiding municipal
            dispatch, and verifying completed repairs visually.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate(user || demoMode ? 'report-issue' : 'login')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-sky-500/25"
            >
              Report an Issue
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('civic-ripple')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explore Intelligence
              <Compass className="w-4 h-4 text-cyan-300" />
            </button>

            {!demoMode && (
              <button
                type="button"
                onClick={onEnterDemoMode}
                className="text-sm font-medium text-amber-300 hover:text-amber-200 underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer px-2 py-2"
              >
                Explore Demo Dataset
              </button>
            )}
          </div>
        </div>

        {/* Right Hero Intelligence Preview Card */}
        <div className="lg:col-span-5">
          <div className="glass-panel-elevated rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Civic Ripple Intelligence Model</span>
              <span className="font-mono text-cyan-300">4-Dimension Weighted</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-slate-400">Infrastructure Impact</div>
                <div className="mt-1 text-2xl font-display font-bold text-white tabular-nums">30%</div>
                <div className="text-xs text-slate-400 mt-1">Structural &amp; utility load</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-slate-400">Public Safety Impact</div>
                <div className="mt-1 text-2xl font-display font-bold text-cyan-300 tabular-nums">30%</div>
                <div className="text-xs text-slate-400 mt-1">Hazard &amp; sensitive sites</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-slate-400">Environmental Impact</div>
                <div className="mt-1 text-2xl font-display font-bold text-emerald-300 tabular-nums">20%</div>
                <div className="text-xs text-slate-400 mt-1">Water, waste &amp; drainage</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-xs text-slate-400">Community Disruption</div>
                <div className="mt-1 text-2xl font-display font-bold text-violet-300 tabular-nums">20%</div>
                <div className="text-xs text-slate-400 mt-1">Corridor &amp; transit flow</div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
              <span>Includes FixVerify AI visual closure</span>
              <button
                type="button"
                onClick={() => onNavigate('fix-verify')}
                className="text-cyan-300 hover:text-cyan-200 font-medium cursor-pointer"
              >
                Open FixVerify →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Statistics (Grounded strictly in active Live or Demo store) */}
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Platform Record Summary</h2>
            <p className="text-xs text-slate-400">
              {demoMode
                ? 'Showing sample records from DEMO DATA mode. Sign in to view your live Firestore database.'
                : user
                  ? 'Live counts computed directly from your authenticated Cloud Firestore records.'
                  : 'Sign in with Firebase Auth or enable Demo Mode to inspect live and sample civic records.'}
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-300">
            {demoMode ? 'SOURCE: DEMO DATA' : user ? 'SOURCE: LIVE FIRESTORE' : 'SOURCE: STANDBY'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="border-t border-white/10 pt-4">
            <div className="text-xs text-slate-400">Tracked Civic Reports</div>
            <div className="mt-1 text-3xl font-display font-bold text-white tabular-nums">{activeCount}</div>
          </div>
          <div className="border-t border-white/10 pt-4">
            <div className="text-xs text-slate-400">High &amp; Critical Priority</div>
            <div className="mt-1 text-3xl font-display font-bold text-amber-300 tabular-nums">{criticalCount}</div>
          </div>
          <div className="border-t border-white/10 pt-4">
            <div className="text-xs text-slate-400">Resolved or FixVerify Checked</div>
            <div className="mt-1 text-3xl font-display font-bold text-emerald-300 tabular-nums">{verifiedCount}</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">How CIVISIGHT AI Works</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300">
            Four transparent steps from a citizen smartphone photograph to AI-verified civic closure.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              step: '01. Capture & Locate',
              title: 'Report with Context',
              desc: 'Upload a street photo, pin coordinates on OpenStreetMap, and list nearby schools, clinics, or transit stops.',
              icon: Camera,
            },
            {
              step: '02. Gemini Vision',
              title: 'Inspect & Classify',
              desc: 'Gemini Vision identifies visible damage, estimates severity, and documents confidence and image limitations.',
              icon: Eye,
            },
            {
              step: '03. Civic Ripple',
              title: 'Predict Community Impact',
              desc: 'Rule-based scoring weighs Infrastructure, Public Safety, Environment, and Community Disruption from 0 to 100.',
              icon: Activity,
            },
            {
              step: '04. FixVerify AI',
              title: 'Verify Repairs Visually',
              desc: 'Compare before-and-after repair photos to assess visible changes and keep citizens informed transparently.',
              icon: CheckCircle2,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="glass-panel rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between text-xs text-cyan-300 font-medium">
                  <span>{item.step}</span>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dual Signature Innovations: Civic Ripple Intelligence & FixVerify AI */}
      <section className="grid lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 glass-panel-elevated rounded-2xl p-7 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
              <Layers className="w-4 h-4" />
              <span>Core Innovation · Civic Ripple Intelligence</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Prioritize by Community Consequence, Not Just Complaint Order.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              A ruptured water main outside an urgent care clinic carries far greater civic risk than
              minor curb wear on a quiet alley. Civic Ripple Intelligence combines visual observations
              with user-supplied sensitive landmarks using transparent weighted rules—flagging clearly
              when location context is limited.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('civic-ripple')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Inspect Ripple Model
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="text-sm text-slate-300 hover:text-white cursor-pointer"
            >
              View Civic Analytics →
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 glass-panel rounded-2xl p-7 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-violet-300">
              <Sparkles className="w-4 h-4" />
              <span>Signature Verification · FixVerify AI</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              Close the Loop with Visual Before &amp; After Evidence.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              When maintenance crews mark an issue resolved, citizens or administrators upload an
              after-repair photograph. Gemini Vision highlights visible differences and classifies the
              site as Appears Resolved, Partially Resolved, Appears Unresolved, or Unable to
              Determine—always framed transparently as AI-assisted visual verification.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => onNavigate('fix-verify')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Launch FixVerify AI
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* AI Capabilities Overview */}
      <section className="glass-panel rounded-2xl p-7 sm:p-8 space-y-6">
        <h2 className="font-display text-2xl font-bold text-white">Municipal Capabilities</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-300 text-sm font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>Evidence-Grounded Vision</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Structured JSON extraction strictly bound to visible street conditions with explicit
              uncertainty explanations.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold">
              <MapPin className="w-4 h-4" />
              <span>OpenStreetMap Geospatial Triage</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Pinpoint exact coordinates during submission and inspect severity clusters across city
              corridors with Leaflet.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Role-Enforced Command Centre</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Firestore security rules isolate PII and enforce administrator authorization for
              department dispatch and lifecycle updates.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
