import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from '../AdminAuthContext';
import { formatApiErrorDetail } from '../../lib/api';

const getLoginErrorMessage = (err) => {
  const status = err?.response?.status;
  // FastAPI's API exception handler returns string failures in `message`.
  // Prefer it before `detail` so configuration and connection failures are
  // actionable instead of being replaced by a generic client-side message.
  const backendMessage = formatApiErrorDetail(
    err?.response?.data?.message ?? err?.response?.data?.detail
  );

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
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      const backendMessage = formatApiErrorDetail(
        err?.response?.data?.message ?? err?.response?.data?.detail
      ) || err?.message || 'Unknown login error';
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-12">
        <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl shadow-slate-950/40 sm:p-10">
          <div className="mb-8 space-y-2 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Admin Panel</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Sign in to your CMS account</h1>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-400">Use the seeded admin user or your admin credentials to access the dashboard.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm text-slate-200">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-violet-500"
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
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 pr-12 text-white outline-none transition focus:border-violet-500"
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
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-6 rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-400">
            <p className="font-medium text-slate-200">Admin access</p>
            <p>Use the seeded admin account configured for this deployment.</p>
            <p>If you need access, ask your site administrator to provide the current admin credentials.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
