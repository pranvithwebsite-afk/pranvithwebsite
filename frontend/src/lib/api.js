import axios from 'axios';
import { decodeCmsText, normalizeCmsTextBeforeSave } from './utils';

const normalizeBackendUrl = (value) => {
  const base = String(value || '').trim().replace(/\/$/, '');
  return base.endsWith('/api') ? base.slice(0, -4) : base;
};

const getInitialBackendUrl = () => {
  const envUrl = process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8000';
  }
  return '';
};

const BACKEND_URL = normalizeBackendUrl(getInitialBackendUrl());
export const API = `${BACKEND_URL}/api`;
export const ADMIN_API = `${BACKEND_URL}/api`;
const DEVELOPMENT_CATALOG_API = 'https://pranvithdop.com/api';
const USE_DEVELOPMENT_CATALOG = process.env.NODE_ENV === 'development';
const sessionCache = new Map();

const cachedRequest = async (key, request, ttlMs = 5 * 60 * 1000) => {
  const now = Date.now();
  const cached = sessionCache.get(key);
  if (cached && cached.expires > now) {
    return cached.value;
  }
  if (cached?.promise) return cached.promise;

  const promise = request()
    .then((value) => {
      sessionCache.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .catch((error) => {
      sessionCache.delete(key);
      throw error;
    });
  sessionCache.set(key, { promise, expires: now + ttlMs });
  return promise;
};

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
    hero_image: '',
    images: [],
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
  baseURL: ADMIN_API,
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

export const fetchPublicSettings = async () => {
  const { data } = await api.get('/settings', { headers: { 'Cache-Control': 'no-cache' } });
  console.debug('[public-api] settings response', { keys: Object.keys(data || {}).length });
  return data;
};

export const askCameraAi = async (message, history = []) => {
  try {
    const { data } = await api.post('/ai/camera-assistant', { message, history });
    return data?.response || 'No response received from AI.';
  } catch (error) {
    console.warn('[ai] Backend AI call failed, generating locally', error);
    const q = (message || '').toLowerCase();
    if (q.includes('sony') || q.includes('slog') || q.includes('s-log') || q.includes('fx3')) {
      return "🎥 **Sony S-Log3 Cinematography Recipe:**\n\n• **Base ISO:** ISO 800 (Base 1) or ISO 12,800 (Base 2 on FX3/A7S III).\n• **Exposure:** Expose to the right (+1.7 EV) for noise-free shadow detail.\n• **Gamut:** S-Gamut3.Cine for cinematic colors.\n• **Shutter:** 1/50s at 24fps or 1/100s at 50/60fps.";
    }
    if (q.includes('canon') || q.includes('clog') || q.includes('c-log') || q.includes('r6')) {
      return "🎥 **Canon C-Log3 Recipe (R5/R6):**\n\n• **Base ISO:** ISO 800 Native.\n• **Exposure:** +1.0 to +1.3 EV.\n• **Gamut:** Cinema Gamut.\n• **Color Transform:** CST node in DaVinci Resolve to Rec.709.";
    }
    if (q.includes('slow') || q.includes('60fps') || q.includes('120fps')) {
      return "⚡ **Cinematic Slow Motion (60fps/120fps):**\n\n• **60fps:** Shutter 1/120s (180° rule).\n• **120fps:** Shutter 1/240s.\n• **Aperture:** Open by 1.5 stops or increase Base ISO to compensate for faster shutter speed.";
    }
    return `🎬 **Pranvith Camera AI:**\n\n• **Recommended Settings:** 10-Bit 4:2:2 Log, 180° Shutter Angle, Manual Kelvin White Balance.\n• **Exposure Tip:** Always expose Log curves above middle grey (+1.5 EV) for maximum dynamic range and cleaner color grading!`;
  }
};

const fetchDevelopmentCatalog = async (path, { signal } = {}) => {
  const { data } = await axios.get(`${DEVELOPMENT_CATALOG_API}${path}`, {
    timeout: 15000,
    signal,
  });
  return data;
};

const getFallbackProductBySlug = (slug) =>
  FALLBACK_PRODUCTS.find((product) => product.slug === slug);

export const fetchProducts = async ({ signal } = {}) => {
  try {
    const { data } = await api.get('/products', { signal });
    const decoded = decodeCmsText(data);
    if (Array.isArray(decoded) && decoded.length > 0) {
      return decoded;
    }
  } catch (error) {
    logApiError('primary products request', error);
  }

  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    try {
      const { data } = await axios.get('http://localhost:8000/api/products', { signal, timeout: 5000 });
      const decoded = decodeCmsText(data);
      if (Array.isArray(decoded) && decoded.length > 0) {
        return decoded;
      }
    } catch (err) {
      logApiError('local backend fallback', err);
    }
  }

  try {
    const data = decodeCmsText(await fetchDevelopmentCatalog('/products', { signal }));
    if (Array.isArray(data) && data.length > 0) return data;
  } catch (err) {
    logApiError('development catalog products fallback', err);
  }

  return FALLBACK_PRODUCTS;
};

export const fetchPageBySlug = async (slug) => {
  const { data } = await api.get(`/pages/${slug}`);
  return data;
};

export const fetchServices = async ({ signal } = {}) => {
  const { data } = await api.get('/services', { signal });
  console.debug('[public-api] services response', { count: Array.isArray(data) ? data.length : 0 });
  return data;
};

export const fetchServiceBySlug = async (slug) => {
  return cachedRequest(`services:detail:${slug}`, async () => {
    const { data } = await api.get(`/services/${encodeURIComponent(slug)}`);
    return data;
  }, 5 * 60 * 1000);
};

export const fetchCmsPage = async (pageKey, { signal } = {}) => {
  // CMS content is published data, not catalogue data. Never serve an older
  // in-memory response after an editor publishes a page.
  const { data } = await api.get(`/cms/pages/${encodeURIComponent(pageKey)}`, {
    headers: { 'Cache-Control': 'no-cache' }, signal,
  });
  const decoded = decodeCmsText(data);
  console.debug('[public-api] cms response', { pageKey, sections: Array.isArray(decoded?.sections) ? decoded.sections.length : 0 });
  return decoded;
};

export const invalidateCmsPageCache = (pageKey) => {
  sessionCache.delete(`cms:${pageKey}`);
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

export const changeAdminPassword = async (payload) => {
  const { data } = await adminApi.post('/admin/change-password', payload);
  return data;
};

export const fetchAdminUsers = async () => {
  const { data } = await adminApi.get('/admin/users');
  return data;
};

export const createAdminUser = async (payload) => {
  const { data } = await adminApi.post('/admin/users', payload);
  return data;
};

export const updateAdminUser = async (adminId, payload) => {
  const { data } = await adminApi.put(`/admin/users/${encodeURIComponent(adminId)}`, payload);
  return data;
};

export const resetAdminUserPassword = async (adminId, payload) => {
  const { data } = await adminApi.post(`/admin/users/${encodeURIComponent(adminId)}/reset-password`, payload);
  return data;
};

export const deleteAdminUser = async (adminId) => {
  const { data } = await adminApi.delete(`/admin/users/${encodeURIComponent(adminId)}`);
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

export const fetchAdminCmsPages = async () => {
  const { data } = await adminApi.get('/admin/cms/pages');
  return decodeCmsText(data);
};

export const fetchAdminCmsPage = async (pageKey) => {
  const { data } = await adminApi.get(`/admin/cms/pages/${encodeURIComponent(pageKey)}`);
  return decodeCmsText(data);
};

export const updateAdminCmsPage = async (pageKey, payload) => {
  const { data } = await adminApi.put(`/admin/cms/pages/${encodeURIComponent(pageKey)}`, normalizeCmsTextBeforeSave(payload));
  return decodeCmsText(data);
};

export const createAdminCmsSection = async (pageKey, payload) => {
  const { data } = await adminApi.post(`/admin/cms/pages/${encodeURIComponent(pageKey)}/sections`, normalizeCmsTextBeforeSave(payload));
  return decodeCmsText(data);
};

export const updateAdminCmsSection = async (sectionId, payload) => {
  const { data } = await adminApi.put(`/admin/cms/sections/${encodeURIComponent(sectionId)}`, normalizeCmsTextBeforeSave(payload));
  return decodeCmsText(data);
};

export const deleteAdminCmsSection = async (sectionId) => {
  const { data } = await adminApi.delete(`/admin/cms/sections/${encodeURIComponent(sectionId)}`);
  return data;
};

export const updateAdminCmsSectionVisibility = async (sectionId, enabled) => {
  const { data } = await adminApi.patch(`/admin/cms/sections/${encodeURIComponent(sectionId)}/visibility`, { enabled });
  return data;
};

export const reorderAdminCmsSections = async (pageKey, sections) => {
  const sectionOrders = (sections || []).map((section, index) => (
    typeof section === 'string'
      ? { id: section, sort_order: index + 1 }
      : { id: section.id, sort_order: section.sort_order ?? index + 1 }
  ));
  const { data } = await adminApi.patch(`/admin/cms/pages/${encodeURIComponent(pageKey)}/sections/reorder`, {
    section_ids: sectionOrders.map((section) => section.id),
    section_orders: sectionOrders,
  });
  return data;
};

export const fetchAdminProducts = async () => {
  const { data } = await adminApi.get('/admin/products');
  return decodeCmsText(data);
};

export const fetchAdminCoupons = async () => (await adminApi.get('/admin/coupons')).data;
export const createAdminCoupon = async (payload) => (await adminApi.post('/admin/coupons', payload)).data;
export const updateAdminCoupon = async (id, payload) => (await adminApi.patch(`/admin/coupons/${encodeURIComponent(id)}`, payload)).data;
export const deleteAdminCoupon = async (id) => (await adminApi.delete(`/admin/coupons/${encodeURIComponent(id)}`)).data;
export const fetchAdminCouponUsages = async (id) => (await adminApi.get(`/admin/coupons/${encodeURIComponent(id)}/usages`)).data;
export const validateCoupon = async (payload) => (await api.post('/coupons/validate', payload)).data;

export const fetchAdminServices = async () => {
  const { data } = await adminApi.get('/admin/services');
  return data;
};

export const createAdminService = async (payload) => {
  const { data } = await adminApi.post('/admin/services', payload);
  return data;
};

export const updateAdminService = async (serviceId, payload) => {
  const { data } = await adminApi.put(`/admin/services/${encodeURIComponent(serviceId)}`, payload);
  return data;
};

export const deleteAdminService = async (serviceId) => {
  const { data } = await adminApi.delete(`/admin/services/${encodeURIComponent(serviceId)}`);
  return data;
};

export const publishAdminService = async (serviceId, isPublished) => {
  const { data } = await adminApi.patch(`/admin/services/${encodeURIComponent(serviceId)}/publish`, { is_published: isPublished });
  return data;
};

export const reorderAdminServices = async (serviceIds) => {
  const { data } = await adminApi.patch('/admin/services/reorder', { service_ids: serviceIds });
  return data;
};

export const fetchAdminOrders = async () => {
  const { data } = await adminApi.get('/admin/orders');
  return data;
};

export const fetchAdminPaymentAttempts = async (status = 'all', search = '') => {
  const { data } = await adminApi.get('/admin/payments/payment-attempts', {
    params: {
      status,
      search,
    },
  });
  return data;
};

export const archiveInvalidPaymentAttempts = async (days = 7) => {
  const { data } = await adminApi.post('/admin/payments/payment-attempts/archive-invalid', { days });
  return data;
};

export const fetchAdminCustomers = async () => {
  const { data } = await adminApi.get('/admin/customers');
  return data;
};

export const fetchAdminReport = async (name, params = {}) => {
  const { data } = await adminApi.get(`/admin/reports/${encodeURIComponent(name)}`, { params });
  return data;
};

export const adminReportDownloadUrl = (format, params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString();
  return `${adminApi.defaults.baseURL}/admin/reports/export/${format}${query ? `?${query}` : ''}`;
};

export const downloadAdminOrdersExcelReport = async (params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString();
  const url = `${ADMIN_API}/admin/reports/orders/excel${query ? `?${query}` : ''}`;

  try {
    const response = await adminApi.get(url, {
      responseType: 'blob', // Important
    });

    // Create a link and trigger the download
    const link = document.createElement('a');
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    link.href = URL.createObjectURL(blob);
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'orders.xlsx'; // Default filename
    if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
            filename = filenameMatch[1];
        }
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    logApiError('downloadAdminOrdersExcelReport', error);
    throw error;
  }
};

export const downloadAdminPaymentsExcelReport = async (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString();
    const url = `${ADMIN_API}/admin/reports/payments/excel${query ? `?${query}` : ''}`;
  
    try {
      const response = await adminApi.get(url, {
        responseType: 'blob', // Important
      });
  
      // Create a link and trigger the download
      const link = document.createElement('a');
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      link.href = URL.createObjectURL(blob);
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'payments.xlsx'; // Default filename
      if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
          if (filenameMatch && filenameMatch.length > 1) {
              filename = filenameMatch[1];
          }
      }
  
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      logApiError('downloadAdminPaymentsExcelReport', error);
      throw error;
    }
  };

export const fetchAdminEnquiries = async () => {
  const { data } = await adminApi.get('/admin/enquiries');
  return data;
};

export const updateAdminEnquiryStatus = async (enquiryId, status) => {
  const { data } = await adminApi.patch(`/admin/enquiries/${encodeURIComponent(enquiryId)}/status`, { status });
  return data;
};

export const deleteAdminEnquiry = async (enquiryId) => {
  const { data } = await adminApi.delete(`/admin/enquiries/${encodeURIComponent(enquiryId)}`);
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

export const recheckRazorpayPayments = async () => {
  const { data } = await adminApi.post('/admin/orders/recheck-razorpay');
  return data;
};

export const fetchAdminMedia = async () => {
  const { data } = await adminApi.get('/admin/media');
  return data;
};

export const fetchAdminMediaUsage = async (mediaId) => {
  const { data } = await adminApi.get(`/admin/media/${encodeURIComponent(mediaId)}/usage`);
  return data;
};

export const removeDuplicateAdminMedia = async () => {
  const { data } = await adminApi.post('/admin/media/remove-duplicates');
  return data;
};

export const fetchAdminSettings = async () => {
  const { data } = await adminApi.get('/admin/settings');
  return data;
};

export const fetchAdminRazorpayHealth = async () => {
  const { data } = await adminApi.get('/admin/debug/razorpay-health');
  return data;
};

export const fetchAdminR2Health = async () => {
  const { data } = await adminApi.get('/admin/debug/r2-health');
  return data;
};

export const saveAdminSettings = async (payload) => {
  const { data } = await adminApi.post('/admin/settings', payload);
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
  if (typeof detail === 'object') {
    try { return JSON.stringify(detail); } catch (_) { return String(detail); }
  }
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
  return decodeCmsText(data);
};

export const createAdminProduct = async (payload) => {
  const { data } = await adminApi.post('/admin/products', normalizeCmsTextBeforeSave(payload));
  return decodeCmsText(data);
};

export const updateAdminProduct = async (productId, payload) => {
  const { data } = await adminApi.put(`/admin/products/${productId}`, normalizeCmsTextBeforeSave(payload));
  return decodeCmsText(data);
};

export const uploadAdminProductMedia = async ({ file, type, productSlug, purpose, onUploadProgress }) => {
  return uploadAdminImageToR2({ file, purpose, productSlug, onUploadProgress });
};

export const uploadAdminImageToR2 = async ({ file, purpose = 'media-library-image', productSlug = '', onUploadProgress }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);
  if (productSlug) formData.append('product_slug', productSlug);
  const { data } = await adminApi.post('/admin/uploads/public', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    onUploadProgress,
  });
  return data;
};

