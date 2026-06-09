// Razorpay Standard Checkout helper
import { api } from './api';

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

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
 * @returns {Promise<{success: boolean, paymentId?: string, orderId?: string, error?: string}>}
 */
export async function payWithRazorpay({ amountRupees, itemId, itemName, prefill = {} }) {
  if (!RAZORPAY_KEY_ID) {
    return { success: false, error: 'Razorpay key missing on client' };
  }
  const ok = await loadScript();
  if (!ok) {
    return { success: false, error: 'Failed to load Razorpay SDK' };
  }

  // 1. Create order on backend
  const amountPaise = Math.max(100, Math.round(Number(amountRupees) * 100));
  let order;
  try {
    const { data } = await api.post('/create-order', {
      amount: amountPaise,
      currency: 'INR',
      item_id: itemId || '',
      item_name: itemName || '',
    });
    order = data;
  } catch (err) {
    const msg = err?.response?.data?.detail || 'Could not create order';
    return { success: false, error: typeof msg === 'string' ? msg : 'Could not create order' };
  }

  // 2. Open Razorpay modal
  return new Promise((resolve) => {
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
        ondismiss: () => resolve({ success: false, error: 'cancelled' }),
      },
      handler: async (response) => {
        try {
          const { data } = await api.post('/verify-payment', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            item_id: itemId || '',
            item_name: itemName || '',
            amount: order.amount,
            email: prefill.email || '',
          });
          resolve({
            success: !!data?.success,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
          });
        } catch (err) {
          const msg = err?.response?.data?.detail || 'Verification failed';
          resolve({ success: false, error: typeof msg === 'string' ? msg : 'Verification failed' });
        }
      },
    });

    rzp.on('payment.failed', (resp) => {
      const reason = resp?.error?.description || 'Payment failed';
      resolve({ success: false, error: reason });
    });

    rzp.open();
  });
}
