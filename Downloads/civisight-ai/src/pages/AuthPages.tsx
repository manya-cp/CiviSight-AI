import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { AlertCircle, ArrowRight, KeyRound, Mail, ShieldCheck, User } from 'lucide-react';
import { auth, googleProvider } from '../services/firebase';
import { BOOTSTRAPPED_ADMIN_EMAIL, getOrCreateUserProfile } from '../services/firestoreService';
import type { PageId, UserProfile } from '../types/civic';

interface AuthPagesProps {
  mode: 'login' | 'register';
  onNavigate: (page: PageId) => void;
  onAuthSuccess: (profile: UserProfile) => void;
  onEnterDemoMode: () => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({
  mode,
  onNavigate,
  onAuthSuccess,
  onEnterDemoMode,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setError(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const profile = await getOrCreateUserProfile(
        cred.user.uid,
        cred.user.displayName || name || 'Civic Member',
        cred.user.email || ''
      );
      onAuthSuccess(profile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (msg.includes('popup-closed-by-user')) {
        setError('Sign-in popup was closed before completing authentication.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Please enter your full name to register.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await sendEmailVerification(cred.user);
        if (!cred.user.emailVerified) {
          setInfoMsg(
            'Account created. Please verify your email address via the link sent to your inbox, or use Google Sign-In for instant verified access.'
          );
          return;
        }
        const profile = await getOrCreateUserProfile(cred.user.uid, name.trim(), cred.user.email || email.trim());
        onAuthSuccess(profile);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!cred.user.emailVerified) {
          setInfoMsg(
            'Your email address is not verified yet. Please check your inbox or sign in with Google for verified access.'
          );
          return;
        }
        const profile = await getOrCreateUserProfile(
          cred.user.uid,
          cred.user.displayName || 'Citizen User',
          cred.user.email || email.trim()
        );
        onAuthSuccess(profile);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.includes('operation-not-allowed')) {
        setError(
          'Email/Password sign-in is not yet enabled in this Firebase Console project. Use Google Sign-In above, or enable Email/Password under Firebase Console > Authentication > Sign-in method.'
        );
      } else if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setError('Invalid email or password. Please verify your credentials.');
      } else if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Switch to Login instead.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-14rem)] flex items-center justify-center py-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Context Column */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-medium text-cyan-300">
              Firebase Authentication · Role-Based Access
            </p>
            <h1 className="font-display text-3xl font-bold text-white leading-tight">
              {mode === 'login' ? 'Access Your Civic Intelligence Workspace' : 'Join CIVISIGHT AI'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {mode === 'login'
                ? 'Sign in with Firebase Authentication to submit infrastructure reports, run Gemini Vision inspections, and track resolution progress in real time.'
                : 'Register an account to report neighborhood infrastructure issues, inspect transparent Civic Ripple Scores, and verify completed repairs.'}
            </p>
          </div>

          <div className="space-y-4 border-t border-white/10 pt-5 text-xs text-slate-300">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white">Verified Role Enforcement</div>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  New registrations are provisioned securely as Citizens. Administrator privileges
                  are granted to the authorized municipal account ({BOOTSTRAPPED_ADMIN_EMAIL}) and
                  verified admin registry entries.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onEnterDemoMode}
                className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-medium cursor-pointer"
              >
                Explore Demonstration Mode (Sample Data)
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Authentication Form */}
        <div className="lg:col-span-7 glass-panel-elevated rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                {mode === 'login' ? 'Sign In' : 'Create Citizen Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Recommended: instant verified authentication with Google
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  mode === 'login' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  mode === 'register' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-400/30 p-4 flex items-start gap-3 text-sm text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMsg && (
            <div className="rounded-xl bg-sky-500/15 border border-sky-400/30 p-4 text-sm text-sky-100">
              {infoMsg}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleAuth}
            className="w-full py-3.5 px-4 rounded-xl bg-white text-slate-950 hover:bg-slate-100 disabled:opacity-60 font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            {loading ? 'Authenticating...' : 'Continue with Google (Verified Firebase Auth)'}
          </button>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex-1 h-px bg-white/10" />
            <span>or use email &amp; password</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Rivera"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@city.gov"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              {loading
                ? 'Processing...'
                : mode === 'login'
                  ? 'Sign In with Email'
                  : 'Create Citizen Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