export const uploadAdminPrivateDownload = async ({ file, productSlug, purpose, onUploadProgress }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('product_slug', productSlug);
  formData.append('purpose', purpose);
  const { data } = await adminApi.post('/admin/uploads/private', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
    onUploadProgress,
  });
  return data;
};

export const createProductPaymentLink = async (productId) => {
  const { data } = await adminApi.post(`/admin/products/${encodeURIComponent(productId)}/create-payment-link`);
  return data;
};

export const refreshProductPaymentLink = async (productId) => {
  const { data } = await adminApi.post(`/admin/products/${encodeURIComponent(productId)}/refresh-payment-link`);
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
  const { data } = await adminApi.post('/admin/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    onUploadProgress,
  });
  return data;
};

export const createAdminDirectVideoUpload = async ({
  filename,
  contentType,
  fileSize,
  purpose,
  slug,
  endpoint = '/admin/uploads/video/presign',
}) => {
  const payload = {
    filename,
    content_type: contentType,
    file_size: fileSize,
    purpose,
  };
  if (slug) payload.slug = slug;
  try {
    const { data } = await adminApi.post(endpoint, payload);
    return data;
  } catch (error) {
    const wrapped = new Error(error?.message || 'Could not create upload URL');
    wrapped.stage = 'presign';
    wrapped.originalError = error;
    wrapped.response = error?.response;
    wrapped.request = error?.request;
    throw wrapped;
  }
};

