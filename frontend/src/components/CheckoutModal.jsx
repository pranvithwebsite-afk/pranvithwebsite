import React, { useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { payWithRazorpay } from '../lib/razorpay';
import { createFreeOrder } from '../lib/api';

const initialForm = {
  name: '',
  email: '',
  phone: '',
};

const validate = (values) => {
  const errors = {};
  if (!values.name.trim() || values.name.trim().length < 2) {
    errors.name = 'Enter your name';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email';
  }
  if (!/^\+?[\d\s().-]{7,20}$/.test(values.phone.trim())) {
    errors.phone = 'Enter a valid phone number';
  }
  return errors;
};

const CheckoutModal = ({ product, open, onClose, onSuccess, onFailure }) => {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  const [message, setMessage] = useState('');

  if (!open || !product) return null;

  const price = product.sale_price ?? product.price ?? 0;

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setMessage('');
  };

  const submit = async (e) => {
    e.preventDefault();
    // State updates are asynchronous; the ref closes the small window in
    // which a double click can submit the form twice.
    if (submitLock.current) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submitLock.current = true;
    setBusy(true);
    setMessage('');

    let result;
    if (price <= 0 || product?.is_free) {
      try {
        const data = await createFreeOrder({
          product_id: product.id,
          product_slug: product.slug,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        });
        result = {
          success: true,
          orderId: data.order_id,
          productSlug: data.product_slug,
          downloadToken: data.download_token,
        };
      } catch (err) {
        const msg = err?.response?.data?.detail || 'Could not create free order';
        result = { success: false, error: typeof msg === 'string' ? msg : 'Could not create free order' };
      }
    } else {
      result = await payWithRazorpay({
        amountRupees: price,
        itemId: product.id,
        productSlug: product.slug,
        itemName: product.name || product.title,
        prefill: {
          name: form.name.trim(),
          email: form.email.trim(),
          contact: form.phone.trim(),
        },
      });
    }

    setBusy(false);
    submitLock.current = false;

    if (result.success) {
      setForm(initialForm);
      onSuccess?.(result);
      return;
    }

    const error = result.error === 'cancelled' ? 'Payment cancelled. You can retry when ready.' : (result.error || 'Payment failed. Please retry.');
    setMessage(error);
    onFailure?.(error, result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[var(--bg-elevated)] p-5 text-left shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Checkout</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{product.name || product.title}</h2>
            <p className="mt-1 text-sm text-white/60">Pay Rs {Number(price).toLocaleString('en-IN')} and unlock the download.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close checkout"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Field label="Name" error={errors.name}>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-violet-500/60 focus:outline-none"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-violet-500/60 focus:outline-none"
              placeholder="you@example.com"
              autoComplete="email"
              type="email"
              required
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-violet-500/60 focus:outline-none"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              type="tel"
              required
            />
          </Field>

          {message && (
            <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? (
              <><Loader2 size={16} className="animate-spin" /> Processing...</>
            ) : product?.is_free || price <= 0 ? (
              'Continue to download'
            ) : (
              'Continue to payment'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, error, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-white/80">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
  </label>
);

export default CheckoutModal;
