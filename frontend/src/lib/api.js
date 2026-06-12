import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
export const API = `${BACKEND_URL}/api`;

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

export const fetchProducts = async () => {
  const { data } = await api.get('/products');
  return data;
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

export const adminLogout = async () => {
  const { data } = await adminApi.post('/admin/logout');
  return data;
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
export const uploadAdminFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await adminApi.post('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteAdminMedia = async (mediaId) => {
  const { data } = await adminApi.delete(`/admin/media/${mediaId}`);
  return data;
};

// ---------------- Customer auth ----------------
export const customerApi = axios.create({
  baseURL: API,
  timeout: 15000,
});

export const setCustomerAuthToken = (token) => {
  if (token) {
    customerApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete customerApi.defaults.headers.common.Authorization;
  }
};

export const customerRegister = async (payload) => {
  const { data } = await customerApi.post('/auth/register', payload);
  return data;
};

export const customerLogin = async (payload) => {
  const { data } = await customerApi.post('/auth/login', payload);
  return data;
};

export const customerMe = async () => {
  const { data } = await customerApi.get('/auth/me');
  return data;
};

export const customerLogout = async () => {
  try {
    await customerApi.post('/auth/logout');
  } catch (_) {}
};

export const customerMyOrders = async () => {
  const { data } = await customerApi.get('/auth/my-orders');
  return data;
};

export const customerMyDownloads = async () => {
  const { data } = await customerApi.get('/auth/my-downloads');
  return data;
};

export const customerChangePassword = async (payload) => {
  const { data } = await customerApi.post('/auth/change-password', payload);
  return data;
};

export const customerClaimFree = async (product_slug) => {
  const { data } = await customerApi.post('/auth/claim-free', { product_slug });
  return data;
};

export const customerCheckoutInit = async (product_slug) => {
  const { data } = await customerApi.post('/auth/checkout/init', { product_slug });
  return data;
};

export const createFreeOrder = async (payload) => {
  const { data } = await api.post('/payments/free-order', payload);
  return data;
};

export const fetchProductBySlug = async (slug) => {
  const { data } = await api.get(`/products/${slug}`);
  return data;
};