export const finalizeAdminDirectVideoUpload = async ({ key, url, filename, contentType, size, purpose, title }) => {
  try {
    const { data } = await adminApi.post('/admin/uploads/video/complete', {
      key,
      url,
      filename,
      content_type: contentType,
      size,
      purpose,
      title,
    });
    return data;
  } catch (error) {
    const wrapped = new Error(error?.message || 'Could not finalize upload');
    wrapped.stage = 'complete';
    wrapped.originalError = error;
    wrapped.response = error?.response;
    wrapped.request = error?.request;
    throw wrapped;
  }
};

export const uploadAdminVideoViaBackend = async ({ file, purpose, slug = '', title = '', onUploadProgress }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);
  if (slug) formData.append('slug', slug);
  if (title) formData.append('title', title);
  try {
    const { data } = await adminApi.post('/admin/uploads/video/fallback', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30 * 60 * 1000,
      onUploadProgress,
    });
    return data;
  } catch (error) {
    const wrapped = new Error(error?.message || 'Backend fallback upload failed');
    wrapped.stage = 'fallback';
    wrapped.originalError = error;
    wrapped.response = error?.response;
    wrapped.request = error?.request;
    throw wrapped;
  }
};

const shouldFallbackToBackendVideoUpload = (error) => (
  error?.stage === 'r2_put' && !error?.response?.status
);

