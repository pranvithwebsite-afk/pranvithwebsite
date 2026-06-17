import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, RefreshCw, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminOrders, resendDownloadEmail, syncRazorpayStatus } from '../../lib/api';

const statusOptions = ['all', 'pending', 'paid', 'failed', 'cancelled'];

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
const emailDeliveryError = (order) => order?.email_delivery_error || order?.email_error || '';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [resendingOrderId, setResendingOrderId] = useState('');
  const [syncingOrderId, setSyncingOrderId] = useState('');

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
      toast.success(result?.verified_paid ? 'Razorpay status synced: paid.' : 'Razorpay status synced.');
      await loadOrders();
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || 'Could not sync Razorpay status.';
      toast.error(message);
      await loadOrders();
    } finally {
      setSyncingOrderId('');
    }
  };

  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...orders]
      .filter((order) => {
        const orderStatus = normalizeStatus(order);
        if (status !== 'all' && orderStatus !== status) return false;
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
        ].some((value) => String(value || '').toLowerCase().includes(search));
      })
      .sort((a, b) => String(b.paid_at || b.verified_at || b.created_at || '').localeCompare(String(a.paid_at || a.verified_at || a.created_at || '')));
  }, [orders, query, status]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Orders</h1>
        <p className="mt-3 text-slate-400">Track Razorpay checkout sessions, payment state, customers, products, and email delivery.</p>
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-[1fr_180px]">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, phone, order ID"
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
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-slate-400">No orders match these filters.</div>
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
    : paymentStatus === 'failed'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-200';

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wider text-slate-500">Order ID</p>
          <h2 className="mt-1 break-all text-lg font-semibold text-white">{order.id || 'N/A'}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>{paymentStatus}</span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Customer</h3>
          <p className="flex items-center gap-2 text-sm text-slate-300"><User size={14} /> {order.customer_name || order.buyer_name || 'Customer'}</p>
          <p className="mt-2 flex items-center gap-2 break-all text-sm text-slate-400"><Mail size={14} /> {order.customer_email || order.buyer_email || 'No email'}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><Phone size={14} /> {order.customer_phone || order.buyer_phone || 'No phone'}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Product</h3>
          <Info label="Name" value={order.product_name || order.product_title || 'Product'} />
          <Info label="Asset slug" value={order.product_slug || 'N/A'} />
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
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={isResending ? 'animate-spin' : ''} />
              {isResending ? 'Resending...' : 'Resend Download Email'}
            </button>
            <button
              type="button"
              onClick={() => onSync(order)}
              disabled={isSyncing || !order.razorpay_order_id}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync with Razorpay'}
            </button>
          </div>
        </div>
      </div>
      {deliveryError && <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{deliveryError}</p>}
    </article>
  );
};

const Info = ({ label, value }) => (
  <div className="mt-2 first:mt-0">
    <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 break-words text-sm text-slate-200">{value}</p>
  </div>
);

export default Orders;
