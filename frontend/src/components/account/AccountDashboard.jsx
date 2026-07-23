import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Download, FileText, User, LogOut,
  Search, ChevronDown, Calendar, ArrowUpDown, Eye, Loader2, Package,
  Clock, CheckCircle, XCircle, AlertCircle, Banknote, CreditCard,
  Smartphone, Hash, DownloadCloud, ExternalLink, ChevronLeft,
  TrendingUp, DollarSign, ShoppingCart
} from 'lucide-react';
import { useCustomerAuth } from './CustomerAuthContext';
import GoogleSignIn from './GoogleSignIn';
import { customerApi } from '../../lib/api';
import { toast } from 'sonner';

const money = (amount = 0) => `₹${(Number(amount) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AccountDashboard() {
  const { isAuthenticated, customer, loading, login, logout } = useCustomerAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={login} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[var(--bg-base)] px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {sidebarOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
        <span className="font-semibold text-white">
          {navItems.find(n => n.id === activeSection)?.label || 'Account'}
        </span>
        <div className="h-8 w-8 rounded-full bg-violet-600/30" />
      </div>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/10 bg-[var(--bg-base)] pt-6 transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex flex-col h-full">
            <div className="px-5 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-lg font-bold text-white">
                  {customer?.name?.[0] || 'C'}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{customer?.name || 'Customer'}</p>
                  <p className="truncate text-xs text-white/50">{customer?.email || ''}</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 px-3">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveSection(item.id); closeSidebar(); }}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-violet-600/20 text-violet-200'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-white/10 px-3 py-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pt-10">
          {activeSection === 'dashboard' && <DashboardView customer={customer} />}
          {activeSection === 'orders' && <OrdersView />}
          {activeSection === 'downloads' && <DownloadsView />}
          {activeSection === 'invoices' && <InvoicesView />}
          {activeSection === 'profile' && <ProfileView customer={customer} />}
        </main>
      </div>
    </div>
  );
}

// ── Login View ──────────────────────────────────────────────────────────────

function LoginView({ onLogin }) {
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleGoogleSuccess = async (credential) => {
    setLoggingIn(true);
    setError('');
    try {
      const res = await customerApi.post('/account/auth/google', { credential });
      const { access_token, customer: customerData } = res.data;
      onLogin(access_token, customerData);
      toast.success('Signed in successfully!');
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Google sign-in failed');
      toast.error('Sign-in failed');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-[var(--bg-card)] p-8 shadow-2xl shadow-violet-900/10">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20">
              <User className="h-7 w-7 text-violet-300" />
            </div>
            <h1 className="mt-4 text-2xl font-black text-white">My Account</h1>
            <p className="mt-2 text-sm text-white/50">
              Sign in to access your purchases, downloads, and invoices.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {loggingIn ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-violet-600/20 py-3 text-violet-200">
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in...
              </div>
            ) : (
              <GoogleSignIn
                onSuccess={handleGoogleSuccess}
                onError={(err) => setError(err?.message || 'Google sign-in failed')}
              />
            )}
          </div>

          <p className="mt-6 text-center text-xs text-white/30">
            By signing in, you agree to our{' '}
            <a href="/privacy" className="text-violet-400 underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard View ──────────────────────────────────────────────────────────

function DashboardView({ customer }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    customerApi.get('/account/dashboard')
      .then(res => setData(res.data))
      .catch(() => toast.error('Could not load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCards count={4} />;

  const stats = [
    { label: 'Purchased Assets', value: data?.purchased_assets || 0, icon: Package, color: 'from-violet-600 to-indigo-600' },
    { label: 'Total Orders', value: data?.total_orders || 0, icon: ShoppingCart, color: 'from-emerald-600 to-teal-600' },
    { label: 'Total Downloads', value: data?.total_downloads || 0, icon: DownloadCloud, color: 'from-sky-600 to-blue-600' },
    { label: 'Total Spent', value: money(data?.total_spent || 0), icon: DollarSign, color: 'from-amber-600 to-orange-600' },
  ];

  return (
    <div>
      <div className="mb-1">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Dashboard</p>
        <h1 className="mt-2 text-3xl font-black text-white">
          Welcome back, {customer?.name?.split(' ')[0] || 'there'}
        </h1>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5 transition hover:border-violet-500/30">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-[0.03]`} />
              <div className="relative">
                <div className={`inline-flex rounded-xl bg-gradient-to-br ${s.color} p-2.5 text-white shadow-lg`}>
                  <Icon size={20} />
                </div>
                <p className="mt-4 text-2xl font-black text-white">{s.value}</p>
                <p className="mt-1 text-sm text-white/50">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-white">Recent Orders</h2>
        <div className="mt-4 space-y-3">
          {(data?.recent_orders || []).length > 0 ? (
            data.recent_orders.slice(0, 5).map(order => (
              <OrderRow key={order.id} order={order} />
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)] p-6 text-center text-white/40">
              No orders yet. Browse our <a href="/assets" className="text-violet-400 underline">assets</a> to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Orders View ─────────────────────────────────────────────────────────────

function OrdersView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadOrders = React.useCallback(async (query = '') => {
    setLoading(true);
    try {
      const res = await customerApi.get('/account/orders', { params: { search: query, per_page: 50 } });
      setOrders(res.data?.items || []);
    } catch {
      toast.error('Could not load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadOrders(search);
  };

  const viewOrder = async (orderId) => {
    setDetailLoading(true);
    setSelectedOrder(orderId);
    try {
      const res = await customerApi.get(`/account/orders/${orderId}`);
      setOrderDetail(res.data);
    } catch {
      toast.error('Could not load order details');
      setSelectedOrder(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const res = await customerApi.post(`/account/orders/${orderId}/invoice`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      toast.error('Could not generate invoice');
    }
  };

  const handleDownload = async (orderId) => {
    try {
      const res = await customerApi.post(`/account/orders/${orderId}/download-link`);
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      } else if (res.data?.signed_url) {
        window.open(res.data.signed_url, '_blank');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Download unavailable');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    const days = Number(filter);
    if (!days) return true;
    const d = new Date(o.paid_at || o.created_at);
    return (Date.now() - d.getTime()) < days * 86400000;
  });

  if (selectedOrder && orderDetail) {
    return (
      <OrderDetailView
        order={orderDetail?.order}
        product={orderDetail?.product}
        downloadHistory={orderDetail?.download_history}
        onBack={() => { setSelectedOrder(null); setOrderDetail(null); }}
        onDownload={() => handleDownload(orderDetail?.order?.id)}
        onInvoice={() => downloadInvoice(orderDetail?.order?.id)}
        loading={detailLoading}
      />
    );
  }

  return (
    <div>
      <div className="mb-1">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Orders</p>
        <h1 className="mt-2 text-3xl font-black text-white">My Orders</h1>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product, order ID, payment ID..."
            className="w-full rounded-xl border border-white/10 bg-[var(--bg-card)] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-500"
          />
        </form>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-[var(--bg-card)] px-4 py-2.5 text-sm text-white outline-none focus:border-violet-500"
        >
          <option value="all">All time</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <LoadingCards count={3} />
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <div
              key={order.id}
              className="group cursor-pointer rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5 transition hover:border-violet-500/30"
              onClick={() => viewOrder(order.id)}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  {order.product_image ? (
                    <img
                      src={order.product_image}
                      alt={order.product_name}
                      className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-violet-600/20">
                      <Package className="h-6 w-6 text-violet-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{order.product_name}</p>
                    <p className="mt-1 text-sm text-white/50">
                      {formatDate(order.paid_at || order.created_at)} · {money(order.amount)}
                    </p>
                    <p className="mt-0.5 text-xs text-white/40">
                      Order: {order.razorpay_order_id || order.id?.slice(0, 12)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-shrink-0">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
                    <CheckCircle size={12} />
                    Paid
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(order.id); }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <ChevronRightIcon />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)] p-8 text-center">
            <Package className="mx-auto h-10 w-10 text-white/20" />
            <p className="mt-3 text-white/50">No paid orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order Detail View ───────────────────────────────────────────────────────

function OrderDetailView({ order, product, downloadHistory, onBack, onDownload, onInvoice, loading }) {
  if (loading || !order) return <LoadingCards count={1} />;

  return (
    <div>
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-1.5 text-sm text-violet-400 transition hover:text-violet-300">
        <ChevronLeft size={16} />
        Back to orders
      </button>

      <div className="mb-1">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Order Details</p>
        <h1 className="mt-2 text-2xl font-black text-white">{order.product_name}</h1>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Product Information */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Package size={16} className="text-violet-400" />
            Product
          </h3>
          {product?.image && (
            <img src={product.image} alt={product.name} className="mb-3 h-32 w-full rounded-xl object-cover" />
          )}
          <InfoRow label="Name" value={product?.name || order.product_name} />
          <InfoRow label="Slug" value={product?.slug || order.product_slug || '—'} />
          {order.product_version && <InfoRow label="Version" value={order.product_version} />}
        </div>

        {/* Payment Information */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Banknote size={16} className="text-violet-400" />
            Payment
          </h3>
          <InfoRow label="Amount" value={money(order.amount)} />
          <InfoRow label="Payment ID" value={order.razorpay_payment_id || '—'} />
          <InfoRow label="Order ID" value={order.razorpay_order_id || '—'} />
          <InfoRow label="Status" value={order.payment_status} />
          <InfoRow label="Date" value={formatDate(order.paid_at)} />
        </div>

        {/* Customer Information */}
        <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <User size={16} className="text-violet-400" />
            Customer
          </h3>
          <InfoRow label="Name" value={order.customer_name || '—'} />
          <InfoRow label="Email" value={order.customer_email || '—'} />
          <InfoRow label="Phone" value={order.customer_phone || '—'} />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onDownload} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 font-semibold text-white transition hover:bg-violet-500">
          <Download size={17} />
          Download Now
        </button>
        <button onClick={onInvoice} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[var(--bg-card)] px-5 py-2.5 font-semibold text-white transition hover:border-violet-500/30">
          <FileText size={17} />
          View Invoice
        </button>
      </div>

      {/* Download History */}
      {downloadHistory?.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-white">Download History</h3>
          <div className="space-y-2">
            {downloadHistory.map((dl, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-[var(--bg-card)] px-4 py-2.5">
                <DownloadCloud size={14} className="text-white/30" />
                <span className="text-sm text-white/60">{formatDate(dl.downloaded_at)}</span>
                {dl.ip_address && <span className="text-xs text-white/30">{dl.ip_address}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Downloads View ──────────────────────────────────────────────────────────

function DownloadsView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    customerApi.get('/account/downloads')
      .then(res => setItems(res.data?.items || []))
      .catch(() => toast.error('Could not load downloads'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (orderId) => {
    try {
      const res = await customerApi.post(`/account/orders/${orderId}/download-link`);
      if (res.data?.url) window.open(res.data.url, '_blank');
      else if (res.data?.signed_url) window.open(res.data.signed_url, '_blank');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Download unavailable');
    }
  };

  if (loading) return <LoadingCards count={3} />;

  return (
    <div>
      <div className="mb-1">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Downloads</p>
        <h1 className="mt-2 text-3xl font-black text-white">My Downloads</h1>
        <p className="mt-2 text-sm text-white/50">Only purchased and paid assets are available for download.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.length > 0 ? items.map(item => (
          <div key={item.order_id} className="group rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5 transition hover:border-violet-500/30">
            {item.product_image ? (
              <img src={item.product_image} alt={item.product_name} className="h-40 w-full rounded-xl object-cover" />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-xl bg-violet-600/10">
                <Package className="h-10 w-10 text-violet-300/50" />
              </div>
            )}
            <div className="mt-4">
              <h3 className="font-semibold text-white">{item.product_name}</h3>
              <p className="mt-1 text-xs text-white/40">
                Version: {item.latest_version || '1.0'} · {formatDate(item.paid_at)}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-white/40">
                <span>{item.download_count} downloads</span>
                {item.last_downloaded_at && <span>Last: {formatDate(item.last_downloaded_at)}</span>}
              </div>
              <button
                onClick={() => handleDownload(item.order_id)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full rounded-2xl border border-white/10 bg-[var(--bg-card)] p-8 text-center sm:col-span-2 xl:col-span-3">
            <DownloadCloud className="mx-auto h-10 w-10 text-white/20" />
            <p className="mt-3 text-white/50">No downloads available yet. Purchased assets will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Invoices View ───────────────────────────────────────────────────────────

function InvoicesView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    customerApi.get('/account/orders', { params: { per_page: 50 } })
      .then(res => setOrders(res.data?.items || []))
      .catch(() => toast.error('Could not load orders'))
      .finally(() => setLoading(false));
  }, []);

  const downloadInvoice = async (orderId) => {
    try {
      const res = await customerApi.post(`/account/orders/${orderId}/invoice`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      toast.error('Could not generate invoice');
    }
  };

  if (loading) return <LoadingCards count={3} />;

  return (
    <div>
      <div className="mb-1">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Invoices</p>
        <h1 className="mt-2 text-3xl font-black text-white">Invoices</h1>
      </div>

      <div className="mt-6 space-y-3">
        {orders.length > 0 ? orders.map(order => (
          <div key={order.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5 transition hover:border-violet-500/30">
            <div>
              <p className="font-semibold text-white">{order.product_name}</p>
              <p className="mt-1 text-sm text-white/50">
                {formatDate(order.paid_at || order.created_at)} · {money(order.amount)}
              </p>
            </div>
            <button
              onClick={() => downloadInvoice(order.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-600 hover:text-white"
            >
              <FileText size={15} />
              PDF
            </button>
          </div>
        )) : (
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)] p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-white/20" />
            <p className="mt-3 text-white/50">No invoices available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Profile View ────────────────────────────────────────────────────────────

function ProfileView({ customer }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    customerApi.get('/account/dashboard')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const joinedDate = customer?.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <div>
      <div className="mb-1">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-400">Profile</p>
        <h1 className="mt-2 text-3xl font-black text-white">My Profile</h1>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)] p-6 text-center">
            {customer?.profile_photo ? (
              <img
                src={customer.profile_photo}
                alt={customer.name}
                className="mx-auto h-24 w-24 rounded-full border-2 border-violet-500/30 object-cover"
              />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-3xl font-bold text-white">
                {customer?.name?.[0] || 'C'}
              </div>
            )}
            <h2 className="mt-4 text-xl font-bold text-white">{customer?.name || 'Customer'}</h2>
            <p className="mt-1 text-sm text-white/50">{customer?.email}</p>
            <p className="mt-2 text-xs text-white/30">Joined {joinedDate}</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5">
              <p className="text-xs uppercase tracking-wider text-white/40">Total Orders</p>
              <p className="mt-2 text-2xl font-black text-white">{loading ? '—' : (data?.total_orders || 0)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5">
              <p className="text-xs uppercase tracking-wider text-white/40">Total Downloads</p>
              <p className="mt-2 text-2xl font-black text-white">{loading ? '—' : (data?.total_downloads || 0)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5">
              <p className="text-xs uppercase tracking-wider text-white/40">Total Spent</p>
              <p className="mt-2 text-2xl font-black text-white">{loading ? '—' : money(data?.total_spent || 0)}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--bg-card)] p-5">
            <h3 className="text-sm font-semibold text-white">Account Details</h3>
            <div className="mt-4 space-y-3">
              <InfoRow label="Name" value={customer?.name || '—'} />
              <InfoRow label="Email" value={customer?.email || '—'} />
              <InfoRow label="Google ID" value={customer?.google_id ? `${customer.google_id.substring(0, 12)}...` : '—'} />
              <InfoRow label="Email Verified" value={customer?.verified_email ? 'Yes' : 'No'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared Components ──────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-white/40">{label}</span>
      <span className="text-sm font-medium text-white/80">{value || '—'}</span>
    </div>
  );
}

function OrderRow({ order }) {
  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const res = await customerApi.post(`/account/orders/${order.id}/download-link`);
      if (res.data?.url) window.open(res.data.url, '_blank');
    } catch {}
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[var(--bg-card)] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-white">{order.product_name}</p>
        <p className="text-xs text-white/40">{formatDate(order.paid_at || order.created_at)} · {money(order.amount)}</p>
      </div>
      <button onClick={handleDownload} className="flex-shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500">
        <Download size={14} />
      </button>
    </div>
  );
}

function LoadingCards({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/5 bg-[var(--bg-card)]" />
      ))}
    </>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hidden text-white/20 sm:block">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
