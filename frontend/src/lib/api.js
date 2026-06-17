import axios from 'axios';

const normalizeBackendUrl = (value) => {
  const base = String(value || '').trim().replace(/\/$/, '');
  return base.endsWith('/api') ? base.slice(0, -4) : base;
};

const BACKEND_URL = normalizeBackendUrl(
  process.env.VITE_BACKEND_URL
  || process.env.REACT_APP_BACKEND_URL
  || ''
);
export const API = `${BACKEND_URL}/api`;
const DEVELOPMENT_CATALOG_API = 'https://pranvithdop.com/api';
const USE_DEVELOPMENT_CATALOG = process.env.NODE_ENV === 'development';

const FALLBACK_PRODUCTS = [
  {
    id: 'fallback-vo',
    slug: 'vo',
    name: 'VO Asset',
    title: 'VO Asset',
    category: 'Asset',
    price: 0,
    sale_price: 0,
    is_free: true,
    description: 'A PranvithDOP asset. Live catalog details load from the backend when available.',
    hero_image: '/assets/brand-profile.png',
    images: ['/assets/brand-profile.png'],
    published: true,
    created_at: '2026-01-01T00:00:00+00:00',
  },
  {
    id: 'fallback-creative-lut-pack',
    slug: 'creative-lut-pack',
    name: 'Creative LUT Pack',
    title: 'Creative LUT Pack',
    category: 'LUTs',
    price: 499,
    sale_price: 499,
    is_free: false,
    description: 'Premium color looks for editors.',
    hero_image: '/assets/creative-luts.png',
    images: ['/assets/creative-luts.png'],
    published: true,
    created_at: '2026-01-01T00:00:00+00:00',
  },
  {
    id: 'fallback-cinematic-sound-fx-pack',
    slug: 'cinematic-sound-fx-pack',
    name: 'Cinematic Sound FX Pack',
    title: 'Cinematic Sound FX Pack',
    category: 'Sound',
    price: 299,
    sale_price: 299,
    is_free: false,
    description: 'Cinematic sound effects for video edits.',
    hero_image: '/assets/cinematic-sound-fx.png',
    images: ['/assets/cinematic-sound-fx.png'],
    published: true,
    created_at: '2026-01-01T00:00:00+00:00',
  },
];

const logApiError = (label, error) => {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail || error?.message || error;
  console.error(`[api] ${label} failed`, {
    baseURL: API || '/api',
    status,
    detail,
  });
};

export const api = axios.create({
  baseURL: API,
  timeout: 15000,
});

export const adminApi = axios.create({
  baseURL: API,
  timeout: 15000,
});

export const setAdminAuthToken = (token) => {
  if (token) {
    adminApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete adminApi.defaults.headers.common.Authorization;
  }
};

export const ADMIN_LOGIN_ENDPOINT = '/admin/login';

export const fetchCourses = async () => {
  const { data } = await api.get('/courses');
  return data;
};

export const fetchTestimonials = async () => {
  const { data } = await api.get('/testimonials');
  return data;
};

export const fetchFAQs = async () => {
  const { data } = await api.get('/faqs');
  return data;
};

const fetchDevelopmentCatalog = async (path) => {
  const { data } = await axios.get(`${DEVELOPMENT_CATALOG_API}${path}`, {
    timeout: 15000,
  });
  return data;
};

const getFallbackProductBySlug = (slug) =>
  FALLBACK_PRODUCTS.find((product) => product.slug === slug);

export const fetchProducts = async () => {
  if (USE_DEVELOPMENT_CATALOG && !BACKEND_URL) {
    try {
      return await fetchDevelopmentCatalog('/products');
    } catch (error) {
      logApiError('development catalog products fallback', error);
      return FALLBACK_PRODUCTS;
    }
  }

  try {
    const { data } = await api.get('/products');
    if (USE_DEVELOPMENT_CATALOG && Array.isArray(data) && data.length === 0) {
      try {
        return await fetchDevelopmentCatalog('/products');
      } catch (error) {
        logApiError('development catalog products fallback', error);
        return FALLBACK_PRODUCTS;
      }
    }
    return data;
  } catch (error) {
    logApiError('products request', error);
    if (USE_DEVELOPMENT_CATALOG) {
      try {
        return await fetchDevelopmentCatalog('/products');
      } catch (fallbackError) {
        logApiError('development catalog products fallback', fallbackError);
      }
    }
    return FALLBACK_PRODUCTS;
  }
};

export const fetchPageBySlug = async (slug) => {
  const { data } = await api.get(`/pages/${slug}`);
  return data;
};

export const fetchPages = async () => {
  const { data } = await api.get('/pages');
  return data;
};

export const submitHireRequest = async (payload) => {
  const { data } = await api.post('/hire', payload);
  return data;
};

