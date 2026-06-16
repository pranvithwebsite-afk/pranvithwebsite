import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Search, ShoppingBag } from 'lucide-react';
import { fetchAdminCustomers } from '../../lib/api';

const statusOptions = ['all', 'paid', 'failed', 'pending'];

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

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [product, setProduct] = useState('all');

  useEffect(() => {
    fetchAdminCustomers()
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error('[admin/customers] Failed to load customers', error?.response?.data?.detail || error?.message || error);
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  }, []);

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
            <CustomerCard key={customer.id || customer.email} customer={customer} />
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

const CustomerCard = ({ customer }) => (
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

    <div className="mt-5 space-y-3">
      {(customer.orders || []).map((order, index) => (
        <OrderRow key={`${order.razorpay_order_id || order.order_id || index}`} order={order} />
      ))}
    </div>
  </article>
);

const OrderRow = ({ order }) => {
  const paymentStatus = normalizeStatus(order.payment_status || order.status);
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
        <Info label="Email delivery" value={order.email_sent ? 'Sent' : (order.email_error ? 'Failed' : 'Pending')} />
      </dl>
      {order.email_error && <p className="mt-3 text-xs text-amber-300">{order.email_error}</p>}
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