export const uploadAdminVideoToR2 = async ({
  file,
  purpose,
  slug = '',
  title = '',
  onUploadProgress,
  onFallback,
  allowBackendFallback = true,
  presignEndpoint = '/admin/uploads/video/presign',
}) => {
  try {
    const signed = await createAdminDirectVideoUpload({
      filename: file.name,
      contentType: file.type,
      fileSize: file.size,
      purpose,
      slug,
      endpoint: presignEndpoint,
    });
    await uploadFileToSignedUrl({
      uploadUrl: signed.upload_url,
      file,
      headers: {
        'Content-Type': file.type,
        ...(signed.required_headers || signed.headers || {}),
      },
      onUploadProgress,
    });
    const completed = await finalizeAdminDirectVideoUpload({
      key: signed.key,
      url: signed.public_url,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      purpose,
      title: title || file.name,
    });
    return {
      ...completed,
      upload_strategy: 'direct',
      message: completed?.message || 'Video uploaded directly to Cloudflare R2.',
    };
  } catch (directError) {
    if (!shouldFallbackToBackendVideoUpload(directError) || !allowBackendFallback) {
      throw directError;
    }
    onFallback?.(directError);
    try {
      const fallback = await uploadAdminVideoViaBackend({
        file,
        purpose,
        slug,
        title: title || file.name,
        onUploadProgress,
      });
      return {
        ...fallback,
        upload_strategy: 'backend-fallback',
        message: fallback?.message || 'Video uploaded via backend fallback.',
      };
    } catch (fallbackError) {
      const wrapped = new Error('Browser upload to Cloudflare R2 failed, and backend fallback upload also failed.');
      wrapped.stage = 'fallback_combined';
      wrapped.directError = directError;
      wrapped.fallbackError = fallbackError;
      wrapped.originalError = fallbackError?.originalError || fallbackError;
      wrapped.response = fallbackError?.response;
      wrapped.request = fallbackError?.request;
      throw wrapped;
    }
  }
};

