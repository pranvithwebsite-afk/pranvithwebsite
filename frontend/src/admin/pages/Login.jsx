import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../AdminAuthContext';

const Login = () => {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError('Invalid login credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
        <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/95 p-10 shadow-2xl shadow-slate-950/40">
          <div className="mb-8 space-y-2 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Admin Panel</p>
            <h1 className="text-3xl font-semibold text-white">Sign in to your CMS account</h1>
            <p className="text-sm text-slate-400">Use the seeded admin user or your admin credentials to access the dashboard.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm text-slate-200">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-violet-500"
                placeholder="admin@bbedits.com"
                required
              />
            </label>
            <label className="block space-y-2 text-sm text-slate-200">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-violet-500"
                placeholder="Enter password"
                required
              />
            </label>
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in …' : 'Sign In'}
            </button>
          </form>
          <div className="mt-6 rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-400">
            <p className="font-medium text-slate-200">Default seeded admin</p>
            <p>Email: <span className="text-white">admin@bbedits.com</span></p>
            <p>Password: <span className="text-white">Admin123!</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
