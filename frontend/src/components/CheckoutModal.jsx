import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { payWithRazorpay } from '../lib/razorpay';
import { createFreeOrder } from '../lib/api';
import { trackInitiateCheckout, trackPurchase, trackViewContent } from '../utils/metaPixel';

const initialForm = {
  name: '',
  email: '',
  phone: '',
};

const formatINR = (paise) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(Number(paise || 0) / 100);

const getProductMongoId = (product) => {
  const value = product?.mongoId || product?._id || product?.id || product?.productId;
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value) ? value : null;
};

// Checkout accepts the product's application ID as well as a Mongo ObjectId.
// The backend resolves the reference against its published catalogue and
// calculates the price itself, so the client never supplies an amount.
const getCheckoutProductReference = (product) => {
  const value = product?.mongoId || product?._id || product?.id || product?.productId || product?.slug;
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeIndianPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('91') ? digits.slice(2) : digits;
};

const validate = (values) => {
  const errors = {};
  if (!values.name.trim() || values.name.trim().length < 2) {
    errors.name = 'Enter your name';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email';
  }
  const digits = values.phone.replace(/\D/g, '');
  const indianNumber = digits.startsWith('91') ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(indianNumber)) {
    errors.phone = 'Enter a valid 10-digit Indian phone number';
  }
  return errors;
};

const CheckoutModal = ({ product, open, onClose, onSuccess, onFailure }) => {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  const viewedProductIds = useRef(new Set());
  const [message, setMessage] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && product) console.log('[Checkout] product object:', product);
    const productId = product?.id ?? product?.slug;
    if (!open || !productId || viewedProductIds.current.has(productId)) return;
    viewedProductIds.current.add(productId);
    trackViewContent(product);
  }, [open, product]);

  if (!open || !product) return null;

  const price = product.sale_price ?? product.price ?? 0;

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setMessage('');
    setCouponError('');
  };

  const applyCoupon = async () => {
    const nextErrors = validate(form); setErrors(nextErrors); setCouponError('');
    if (Object.keys(nextErrors).length || !couponCode.trim() || couponBusy) return;
    const productId = getProductMongoId(product);
    if (!productId) { console.error('[Coupon] Invalid product identifier', { productId, product }); setCouponError('Unable to identify this product. Please refresh and try again.'); return; }
    const payload = { code: couponCode.trim().toUpperCase(), productIds: [productId], customerName: form.name.trim(), customerEmail: form.email.trim().toLowerCase(), customerPhone: form.phone.replace(/\D/g, '') };
    console.log('[Coupon] submitting', { productId, productIdLength: productId.length, productSlug: product.slug, productTitle: product.title });
    setCouponBusy(true); setMessage('');
    try {
      const response = await fetch('/api/coupons/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const rawText = await response.text(); let data = null;
      try { data = rawText ? JSON.parse(rawText) : null; } catch { console.error('[Coupon] Invalid JSON response:', rawText); }
      console.log('[Coupon] validation response', { status: response.status, data, rawText });
      if (!response.ok) { const detail = data?.message || data?.detail || `Coupon validation failed (${response.status})`; const error = typeof detail === 'string' ? detail : JSON.stringify(detail); setCoupon(null); setCouponError(error); setMessage(error); return; }
      if (!data?.success) { const error = data?.message || 'This coupon cannot be applied'; setCoupon(null); setCouponError(error); setMessage(error); return; }
      setCoupon({ code: data.couponCode, ...data });
    } catch (err) { console.error('[Coupon] network failure', err); setCoupon(null); setCouponError('Could not validate coupon'); setMessage('Could not validate coupon'); }
    finally { setCouponBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    // State updates are asynchronous; the ref closes the small window in
    // which a double click can submit the form twice.
    if (submitLock.current) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const productReference = getCheckoutProductReference(product);
    if (!productReference) {
      setMessage('This asset is unavailable for checkout. Please refresh and try again.');
      return;
    }

    submitLock.current = true;
    setBusy(true);
    setMessage('');

    let result;
    if (price <= 0 || product?.is_free || coupon?.finalAmount === 0) {
      try {
        const data = await createFreeOrder({
          product_id: productReference,
          product_slug: product.slug,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: normalizeIndianPhone(form.phone),
          guest_checkout: true,
          coupon_code: coupon?.couponCode,
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
      // This happens after the buyer submits checkout and before Razorpay opens.
      trackInitiateCheckout(product);
      result = await payWithRazorpay({
        amountRupees: price,
        itemId: productReference,
        productSlug: product.slug,
        itemName: product.name || product.title,
        couponCode: coupon?.couponCode,
        prefill: {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          contact: normalizeIndianPhone(form.phone),
        },
      });
    }

    setBusy(false);
    submitLock.current = false;

    if (result.success) {
      // payWithRazorpay sets success only after /orders/verify returns both
      // success and verifiedPaid. Do not move this before that response.
      if (result.verifiedPaid) {
        trackPurchase(product, result.verifiedOrderId || result.orderId);
      }
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
            <p className="mt-1 text-sm text-white/60">Pay {formatINR(price * 100)} to continue.</p>
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
          <Field label="Full Name" error={errors.name}>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-violet-500/60 focus:outline-none"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </Field>
          <Field label="Email Address" error={errors.email}>
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

          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">Coupon Code</label>
            {coupon ? <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"><span>{coupon.couponCode} applied — save ₹{(coupon.discountAmount / 100).toLocaleString('en-IN')}</span><button type="button" onClick={() => setCoupon(null)} className="font-semibold text-emerald-300">Remove</button></div> : <div className="flex gap-2"><input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="ENTER CODE" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-violet-500/60 focus:outline-none" /><button type="button" onClick={applyCoupon} disabled={couponBusy} className="rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{couponBusy ? 'Applying…' : 'Apply'}</button></div>}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm"><div className="flex justify-between text-white/70"><span>Product price</span><span>₹{Number(price).toLocaleString('en-IN')}</span></div>{coupon && <div className="mt-2 flex justify-between text-emerald-300"><span>Coupon discount</span><span>-₹{(coupon.discountAmount / 100).toLocaleString('en-IN')}</span></div>}<div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-semibold text-white"><span>Total payable</span><span>₹{((coupon ? coupon.finalAmount : price * 100) / 100).toLocaleString('en-IN')}</span></div></div>

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
              <><Loader2 size={16} className="animate-spin" /> Opening payment…</>
            ) : product?.is_free || price <= 0 || coupon?.finalAmount === 0 ? (
              'Continue to download'
            ) : (
              'Continue to Payment'
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
