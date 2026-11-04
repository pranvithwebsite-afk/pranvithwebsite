import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Share, Smartphone, PlusSquare, Check } from 'lucide-react';
import { useAdminAuth } from '../AdminAuthContext';
import { formatApiErrorDetail } from '../../lib/api';

const getLoginErrorMessage = (err) => {
  const status = err?.response?.status;
  const backendMessage = formatApiErrorDetail(err?.response?.data?.detail);

  if (status === 401 || status === 403) {
    return 'Incorrect email or password';
  }

  if (err?.response) {
    return backendMessage || `Login failed with status ${status}`;
  }

  if (err?.request) {
    return 'Cannot connect to the login service. Check your connection and try again.';
  }

  return err?.message || 'Unable to sign in. Please try again.';
};

const Login = () => {
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  const from = location.state?.from?.pathname || '/admin/dashboard';

  // If already authenticated (e.g. from persistent session), redirect immediately to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const isIosDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent || '';
    const isIos = /iPhone|iPad|iPod/.test(ua);
    const isStandalone = window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
    return isIos && !isStandalone;
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      const backendMessage = formatApiErrorDetail(err?.response?.data?.detail) || err?.message || 'Unknown login error';
      console.warn('Admin login failed', {
        requestEmail: email,
        status: err?.response?.status || null,
        errorMessage: backendMessage,
      });
      setError(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl shadow-slate-950/40 sm:p-10">
          <div className="mb-6 space-y-3 text-center">
            {/* Custom Pranvith Admin PWA Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-violet-500/30 bg-slate-950 shadow-xl shadow-violet-500/20">
              <img
                src="/admin-icon-192.png"
                alt="Pranvith Admin Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-violet-400 font-semibold">Admin Panel</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Pranvith DOP Dashboard</h1>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-400">
              Sign in with your admin credentials to manage assets, courses, orders, and CMS content.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm text-slate-200">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-violet-500 text-sm"
                placeholder="admin@pranvithdop.com"
                required
              />
            </label>
            <label className="block space-y-2 text-sm text-slate-200">
              <span>Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 pr-12 text-white outline-none transition focus:border-violet-500 text-sm"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            {error && <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* iPhone Installation Guide / Banner */}
          {isIosDevice && (
            <div className="mt-6 rounded-2xl border border-violet-500/30 bg-violet-950/20 p-4">
              <button
                type="button"
                onClick={() => setShowIosGuide((v) => !v)}
                className="flex w-full items-center justify-between text-left text-xs font-semibold text-violet-300 hover:text-white transition"
              >
                <span className="flex items-center gap-2">
                  <Smartphone size={15} className="text-violet-400" />
                  <span>Install as iPhone App</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-violet-400 underline">
                  {showIosGuide ? 'Hide' : 'How to install'}
                </span>
              </button>
              {showIosGuide && (
                <div className="mt-3 space-y-2 border-t border-violet-500/20 pt-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600/40 text-[10px] font-bold text-white">1</span>
                    <p>In Safari, tap the <strong className="text-white">Share</strong> button <Share size={12} className="inline mx-0.5 text-blue-400" /> at the bottom of the screen.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600/40 text-[10px] font-bold text-white">2</span>
                    <p>Scroll down and tap <strong className="text-white">Add to Home Screen</strong> <PlusSquare size={12} className="inline mx-0.5 text-slate-200" />.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600/40 text-[10px] font-bold text-white">3</span>
                    <p>Tap <strong className="text-white">Add</strong> in the top-right corner. The <strong>Pranvith Admin</strong> app icon is now on your home screen!</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 p-3.5 text-xs text-slate-400 text-center">
            <p>Admin sessions stay securely saved on your device.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