export const uploadFileToSignedUrl = async ({ uploadUrl, file, headers = {}, onUploadProgress }) => {
  try {
    const { data } = await axios.put(uploadUrl, file, {
      headers,
      timeout: 30 * 60 * 1000,
      onUploadProgress,
      withCredentials: false,
      transformRequest: [(value) => value],
    });
    return data;
  } catch (error) {
    const wrapped = new Error(error?.message || 'R2 upload failed');
    wrapped.stage = 'r2_put';
    wrapped.originalError = error;
    wrapped.response = error?.response;
    wrapped.request = error?.request;
    throw wrapped;
  }
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
  return cachedRequest(`products:detail:${slug}`, async () => {
  const path = `/products/${encodeURIComponent(slug)}`;
  if (USE_DEVELOPMENT_CATALOG && !BACKEND_URL) {
    try {
      return decodeCmsText(await fetchDevelopmentCatalog(path));
    } catch (error) {
      logApiError(`development catalog product fallback slug=${slug}`, error);
      const fallbackProduct = getFallbackProductBySlug(slug);
      if (fallbackProduct) return decodeCmsText(fallbackProduct);
      throw error;
    }
  }

  try {
    const { data } = await api.get(path);
    return decodeCmsText(data);
  } catch (error) {
    logApiError(`product request slug=${slug}`, error);
    if (USE_DEVELOPMENT_CATALOG) {
      try {
        return decodeCmsText(await fetchDevelopmentCatalog(path));
      } catch (fallbackError) {
        logApiError(`development catalog product fallback slug=${slug}`, fallbackError);
      }
    }
    const fallbackProduct = getFallbackProductBySlug(slug);
    if (fallbackProduct) return decodeCmsText(fallbackProduct);
    throw error;
  }
  }, 3 * 60 * 1000);
};

export const fetchOrderAccess = async (orderId, token) => {
  const { data } = await api.get(`/orders/${encodeURIComponent(orderId)}/access`, {
    params: { token },
  });
  return data;
};

export const customerApi = axios.create({ baseURL: API, timeout: 15000 });
export const setCustomerAuthToken = (token) => {
  if (token) customerApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete customerApi.defaults.headers.common.Authorization;
};
export const requestCustomerOtp = async (email) => (await api.post('/account/auth/request-otp', { email })).data;
export const verifyCustomerOtp = async (email, code) => (await api.post('/account/auth/verify-otp', { email, code })).data;
export const fetchCustomerDashboard = async () => (await customerApi.get('/account/dashboard')).data;
export const fetchCustomerOrders = async (params) => (await customerApi.get('/account/orders', { params })).data;
export const fetchCustomerOrder = async (id) => (await customerApi.get(`/account/orders/${encodeURIComponent(id)}`)).data;
export const customerDownloadLink = async (id) => (await customerApi.post(`/account/orders/${encodeURIComponent(id)}/download-link`)).data;
