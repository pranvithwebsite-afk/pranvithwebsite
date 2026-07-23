// Razorpay Standard Checkout helper
import { api } from './api';

const RAZORPAY_KEY_ID = process.env.VITE_RAZORPAY_KEY_ID || process.env.REACT_APP_RAZORPAY_KEY_ID;
const RAZORPAY_AUTH_ERROR = 'Razorpay authentication failed. Check live keys in Vercel and redeploy.';

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

const loadScript = () =>
  new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

/**
 * Opens Razorpay checkout for a product.
 * @param {Object} opts
 * @param {number} opts.amountRupees   Amount in rupees (will be converted to paise)
 * @param {string} opts.itemId
 * @param {string} opts.itemName
 * @param {Object} [opts.prefill]      { name, email, contact }
 * @param {string} [opts.productSlug]
 * @returns {Promise<{success: boolean, paymentId?: string, orderId?: string, downloadToken?: string, productSlug?: string, emailSent?: boolean, emailError?: string, error?: string}>}
 */
export async function payWithRazorpay({ amountRupees, itemId, itemName, productSlug, prefill = {} }) {
  if (!RAZORPAY_KEY_ID) {
    return { success: false, error: 'Razorpay key missing on client' };
  }
  const ok = await loadScript();
  if (!ok) {
    return { success: false, error: 'Failed to load Razorpay SDK' };
  }

  // 1. Create order on backend. The backend calculates the final amount from the product.
  let order;
  try {
    const { data } = await api.post('/checkout/create-order', {
      product_id: itemId || '',
      product_slug: productSlug || '',
      name: prefill.name || '',
      email: prefill.email || '',
      phone: prefill.contact || '',
    });
    order = data;
    if (order?.already_owned) {
      return { success: false, alreadyOwned: true, error: order.message || 'You already own this asset.' };
    }
  } catch (err) {
    const msg = err?.response?.data?.detail || 'Could not create order';
    const safeMessage = typeof msg === 'string' && msg.toLowerCase().includes('authentication failed')
      ? RAZORPAY_AUTH_ERROR
      : msg;
    return { success: false, error: typeof safeMessage === 'string' ? safeMessage : 'Could not create order' };
  }

  // 2. Open Razorpay modal
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const markCancelled = async () => {
      try {
        await api.post(`/checkout/${encodeURIComponent(order.order_id)}/cancel`);
      } catch (_) {
        // Cancellation tracking is best-effort; payment verification remains server-side.
      }
    };
    const rzp = new window.Razorpay({
      key: order.key_id || RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'PranvithDOP',
      description: itemName || 'Purchase',
      order_id: order.order_id,
      prefill,
      theme: { color: '#7c3aed' },
      modal: {
        ondismiss: async () => {
          await markCancelled();
          settle({ success: false, error: 'cancelled', cancelled: true, orderId: order.order_id });
        },
      },
      handler: async (response) => {
        try {
          const { data } = await api.post('/checkout/verify-payment', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            buyer_email: prefill.email || '',
            asset_slug: productSlug || '',
          });
          const verifiedPaid = data?.verified_paid === true;
          settle({
            success: !!data?.success && verifiedPaid,
            verifiedPaid,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            productSlug: data?.product_slug,
            downloadToken: verifiedPaid ? (data?.download_token || new URLSearchParams((data?.download_url || '').split('?')[1] || '').get('token')) : '',
            emailSent: !!data?.email_sent,
            emailError: data?.email_error,
            customerAccessToken: data?.customer_access_token || '',
            failed: !verifiedPaid,
            error: verifiedPaid ? '' : (data?.error || 'Payment was not verified.'),
          });
        } catch (err) {
          const msg = err?.response?.data?.detail || 'Verification failed';
          settle({
            success: false,
            verifiedPaid: false,
            failed: true,
            orderId: response.razorpay_order_id,
            error: typeof msg === 'string' ? msg : 'Verification failed',
          });
        }
      },
    });

    rzp.on('payment.failed', (resp) => {
      const reason = resp?.error?.description || 'Payment failed';
      const safeReason = String(reason).toLowerCase().includes('authentication failed') ? RAZORPAY_AUTH_ERROR : reason;
      settle({ success: false, verifiedPaid: false, error: safeReason, failed: true, orderId: order.order_id });
    });

    rzp.open();
  });
}
