import React, { useEffect, useMemo, useState } from 'react';
import { CircleCheckBig, Clock3, FileSpreadsheet, FileText, Mail, Phone, RefreshCw, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  archiveInvalidPaymentAttempts,
  fetchAdminPaymentAttempts,
  formatApiErrorDetail,
} from '../../lib/api';

const statusOptions = ['all', 'pending', 'failed', 'cancelled', 'expired', 'abandoned'];

const formatAmount = (amount = 0, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((Number(amount) || 0) / 100);

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const normalizeStatus = (attempt) => String(attempt?.payment_status || attempt?.status || 'pending').toLowerCase();

const exportCsv = (rows, filename) => {
  const headers = ['Attempt ID', 'Customer', 'Email', 'Phone', 'Product', 'Amount', 'Status', 'Created'];
  const csvRows = [headers, ...rows.map((row) => [
    row.razorpay_order_id || row.id || '',
    row.customer_name || row.buyer_name || '',
    row.customer_email || row.buyer_email || '',
    row.customer_phone || row.buyer_phone || '',
    row.product_name || row.product_title || '',
    String((Number(row.amount) || 0) / 100),
    normalizeStatus(row),
    formatDate(row.created_at),
  ])].map((items) => items.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const PaymentAttempts = () => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [archiving, setArchiving] = useState(false);

  const loadAttempts = () => {
    setLoading(true);
    return fetchAdminPaymentAttempts(status, query)
      .then((data) => {
        setAttempts(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch((err) => {
        console.error('[admin/payment-attempts] Failed to load payment attempts', err?.response?.data?.detail || err?.message || err);
        setAttempts([]);
        setError('Payment attempts could not be loaded.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAttempts();
  }, []);

  const stats = useMemo(() => {
    const pending = attempts.filter((attempt) => normalizeStatus(attempt) === 'pending').length;
    const failed = attempts.filter((attempt) => normalizeStatus(attempt) === 'failed').length;
    const cancelled = attempts.filter((attempt) => normalizeStatus(attempt) === 'cancelled').length;
    const recoveryRate = attempts.length ? Math.round(((attempts.filter((attempt) => normalizeStatus(attempt) === 'pending').length / attempts.length) * 100)) : 0;
    return { pending, failed, cancelled, recoveryRate };
  }, [attempts]);

  const filteredAttempts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...attempts]
      .filter((attempt) => {
        const attemptStatus = normalizeStatus(attempt);
        if (status !== 'all' && attemptStatus !== status) return false;
        if (!search) return true;
        return [
          attempt.customer_name,
          attempt.buyer_name,
          attempt.customer_email,
          attempt.buyer_email,
          attempt.customer_phone,
          attempt.buyer_phone,
          attempt.id,
          attempt.razorpay_order_id,
          attempt.razorpay_payment_id,
          attempt.product_name,
          attempt.product_slug,
        ].some((value) => String(value || '').toLowerCase().includes(search));
      })
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }, [attempts, query, status]);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const result = await archiveInvalidPaymentAttempts(7);
      toast.success(`Archived ${result?.deleted ?? 0} invalid payment attempts.`);
      await loadAttempts();
    } catch (err) {
      const message = formatApiErrorDetail(err?.response?.data?.detail) || err?.message || 'Could not archive invalid attempts.';
      toast.error(message);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-violet-400">Payments</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Payment Attempts</h1>
            <p className="mt-2 text-slate-400">Unsuccessful and incomplete payment sessions</p>
          </div>
          <button
            type="button"
            onClick={handleArchive}
            disabled={archiving}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={archiving ? 'animate-spin' : ''} />
            {archiving ? 'Archiving...' : 'Archive Invalid Attempts'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending Payments" value={stats.pending} />
        <StatCard label="Failed Payments" value={stats.failed} />
        <StatCard label="Cancelled Payments" value={stats.cancelled} />
        <StatCard label="Recovery Rate" value={`${stats.recoveryRate}%`} />
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-4 lg:grid-cols-[1fr_180px]">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer, email, phone, product, order ID, payment ID"
            className="h-11 w-full rounded-2xl border border-slate-800 bg-slate-900 pl-10 pr-4 text-sm text-white outline-none focus:border-violet-500"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-white outline-none focus:border-violet-500"
        >
          {statusOptions.map((item) => (
            <option key={item} value={item}>{item === 'all' ? 'All statuses' : item}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => exportCsv(filteredAttempts, 'payment-attempts.csv')} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20"><FileSpreadsheet size={15} />Export Excel</button>
        <button type="button" onClick={() => exportCsv(filteredAttempts, 'payment-attempts.csv')} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"><FileText size={15} />Export CSV</button>
      </div>

      {error && <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-rose-100">{error}</div>}

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="h-56 animate-pulse rounded-3xl border border-slate-800 bg-slate-950" />
          ))
        ) : filteredAttempts.length > 0 ? (
          filteredAttempts.map((attempt) => (
            <AttemptCard key={attempt.id || attempt.razorpay_order_id || attempt.razorpay_payment_id} attempt={attempt} />
          ))
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-slate-400">No incomplete payment attempts.</div>
        )}
      </div>
    </section>
  );
};

const AttemptCard = ({ attempt }) => {
  const status = normalizeStatus(attempt);
  const statusClass = status === 'pending'
    ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
    : status === 'failed'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
      : status === 'cancelled'
        ? 'border-orange-500/20 bg-orange-500/10 text-orange-100'
        : status === 'expired'
          ? 'border-slate-500/20 bg-slate-500/10 text-slate-200'
          : 'border-slate-700 bg-slate-800 text-slate-200';

  const timeline = [
    { label: 'Checkout Created', active: true },
    { label: 'Payment Started', active: status !== 'pending' && status !== 'created' },
    { label: 'Cancelled', active: status === 'cancelled' },
    { label: 'Failed', active: status === 'failed' },
    { label: 'Expired', active: status === 'expired' },
  ];

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-lg shadow-slate-950/20 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Attempt ID</p>
          <h2 className="mt-1 break-all text-lg font-semibold text-white">{attempt.id || 'N/A'}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>{status === 'pending' ? 'Pending' : status === 'failed' ? 'Failed' : status === 'cancelled' ? 'Cancelled' : status === 'expired' ? 'Expired' : status === 'abandoned' ? 'Abandoned' : status}</span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Customer</h3>
          <p className="flex items-center gap-2 text-sm text-slate-300"><User size={14} /> {attempt.customer_name || attempt.buyer_name || 'Customer'}</p>
          <p className="mt-2 flex items-center gap-2 break-all text-sm text-slate-400"><Mail size={14} /> {attempt.customer_email || attempt.buyer_email || 'No email'}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><Phone size={14} /> {attempt.customer_phone || attempt.buyer_phone || 'No phone'}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Product</h3>
          <Info label="Name" value={attempt.product_name || attempt.product_title || 'Product'} />
          <Info label="Slug" value={attempt.product_slug || 'N/A'} />
          <Info label="Amount" value={formatAmount(attempt.amount, attempt.currency || 'INR')} />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Razorpay</h3>
          <Info label="Razorpay order ID" value={attempt.razorpay_order_id || 'N/A'} />
          <Info label="Razorpay payment ID" value={attempt.razorpay_payment_id || 'N/A'} />
          <Info label="Created" value={formatDate(attempt.created_at)} />
          <Info label="Failure reason" value={attempt.payment_failure_reason || 'N/A'} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3">
        {timeline.map((item) => (
          <span key={item.label} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${item.active ? 'border-violet-500/20 bg-violet-500/10 text-violet-100' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
            {item.active ? <CircleCheckBig size={13} /> : <Clock3 size={13} />}
            {item.label}
          </span>
        ))}
      </div>
    </article>
  );
};

const StatCard = ({ label, value }) => (
  <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-5 shadow-sm shadow-slate-950/10">
    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
  </div>
);

const Info = ({ label, value }) => (
  <div className="mt-2 first:mt-0">
    <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 break-words text-sm text-slate-200">{value}</p>
  </div>
);

export default PaymentAttempts;
