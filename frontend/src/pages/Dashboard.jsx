import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  Download,
  Package,
  ShoppingBag,
  Settings as SettingsIcon,
  LogOut,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  customerMyDownloads,
  customerMyOrders,
  customerChangePassword,
} from '../lib/api';
import { useCustomerAuth, formatApiErrorDetail } from '../auth/CustomerAuthContext';

const TABS = [
  { id: 'downloads', label: 'My Downloads', icon: Download },
  { id: 'orders', label: 'My Orders', icon: ShoppingBag },
  { id: 'settings', label: 'Account', icon: SettingsIcon },
];

const Dashboard = () => {
  const { user, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('downloads');
  const [downloads, setDownloads] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, o] = await Promise.all([customerMyDownloads(), customerMyOrders()]);
        setDownloads(d || []);
        setOrders(o || []);
      } catch (e) {
        toast.error('Could not load your data. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalSpend = useMemo(
    () =>
      (orders || [])
        .filter((o) => o.status === 'paid' && o.source !== 'free_claim')
        .reduce((s, o) => s + Math.round((o.amount || 0) / 100), 0),
    [orders]
  );

  return (
    <main className="bg-[#070314] text-white min-h-screen">
      <Header />

      <section className="pt-28 pb-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="rounded-[1.75rem] border border-violet-500/15 bg-gradient-to-r from-[#150b2c] via-[#0c0720] to-[#0a0518] px-8 py-7">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">My Account</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight" data-testid="dashboard-welcome">
              Welcome back, {user?.name || 'creator'}
            </h1>
            <p className="mt-1 text-sm text-white/60">{user?.email}</p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat label="Downloads" value={downloads.length} testId="stat-downloads" />
              <Stat label="Orders" value={orders.length} testId="stat-orders" />
              <Stat label="Total spend" value={`₹${totalSpend.toLocaleString('en-IN')}`} testId="stat-spend" />
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          <aside className="lg:sticky lg:top-28 h-fit rounded-2xl bg-[#0d0820]/60 border border-violet-500/15 p-3">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  data-testid={`dashboard-tab-${t.id}`}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    active ? 'bg-violet-600/20 text-white' : 'text-white/70 hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} /> {t.label}
                </button>
              );
            })}
            <button
              onClick={async () => {
                await logout();
                toast.success('Signed out');
                navigate('/');
              }}
              data-testid="dashboard-logout"
              className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-500/10 transition"
            >
              <LogOut size={16} /> Sign out
            </button>
          </aside>

          <div className="min-h-[400px]">
            {loading ? (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Loader2 size={14} className="animate-spin" /> Loading...
              </div>
            ) : tab === 'downloads' ? (
              <DownloadsTab items={downloads} />
            ) : tab === 'orders' ? (
              <OrdersTab items={orders} />
            ) : (
              <SettingsTab />
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

const Stat = ({ label, value, testId }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
    <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">{label}</p>
    <p className="mt-1 text-xl font-bold text-white" data-testid={testId}>{value}</p>
  </div>
);

const DownloadsTab = ({ items }) => {
  if (!items.length) {
    return (
      <EmptyState
        icon={Package}
        title="No downloads yet"
        subtitle="Once you grab an asset (free or paid), it will appear here."
        cta={{ label: 'Browse assets', to: '/assets', testId: 'empty-downloads-browse' }}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="downloads-grid">
      {items.map((p) => (
        <div key={p.id || p.slug} className="rounded-2xl border border-white/10 bg-[#0d0820]/80 overflow-hidden group">
          <div className="aspect-video bg-[#0a0518] relative">
            {p.hero_image || (p.images && p.images[0]) ? (
              <img src={p.hero_image || p.images[0]} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="p-5">
            <h3 className="text-base font-semibold text-white">{p.name}</h3>
            <p className="mt-1 text-xs text-white/55">{p.category}</p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href={p.download_file || '#'}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`download-btn-${p.slug}`}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                <Download size={14} /> Download
              </a>
              <Link
                to={`/assets/${p.slug}`}
                className="text-sm text-white/60 hover:text-white px-3 py-2"
                data-testid={`view-asset-${p.slug}`}
              >
                View asset
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const OrdersTab = ({ items }) => {
  if (!items.length) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="No orders yet"
        subtitle="Your purchase history will show up here."
        cta={{ label: 'Browse assets', to: '/assets', testId: 'empty-orders-browse' }}
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10" data-testid="orders-table">
      <table className="min-w-full text-left text-sm text-white/80">
        <thead className="bg-[#0a0518] text-white/65 text-[11px] uppercase tracking-[0.2em]">
          <tr>
            <th className="px-5 py-3">Product</th>
            <th className="px-5 py-3">Amount</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id} className="border-t border-white/10 bg-[#0d0820]/80">
              <td className="px-5 py-4 font-medium">{o.product_name || o.product_slug}</td>
              <td className="px-5 py-4">₹{Math.round((o.amount || 0) / 100).toLocaleString('en-IN')}</td>
              <td className="px-5 py-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${
                    o.status === 'paid'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : o.status === 'pending'
                      ? 'bg-amber-500/15 text-amber-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {o.status === 'paid' && <CheckCircle2 size={12} />}
                  {o.status}
                </span>
              </td>
              <td className="px-5 py-4 text-white/65">
                {o.verified_at || o.created_at
                  ? new Date(o.verified_at || o.created_at).toLocaleString('en-IN')
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SettingsTab = () => {
  const { user } = useCustomerAuth();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await customerChangePassword({ current_password: cur, new_password: pw });
      toast.success('Password updated');
      setCur('');
      setPw('');
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || 'Could not update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-2xl border border-white/10 bg-[#0d0820]/80 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-white/45 mb-3">Profile</p>
        <p className="text-base text-white font-semibold">{user?.name}</p>
        <p className="text-sm text-white/65">{user?.email}</p>
      </div>
      <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-[#0d0820]/80 p-6 space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-white/45">Change password</p>
        <label className="block text-sm">
          <span className="block text-white/75 mb-1.5">Current password</span>
          <input
            type="password"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            required
            data-testid="settings-current-password"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/60"
          />
        </label>
        <label className="block text-sm">
          <span className="block text-white/75 mb-1.5">New password</span>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            minLength={6}
            data-testid="settings-new-password"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/60"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          data-testid="settings-update-password"
          className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 transition text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
        >
          {busy ? <><Loader2 size={14} className="animate-spin" /> Updating...</> : 'Update password'}
        </button>
      </form>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, subtitle, cta }) => (
  <div className="rounded-2xl border border-white/10 bg-[#0d0820]/80 p-12 text-center" data-testid="dashboard-empty-state">
    <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-300 flex items-center justify-center mb-5">
      <Icon size={22} />
    </div>
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="mt-2 text-sm text-white/60 max-w-md mx-auto">{subtitle}</p>
    {cta && (
      <Link
        to={cta.to}
        data-testid={cta.testId}
        className="mt-6 inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 transition text-white px-5 py-2.5 rounded-full text-sm font-semibold"
      >
        {cta.label}
      </Link>
    )}
  </div>
);

export default Dashboard;
