const PIXEL_ID = '1041507241585490';
const PIXEL_SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

let initialized = false;

const getProductPayload = (product = {}) => {
  const price = Number(product.sale_price ?? product.price ?? 0);

  return {
    content_ids: [String(product.id ?? product.slug ?? '')],
    content_name: product.title || product.name || '',
    content_type: 'product',
    value: Number.isFinite(price) ? price : 0,
    currency: 'INR',
  };
};

/**
 * Loads and initializes Meta Pixel once. Tracking is intentionally best-effort:
 * checkout continues normally if the script is blocked or unavailable.
 */
export const initializeMetaPixel = () => {
  if (typeof window === 'undefined' || initialized) return;

  try {
    const existingFbq = window.fbq;
    if (typeof existingFbq !== 'function') {
      const fbq = (...args) => {
        fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      window.fbq = fbq;
      window._fbq = fbq;
    }

    window.fbq?.('init', PIXEL_ID);
    initialized = true;

    const hasPixelScript = document.querySelector(
      `script[data-meta-pixel-id="${PIXEL_ID}"], script[src^="${PIXEL_SCRIPT_SRC}"]`,
    );
    if (!hasPixelScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = PIXEL_SCRIPT_SRC;
      script.dataset.metaPixelId = PIXEL_ID;
      script.onerror = () => {
        // Tracking is optional. Never surface a Pixel load failure to checkout.
      };
      document.head.appendChild(script);
    }
  } catch (_) {
    // Privacy tools and network failures must not affect the application.
  }
};

const track = (eventName, payload) => {
  try {
    if (typeof window === 'undefined') return;
    initializeMetaPixel();
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName, payload);
    }
  } catch (_) {
    // Meta Pixel is non-critical analytics.
  }
};

export const trackPageView = () => track('PageView');

export const trackViewContent = (product) => track('ViewContent', getProductPayload(product));

export const trackInitiateCheckout = (product) => {
  const { content_type, ...payload } = getProductPayload(product);
  track('InitiateCheckout', payload);
};

export const trackPurchase = (product, orderId) => {
  track('Purchase', {
    ...getProductPayload(product),
    order_id: orderId,
  });
};
