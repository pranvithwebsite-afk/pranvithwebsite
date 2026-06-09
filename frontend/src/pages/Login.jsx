import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerAuth, formatApiErrorDetail } from '../auth/CustomerAuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useCustomerAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    navigate('/dashboard', { replace: true });
  }

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Welcome back!');
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setErr(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="bg-[#070314] text-white min-h-screen">
      <Header />
      <section className="pt-32 pb-24">
        <div className="max-w-md mx-auto px-6">
          <div className="rounded-[1.75rem] border border-violet-500/15 bg-[#0d0820]/80 p-8 shadow-[0_30px_80px_rgba(120,80,255,0.12)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/15 bg-violet-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-violet-300 mb-5">
              <LogIn size={14} /> Sign In
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-white/60">Sign in to access your downloads and order history.</p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4" data-testid="login-form">
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                testId="login-email-input"
                placeholder="you@example.com"
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                testId="login-password-input"
                placeholder="Your password"
              />

              {err && (
                <div data-testid="login-error" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                data-testid="login-submit-button"
                className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 transition text-white py-3 rounded-xl text-sm font-semibold"
              >
                {busy ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/60">
              New to PranvithDOP?{' '}
              <Link to="/register" className="text-violet-300 hover:text-white font-semibold" data-testid="login-go-register">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

const Field = ({ label, testId, ...rest }) => (
  <label className="block text-sm">
    <span className="block text-white/75 mb-1.5">{label}</span>
    <input
      data-testid={testId}
      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/35 focus:outline-none focus:border-violet-500/60"
      {...rest}
    />
  </label>
);

export default Login;
