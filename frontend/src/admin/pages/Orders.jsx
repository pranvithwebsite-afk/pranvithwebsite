import React, { useEffect, useMemo, useState } from 'react';
import { CircleCheckBig, Clock3, Download, FileSpreadsheet, FileText, Mail, Phone, Printer, RefreshCw, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { downloadAdminOrdersExcelReport, fetchAdminOrders, formatApiErrorDetail, resendDownloadEmail, syncRazorpayStatus } from '../../lib/api';

const statusOptions = ['all', 'paid', 'refunded'];
const rangeOptions = ['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'custom'];

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

const normalizeStatus = (order) => String(order?.payment_status || order?.status || 'pending').toLowerCase();
const emailDeliveryStatus = (order) => {
  if (normalizeStatus(order) !== 'paid') return 'pending';
  return String(order?.email_delivery_status || (order?.email_sent ? 'sent' : (order?.email_delivery_error || order?.email_error ? 'failed' : 'pending'))).toLowerCase();
};
const emailDeliveryError = (order) => {
  const error = order?.email_delivery_error || order?.email_error || '';
  if (!error) return '';
  if (error.toLowerCase().includes('payment not verified')) {
    return 'Download becomes available after payment verification.';
  }
  if (error.toLowerCase().includes('download email blocked')) {
    return 'Download becomes available after payment verification.';
  }
  return error;
};
const syncErrorMessage = (error) => {
  const data = error?.response?.data;
  if (data?.message && data?.details) return `${data.message}: ${data.details}`;
  return data?.message || formatApiErrorDetail(data?.detail) || error?.message || 'Could not sync Razorpay status.';
};
const exportCsv = (rows, filename) => {
  const headers = ['Order ID', 'Customer', 'Email', 'Phone', 'Product', 'Amount', 'Status', 'Purchase Date'];
  const csvRows = [headers, ...rows.map((row) => [
    row.razorpay_order_id || row.id || '',
    row.customer_name || row.buyer_name || '',
    row.customer_email || row.buyer_email || '',
    row.customer_phone || row.buyer_phone || '',
    row.product_name || row.product_title || '',
    String((Number(row.amount) || 0) / 100),
    normalizeStatus(row),
    formatDate(row.paid_at || row.verified_at || row.created_at),
  ])].map((items) => items.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
const inRange = (dateValue, range) => {
  if (!dateValue || range === 'custom') return true;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  if (range === 'today') return date >= startOfDay;
  if (range === 'yesterday') {
    const yesterday = new Date(startOfDay);
    yesterday.setDate(yesterday.getDate() - 1);
    return date >= yesterday && date < startOfDay;
  }
  if (range === 'this_week') return date >= startOfWeek;
  if (range === 'this_month') return date >= startOfMonth;
  if (range === 'last_month') return date >= startOfLastMonth && date <= endOfLastMonth;
  return true;
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState('this_month');
  const [resendingOrderId, setResendingOrderId] = useState('');
  const [syncingOrderId, setSyncingOrderId] = useState('');
  const [exporting, setExporting] = useState(false);

  const loadOrders = () => {
    setLoading(true);
    return fetchAdminOrders()
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setError('');
      })
      .catch((err) => {
        console.error('[admin/orders] Failed to load orders', err?.response?.data?.detail || err?.message || err);
        setOrders([]);
        setError('Orders could not be loaded.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const stats = useMemo(() => {
    const paidOrders = orders.filter((order) => ['paid', 'refunded'].includes(normalizeStatus(order)));
    const totalRevenue = paidOrders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
    const totalDownloads = paidOrders.reduce((sum, order) => sum + (Number(order.download_count) || 0), 0);
    const averageOrderValue = paidOrders.length ? totalRevenue / paidOrders.length : 0;
    const todaySales = paidOrders.filter((order) => inRange(order.paid_at || order.verified_at || order.created_at, 'today')).reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

    return {
      verifiedOrders: paidOrders.length,
      revenue: totalRevenue,
      downloads: totalDownloads,
      averageOrderValue,
      todaySales,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...orders]
      .filter((order) => {
        const orderStatus = normalizeStatus(order);
        if (status !== 'all' && orderStatus !== status) return false;
        if (!inRange(order.paid_at || order.verified_at || order.created_at, range)) return false;
        if (!search) return true;
        return [
          order.customer_name,
          order.buyer_name,
          order.customer_email,
          order.buyer_email,
          order.customer_phone,
          order.buyer_phone,
          order.id,
          order.razorpay_order_id,
          order.razorpay_payment_id,
          order.product_name,
          order.product_title,
          order.product_slug,
        ].some((value) => String(value || '').toLowerCase().includes(search));
      })
      .sort((a, b) => String(b.paid_at || b.verified_at || b.created_at || '').localeCompare(String(a.paid_at || a.verified_at || a.created_at || '')));
  }, [orders, query, range, status]);

  const handleResend = async (order) => {
    const orderId = order?.razorpay_order_id || order?.id;
    if (!orderId) return;
    setResendingOrderId(orderId);
    try {
      await resendDownloadEmail(orderId);
      toast.success('Download email resent successfully.');
      await loadOrders();
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || 'Download email could not be resent.';
      toast.error(message);
      await loadOrders();
    } finally {
      setResendingOrderId('');
    }
  };

  const handleSync = async (order) => {
    const orderId = order?.razorpay_order_id || order?.id;
    if (!orderId) return;
    setSyncingOrderId(orderId);
    try {
      const result = await syncRazorpayStatus(orderId);
      if (result?.success === false) {
        toast.error(result?.details ? `${result.message}: ${result.details}` : (result?.message || 'Could not sync Razorpay status.'));
        await loadOrders();
        return;
      }
      toast.success(result?.verified_paid ? 'Razorpay status synced: paid.' : 'Razorpay status synced.');
      await loadOrders();
    } catch (err) {
      toast.error(syncErrorMessage(err));
      await loadOrders();
    } finally {
      setSyncingOrderId('');
    }
  };

  const exportOrders = (type) => {
    if (type === 'pdf') {
      window.print();
      return;
    }
    exportCsv(filteredOrders, `orders-${type}.csv`);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-violet-400">Orders</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Orders</h1>
            <p className="mt-2 text-slate-400">Verified customer purchases</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => exportOrders('excel')} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20"><FileSpreadsheet size={15} />Export Excel</button>
            <button type="button" onClick={() => exportOrders('csv')} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"><FileText size={15} />Export CSV</button>
            <button type="button" onClick={() => exportOrders('pdf')} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"><Printer size={15} />Export PDF</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Verified Orders" value={stats.verifiedOrders} />
        <StatCard label="Revenue" value={formatAmount(stats.revenue)} />
        <StatCard label="Downloads" value={stats.downloads} />
        <StatCard label="Average Order Value" value={formatAmount(stats.averageOrderValue)} />
        <StatCard label="Today's Sales" value={formatAmount(stats.todaySales)} />
      </div>

      <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
        Only verified and paid purchases appear here. Failed, cancelled and pending payments are available under Payment Attempts.
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-4 lg:grid-cols-[1fr_180px_200px]">
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
        <select
          value={range}
          onChange={(event) => setRange(event.target.value)}
          className="h-11 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-white outline-none focus:border-violet-500"
        >
          {rangeOptions.map((item) => (
            <option key={item} value={item}>{item === 'custom' ? 'Custom' : item.replace('_', ' ').replace(/^./, (letter) => letter.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-rose-100">{error}</div>}

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="h-56 animate-pulse rounded-3xl border border-slate-800 bg-slate-950" />
          ))
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const orderId = order.razorpay_order_id || order.id;
            return (
              <OrderCard
                key={order.id || order.razorpay_order_id}
                order={order}
                onResend={handleResend}
                onSync={handleSync}
                isResending={resendingOrderId === orderId}
                isSyncing={syncingOrderId === orderId}
              />
            );
          })
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-slate-400">No verified purchases yet.</div>
        )}
      </div>
    </section>
  );
};

const OrderCard = ({ order, onResend, onSync, isResending, isSyncing }) => {
  const paymentStatus = normalizeStatus(order);
  const deliveryStatus = emailDeliveryStatus(order);
  const deliveryError = emailDeliveryError(order);
  const statusClass = paymentStatus === 'paid'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
    : paymentStatus === 'refunded'
      ? 'border-sky-500/20 bg-sky-500/10 text-sky-200'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-200';

  const timeline = [
    { label: 'Payment Verified', active: paymentStatus === 'paid' || paymentStatus === 'refunded' },
    { label: 'Download Email Sent', active: deliveryStatus === 'sent' },
    { label: 'Downloaded', active: Number(order.download_count || 0) > 0 },
  ];

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-lg shadow-slate-950/20 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Order ID</p>
          <h2 className="mt-1 break-all text-lg font-semibold text-white">{order.id || 'N/A'}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>{paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'refunded' ? 'Refunded' : paymentStatus}</span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Customer</h3>
          <p className="flex items-center gap-2 text-sm text-slate-300"><User size={14} /> {order.customer_name || order.buyer_name || 'Customer'}</p>
          <p className="mt-2 flex items-center gap-2 break-all text-sm text-slate-400"><Mail size={14} /> {order.customer_email || order.buyer_email || 'No email'}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><Phone size={14} /> {order.customer_phone || order.buyer_phone || 'No phone'}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Product</h3>
          <Info label="Name" value={order.product_name || order.product_title || 'Product'} />
          <Info label="Slug" value={order.product_slug || 'N/A'} />
          <Info label="Amount" value={formatAmount(order.amount, order.currency || 'INR')} />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Payment</h3>
          <Info label="Razorpay order ID" value={order.razorpay_order_id || 'N/A'} />
          <Info label="Razorpay payment ID" value={order.razorpay_payment_id || 'N/A'} />
          <Info label="Purchase date" value={formatDate(order.paid_at || order.verified_at || order.created_at)} />
          <Info label="Email delivery" value={deliveryStatus} />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onResend(order)}
              disabled={isResending || paymentStatus !== 'paid'}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <RefreshCw size={15} className={isResending ? 'animate-spin' : ''} />
              {isResending ? 'Resending...' : 'Resend Download Email'}
            </button>
            <button
              type="button"
              onClick={() => onSync(order)}
              disabled={isSyncing || !order.razorpay_order_id}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync with Razorpay'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3">
        {timeline.map((item) => (
          <span key={item.label} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${item.active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
            {item.active ? <CircleCheckBig size={13} /> : <Clock3 size={13} />}
            {item.label}
          </span>
        ))}
      </div>

      {deliveryError && <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{deliveryError}</p>}
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

export default Orders;
