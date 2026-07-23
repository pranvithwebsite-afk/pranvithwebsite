import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, RefreshCw, Search, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminCustomers, formatApiErrorDetail, resendDownloadEmail, syncRazorpayStatus } from '../../lib/api';

const statusOptions = ['all', 'paid', 'failed', 'pending', 'cancelled'];

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
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const normalizeStatus = (value) => String(value || 'pending').toLowerCase();
const emailDeliveryStatus = (order) => {
  if (normalizeStatus(order?.payment_status || order?.status) !== 'paid') return 'pending';
  return String(order?.email_delivery_status || (order?.email_sent ? 'sent' : (order?.email_delivery_error || order?.email_error ? 'failed' : 'pending'))).toLowerCase();
};
const emailDeliveryError = (order) => order?.email_delivery_error || order?.email_error || '';
const syncErrorMessage = (error) => {
  const data = error?.response?.data;
  if (data?.message && data?.details) return `${data.message}: ${data.details}`;
  return data?.message || formatApiErrorDetail(data?.detail) || error?.message || 'Could not sync Razorpay status.';
};

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [product, setProduct] = useState('all');
  const [resendingOrderId, setResendingOrderId] = useState('');
  const [syncingOrderId, setSyncingOrderId] = useState('');

  const loadCustomers = () => {
    setLoading(true);
    return fetchAdminCustomers()
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error('[admin/customers] Failed to load customers', error?.response?.data?.detail || error?.message || error);
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleResend = async (order) => {
    const orderId = order?.razorpay_order_id || order?.order_id;
    if (!orderId) return;
    setResendingOrderId(orderId);
    try {
      await resendDownloadEmail(orderId);
      toast.success('Download email resent successfully.');
      await loadCustomers();
    } catch (error) {
      const message = error?.response?.data?.detail || error?.message || 'Download email could not be resent.';
      toast.error(message);
      await loadCustomers();
    } finally {
      setResendingOrderId('');
    }
  };

  const handleSync = async (order) => {
    const orderId = order?.razorpay_order_id || order?.order_id;
    if (!orderId) return;
    setSyncingOrderId(orderId);
    try {
      const result = await syncRazorpayStatus(orderId);
      if (result?.success === false) {
        toast.error(result?.details ? `${result.message}: ${result.details}` : (result?.message || 'Could not sync Razorpay status.'));
        await loadCustomers();
        return;
      }
      toast.success(result?.verified_paid ? 'Razorpay status synced: paid.' : 'Razorpay status synced.');
      await loadCustomers();
    } catch (error) {
      toast.error(syncErrorMessage(error));
      await loadCustomers();
    } finally {
      setSyncingOrderId('');
    }
  };

  const productOptions = useMemo(() => {
    const seen = new Map();
    customers.forEach((customer) => {
      (customer.orders || []).forEach((order) => {
        const slug = order.product_slug || order.asset_slug;
        if (!slug) return;
        seen.set(slug, order.product_name || order.asset_title || slug);
      });
    });
    return Array.from(seen, ([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return customers
      .map((customer) => {
        const orders = (customer.orders || []).filter((order) => {
          const orderStatus = normalizeStatus(order.payment_status || order.status);
          const slug = order.product_slug || order.asset_slug;
          if (status !== 'all' && orderStatus !== status) return false;
          if (product !== 'all' && slug !== product) return false;
          return true;
        });

        const matchesSearch = !search || [
          customer.name,
          customer.email,
          customer.phone,
        ].some((value) => String(value || '').toLowerCase().includes(search));

        if (!matchesSearch || orders.length === 0) return null;
        return { ...customer, orders };
      })
      .filter(Boolean)
      .sort((a, b) => String(b.latest_purchase_at || '').localeCompare(String(a.latest_purchase_at || '')));
  }, [customers, product, query, status]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Customers</h1>
        <p className="mt-3 text-slate-400">Track buyers, payment status, purchased assets, and download email delivery.</p>
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-800 bg-slate-950 p-4 lg:grid-cols-[1fr_180px_220px]">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, phone"
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
          value={product}
          onChange={(event) => setProduct(event.target.value)}
          className="h-11 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-white outline-none focus:border-violet-500"
        >
          <option value="all">All products</option>
          {productOptions.map((item) => (
            <option key={item.slug} value={item.slug}>{item.name}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={`customer-skeleton-${index}`} className="h-64 animate-pulse rounded-3xl border border-slate-800 bg-slate-950" />
          ))
        ) : filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id || customer.email}
              customer={customer}
              onResend={handleResend}
              onSync={handleSync}
              resendingOrderId={resendingOrderId}
              syncingOrderId={syncingOrderId}
            />
          ))
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-400 xl:col-span-2">
            No customers match these filters.
          </div>
        )}
      </div>
    </section>
  );
};

const CustomerCard = ({ customer, onResend, onSync, resendingOrderId, syncingOrderId }) => {
  const orders = customer.orders || [];
  const paidCustomer = orders.some((order) => normalizeStatus(order.payment_status || order.status) === 'paid');
  const repeatCustomer = orders.length > 1;
  const firstPurchase = orders.length === 1;

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{customer.name || 'Customer'}</h2>
          <div className="mt-3 space-y-1 text-sm text-slate-400">
            <p className="flex items-center gap-2"><Mail size={14} /> {customer.email || 'No email'}</p>
            <p className="flex items-center gap-2"><Phone size={14} /> {customer.phone || 'No phone'}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-wider text-slate-500">Total paid</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatAmount(customer.total_spend)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {paidCustomer && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">Paid Customer</span>}
        {repeatCustomer && <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-100">Repeat Customer</span>}
        {firstPurchase && <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-100">First Purchase</span>}
      </div>

      <div className="mt-5 space-y-3">
        {(customer.orders || []).map((order, index) => (
          <OrderRow
            key={`${order.razorpay_order_id || order.order_id || index}`}
            order={order}
            onResend={onResend}
            onSync={onSync}
            isResending={resendingOrderId === (order.razorpay_order_id || order.order_id)}
            isSyncing={syncingOrderId === (order.razorpay_order_id || order.order_id)}
          />
        ))}
      </div>
    </article>
  );
};

const OrderRow = ({ order, onResend, onSync, isResending, isSyncing }) => {
  const paymentStatus = normalizeStatus(order.payment_status || order.status);
  const deliveryStatus = emailDeliveryStatus(order);
  const deliveryError = emailDeliveryError(order);
  const statusClass = paymentStatus === 'paid'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
    : paymentStatus === 'failed'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
      : 'border-amber-500/20 bg-amber-500/10 text-amber-200';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium text-white">
          <ShoppingBag size={15} className="text-violet-300" />
          {order.product_name || order.asset_title || 'Product'}
        </p>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {paymentStatus}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
        <Info label="Asset slug" value={order.product_slug || order.asset_slug || 'N/A'} />
        <Info label="Amount" value={formatAmount(order.amount, order.currency || 'INR')} />
        <Info label="Razorpay payment ID" value={order.razorpay_payment_id || 'N/A'} />
        <Info label="Razorpay order ID" value={order.razorpay_order_id || 'N/A'} />
        <Info label="Purchase date" value={formatDate(order.purchase_date || order.paid_at || order.created_at)} />
        <Info label="Email delivery" value={deliveryStatus} />
      </dl>
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
      {deliveryError && <p className="mt-3 text-xs text-amber-300">{deliveryError}</p>}
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <dt className="uppercase tracking-wider text-slate-500">{label}</dt>
    <dd className="mt-1 break-words text-slate-200">{value}</dd>
  </div>
);

export default Customers;