export const subscribeNewsletter = async (email) => {
  const { data } = await api.post('/subscribe', { email });
  return data;
};

export const adminLogin = async (payload) => {
  const { data } = await adminApi.post(ADMIN_LOGIN_ENDPOINT, payload);
  return data;
};

export const fetchAdminMe = async () => {
  const { data } = await adminApi.get('/admin/me');
  return data;
};

export const fetchAdminDashboardStats = async () => {
  const { data } = await adminApi.get('/admin/dashboard');
  return data;
};

export const fetchAdminPages = async () => {
  const { data } = await adminApi.get('/admin/pages');
  return data;
};

export const fetchAdminProducts = async () => {
  const { data } = await adminApi.get('/admin/products');
  return data;
};

export const fetchAdminOrders = async () => {
  const { data } = await adminApi.get('/admin/orders');
  return data;
};

export const fetchAdminCustomers = async () => {
  const { data } = await adminApi.get('/admin/customers');
  return data;
};

export const resendDownloadEmail = async (orderId) => {
  const { data } = await adminApi.post(`/admin/orders/${encodeURIComponent(orderId)}/resend-download-email`);
  return data;
};

export const syncRazorpayStatus = async (orderId) => {
  const { data } = await adminApi.post(`/admin/orders/${encodeURIComponent(orderId)}/sync-razorpay-status`);
  return data;
};

export const fetchAdminMedia = async () => {
  const { data } = await adminApi.get('/admin/media');
  return data;
};

export const fetchAdminSettings = async () => {
  const { data } = await adminApi.get('/admin/settings');
  return data;
};

export const saveAdminSettings = async (payload) => {
  const { data } = await adminApi.post('/admin/settings', payload);
  return data;
};

export const fetchAdminEnvCheck = async () => {
  const { data } = await adminApi.get('/admin/debug/env-check');
  return data;
};

export const adminLogout = async () => {
  const { data } = await adminApi.post('/admin/logout');
  return data;
};

export const formatApiErrorDetail = (detail) => {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (item && typeof item.msg === 'string' ? item.msg : JSON.stringify(item)))
      .filter(Boolean)
      .join(' ');
  }
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
};

// Admin Page Management
export const fetchAdminPage = async (pageId) => {
  const { data } = await adminApi.get(`/admin/pages/${pageId}`);
  return data;
};

export const createAdminPage = async (payload) => {
  const { data } = await adminApi.post('/admin/pages', payload);
  return data;
};

export const updateAdminPage = async (pageId, payload) => {
  const { data } = await adminApi.put(`/admin/pages/${pageId}`, payload);
  return data;
};

export const deleteAdminPage = async (pageId) => {
  const { data } = await adminApi.delete(`/admin/pages/${pageId}`);
  return data;
};

// Admin Product Management
export const fetchAdminProduct = async (productId) => {
  const { data } = await adminApi.get(`/admin/products/${productId}`);
  return data;
};

export const createAdminProduct = async (payload) => {
  const { data } = await adminApi.post('/admin/products', payload);
  return data;
};

export const updateAdminProduct = async (productId, payload) => {
  const { data } = await adminApi.put(`/admin/products/${productId}`, payload);
  return data;
};

export const deleteAdminProduct = async (productId) => {
  const { data } = await adminApi.delete(`/admin/products/${productId}`);
  return data;
};

// Admin Media Management
export const uploadAdminFile = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await adminApi.post('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return data;
};

export const deleteAdminMedia = async (mediaId) => {
  const { data } = await adminApi.delete(`/admin/media/${mediaId}`);
  return data;
};

export const createFreeOrder = async (payload) => {
  const { data } = await api.post('/payments/free-order', payload);
  return data;
};

export const fetchProductBySlug = async (slug) => {
  const path = `/products/${encodeURIComponent(slug)}`;
  if (USE_DEVELOPMENT_CATALOG && !BACKEND_URL) {
    try {
      return await fetchDevelopmentCatalog(path);
    } catch (error) {
      logApiError(`development catalog product fallback slug=${slug}`, error);
      const fallbackProduct = getFallbackProductBySlug(slug);
      if (fallbackProduct) return fallbackProduct;
      throw error;
    }
  }

  try {
    const { data } = await api.get(path);
    return data;
  } catch (error) {
    logApiError(`product request slug=${slug}`, error);
    if (USE_DEVELOPMENT_CATALOG) {
      try {
        return await fetchDevelopmentCatalog(path);
      } catch (fallbackError) {
        logApiError(`development catalog product fallback slug=${slug}`, fallbackError);
      }
    }
    const fallbackProduct = getFallbackProductBySlug(slug);
    if (fallbackProduct) return fallbackProduct;
    throw error;
  }
};

export const fetchOrderAccess = async (orderId, token) => {
  const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}/access`, {
    params: { token },
  });
  return data;
};
