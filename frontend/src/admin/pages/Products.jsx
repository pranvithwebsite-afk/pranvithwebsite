import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Save, X, Edit2, Trash2, Copy, Link, RefreshCw, Upload, PlayCircle } from 'lucide-react';
import {
  fetchAdminProducts,
  fetchAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  createProductPaymentLink,
  refreshProductPaymentLink,
  createAdminDirectVideoUpload,
  finalizeAdminDirectVideoUpload,
  uploadFileToSignedUrl,
  uploadAdminProductMedia,
  uploadAdminPrivateDownload,
  formatApiErrorDetail,
} from '../../lib/api';
import { toast } from 'sonner';
import SafeVideoEmbed from '../../components/SafeVideoEmbed';
import { useAdminConfirm } from '../components/AdminConfirmProvider';
import {
  ADMIN_IMAGE_UPLOAD_ACCEPT,
  ADMIN_VIDEO_UPLOAD_ACCEPT,
  ADMIN_VIDEO_UPLOAD_MAX_BYTES,
  formatMegabytes,
  formatUploadError,
  validateImageUploadFile,
  validateVideoUploadFile,
} from '../../lib/mediaUpload';

const defaultProductForm = {
  slug: '',
  name: '',
  category: '',
  price: 0,
  sale_price: 0,
  description: '',
  features: [],
  benefits: [],
  faqs: [],
  before_images: [],
  after_images: [],
  images: [],
  gallery_images: [],
  product_images: [],
  videos: [],
  video_type: '',
  youtube_url: '',
  video_url: '',
  image_url: '',
  thumbnail_url: '',
  preview_image_url: '',
  cover_image_url: '',
  before_image_url: '',
  after_image_url: '',
  download_file: '',
  download_file_url: '',
  download_file_key: '',
  download_file_name: '',
  download_file_bucket: '',
  create_razorpay_payment_link: false,
  razorpay_payment_link_id: '',
  razorpay_payment_link_url: '',
  razorpay_payment_link_status: '',
  seo_title: '',
  seo_description: '',
  published: true,
  product_url: '',
};

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const productUrlForSlug = (slug) => `/assets/${slug}`;

const adminRequestFailureMessage = (error, fallbackMessage) => {
  const status = error?.response?.status || 'NETWORK';
  const baseURL = String(error?.config?.baseURL || '').replace(/\/$/, '');
  const requestPath = error?.config?.url || '';
  const requestUrl = requestPath
    ? (requestPath.startsWith('http') ? requestPath : `${baseURL}${requestPath}`)
    : '';
  const backendMessage = error?.response?.data?.message || formatApiErrorDetail(error?.response?.data?.detail);
  return `${status} ${requestUrl || 'request'}: ${backendMessage || fallbackMessage}`;
};

const paymentLinkWarningMessage = (warning, fallbackMessage) => {
  if (!warning) return fallbackMessage;
  if (typeof warning === 'string') return warning;
  const code = warning?.code || 'UNKNOWN';
  const message = warning?.message || fallbackMessage;
  const detail = warning?.detail || '';
  return `${code}: ${message}${detail ? ` (${detail})` : ''}`;
};

const rejectUnsafeMediaUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    toast.error('javascript:, data:, and vbscript: URLs are not allowed');
    return '';
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https:\/\//i.test(trimmed)) {
    toast.error('Use HTTPS URLs for media fields');
    return '';
  }
  return trimmed;
};

const toImageList = (value) => (
  Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : []
);

const dedupeImageList = (items) => items.filter((item, index, list) => item && list.indexOf(item) === index);

const getMainProductImageUrl = (product = {}) => (
  String(
    product.image_url
    || product.preview_image_url
    || product.cover_image_url
    || product.thumbnail_url
    || product.hero_image
    || ''
  ).trim()
);

const getGalleryImageCandidates = (product = {}) => {
  const mainImageUrl = getMainProductImageUrl(product);
  const excluded = new Set([mainImageUrl].filter(Boolean));
  return dedupeImageList([
    ...toImageList(product.gallery),
    ...toImageList(product.gallery_images),
  ]).filter((item) => !excluded.has(item));
};

const normalizeProductForForm = (product = {}) => {
  const galleryImages = getGalleryImageCandidates(product);
  const mainImageUrl = getMainProductImageUrl(product);
  return {
    ...defaultProductForm,
    ...product,
    image_url: mainImageUrl,
    thumbnail_url: String(product.thumbnail_url || '').trim(),
    preview_image_url: String(product.preview_image_url || '').trim(),
    cover_image_url: String(product.cover_image_url || '').trim(),
    gallery_images: galleryImages,
    product_images: galleryImages,
    images: galleryImages,
    video_type: product.video_type || '',
    youtube_url: product.youtube_url || '',
    video_url: product.video_url || '',
    before_image_url: product.before_image_url || '',
    after_image_url: product.after_image_url || '',
    download_file: product.download_file || product.download_file_url || '',
    download_file_url: product.download_file_url || product.download_file || '',
    download_file_key: product.download_file_key || '',
    download_file_name: product.download_file_name || '',
    download_file_bucket: product.download_file_bucket || '',
  };
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(defaultProductForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [paymentLinkLoading, setPaymentLinkLoading] = useState({});
  const confirm = useAdminConfirm();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async ({ showToast = true } = {}) => {
    try {
      setLoading(true);
      const data = await fetchAdminProducts();
      setProducts(Array.isArray(data) ? data : []);
      setError('');
    } catch (error) {
      console.error('[admin/products] Failed to load products', error?.response?.data?.detail || error?.message || error);
      if (showToast) toast.error('Failed to load products');
      setProducts([]);
      setError('Products could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const openNewForm = () => {
    setFormData({ ...defaultProductForm });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = async (product) => {
    try {
      const fullProduct = await fetchAdminProduct(product.id);
      setFormData(normalizeProductForForm(fullProduct));
      setEditingId(product.id);
      setShowForm(true);
    } catch (error) {
      toast.error('Failed to load product details');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({ ...defaultProductForm });
    setEditingId(null);
  };

  const handleSave = async () => {
    if (saving) return;
    const slug = normalizeSlug(formData.slug || formData.name);
    const mainImageUrl = rejectUnsafeMediaUrl(formData.image_url);
    const payload = {
      ...formData,
      slug,
      product_url: productUrlForSlug(slug),
      gallery_images: formData.gallery_images || [],
      images: formData.gallery_images || formData.images || [],
      product_images: formData.gallery_images || formData.images || [],
      image_url: mainImageUrl,
      thumbnail_url: mainImageUrl,
      preview_image_url: mainImageUrl,
      cover_image_url: mainImageUrl,
      youtube_url: rejectUnsafeMediaUrl(formData.youtube_url),
      video_url: rejectUnsafeMediaUrl(formData.video_url),
      before_image_url: rejectUnsafeMediaUrl(formData.before_image_url),
      after_image_url: rejectUnsafeMediaUrl(formData.after_image_url),
      download_file: rejectUnsafeMediaUrl(formData.download_file),
      download_file_url: rejectUnsafeMediaUrl(formData.download_file_url || formData.download_file),
    };
    if (!payload.slug || !payload.name || payload.price === '' || Number.isNaN(Number(payload.price))) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        const result = await updateAdminProduct(editingId, payload);
        toast[result?.warning ? 'warning' : 'success'](result?.warning ? paymentLinkWarningMessage(result.warning, 'Product saved successfully') : 'Product saved successfully');
      } else {
        const result = await createAdminProduct(payload);
        toast[result?.warning ? 'warning' : 'success'](result?.warning ? paymentLinkWarningMessage(result.warning, 'Product saved successfully') : 'Product saved successfully');
      }
      closeForm();
      try {
        await loadProducts({ showToast: false });
      } catch (refreshError) {
        console.warn('[admin/products] Product saved but refresh failed', refreshError?.response?.data?.detail || refreshError?.message || refreshError);
      }
    } catch (error) {
      console.error('[admin/products] Failed to save product', error?.response?.data?.detail || error?.message || error);
      toast.error(error?.response?.data?.detail || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const product = products.find((item) => item.id === id);
    await confirm({
      title: 'Delete product?',
      itemName: product?.name || product?.title || 'Selected product',
      message: 'This will remove the product from the catalog. Payment logic is not changed, but this product entry will no longer be available in admin or on the website.',
      confirmText: 'Delete',
      loadingText: 'Deleting...',
      onConfirm: async () => {
        try {
          await deleteAdminProduct(id);
          toast.success('Product deleted');
          setProducts((items) => items.filter((item) => item.id !== id));
        } catch (error) {
          toast.error('Failed to delete product');
          return false;
        }
        return true;
      },
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const nextValue = type === 'checkbox' ? checked : type === 'number' ? Number(value) : value;
      const next = {
        ...prev,
        [name]: name === 'slug' ? normalizeSlug(nextValue) : nextValue,
      };
      if (name === 'name' && !prev.slug) {
        next.slug = normalizeSlug(nextValue);
      }
      return next;
    });
  };

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...((name === 'gallery_images' || name === 'images') ? { images: value } : {}),
      ...(name === 'gallery_images' ? { product_images: value } : {}),
    }));
  };

  const handleCopyPaymentLink = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Payment Link copied');
    } catch (_) {
      toast.error('Could not copy Payment Link');
    }
  };

  const handleCreatePaymentLink = async (id) => {
    setPaymentLinkLoading((prev) => ({ ...prev, [`create:${id}`]: true }));
    try {
      const result = await createProductPaymentLink(id);
      toast.success(result?.created ? 'Payment Link created' : 'Payment Link already exists');
      await loadProducts({ showToast: false });
    } catch (error) {
      toast.error(adminRequestFailureMessage(error, 'Could not create Payment Link'));
    } finally {
      setPaymentLinkLoading((prev) => ({ ...prev, [`create:${id}`]: false }));
    }
  };

  const handleRefreshPaymentLink = async (id) => {
    setPaymentLinkLoading((prev) => ({ ...prev, [`refresh:${id}`]: true }));
    try {
      await refreshProductPaymentLink(id);
      toast.success('Payment Link status refreshed');
      await loadProducts({ showToast: false });
    } catch (error) {
      toast.error(adminRequestFailureMessage(error, 'Could not refresh Payment Link'));
    } finally {
      setPaymentLinkLoading((prev) => ({ ...prev, [`refresh:${id}`]: false }));
    }
  };

  const handleArrayAdd = (field, item) => {
    if (!item.trim()) return;
    const cleanItem = rejectUnsafeMediaUrl(item);
    if (!cleanItem) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), cleanItem],
      ...((field === 'gallery_images' || field === 'images') ? { images: [...(prev[field] || []), cleanItem] } : {}),
      ...(field === 'gallery_images' ? { product_images: [...(prev[field] || []), cleanItem] } : {}),
    }));
  };

  const handleArrayRemove = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field]?.filter((_, i) => i !== index) || [],
      ...((field === 'gallery_images' || field === 'images') ? { images: prev[field]?.filter((_, i) => i !== index) || [] } : {}),
      ...(field === 'gallery_images' ? { product_images: prev[field]?.filter((_, i) => i !== index) || [] } : {}),
    }));
  };

  if (showForm) {
    return (
      <ProductForm
        formData={formData}
        onInputChange={handleInputChange}
        onFieldChange={handleFieldChange}
        onArrayAdd={handleArrayAdd}
        onArrayRemove={handleArrayRemove}
        onSave={handleSave}
        onClose={closeForm}
        saving={saving}
        isEdit={!!editingId}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/95 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="text-3xl font-semibold text-white">Products</h1>
          <p className="mt-3 text-slate-400">Manage your product catalog.</p>
          <p className="mt-2 text-sm text-slate-500">Products are stored in website CMS. Razorpay Orders are created automatically during checkout.</p>
          <p className="mt-1 text-sm text-slate-500">Website checkout uses Razorpay Orders automatically. Payment Links are optional for manual sharing.</p>
        </div>
        <button
          onClick={openNewForm}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500 sm:w-auto"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400">Loading products...</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-rose-100">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-center text-slate-400">No products. Add one to get started!</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isCreatingPaymentLink = !!paymentLinkLoading[`create:${product.id}`];
            const isRefreshingPaymentLink = !!paymentLinkLoading[`refresh:${product.id}`];
            return (
              <div key={product.id} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white line-clamp-2">{product.name}</h2>
              <p className="mt-2 text-sm text-slate-500">₹{product.price}</p>
              {product.sale_price && (
                <p className="text-xs text-green-400">Sale: ₹{product.sale_price}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {product.published ? '✓ Published' : 'Draft'}
              </p>
              {product.razorpay_payment_link_url ? (
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <p className="text-xs font-semibold text-slate-300">Razorpay Payment Link</p>
                  <a href={product.razorpay_payment_link_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-violet-300">
                    {product.razorpay_payment_link_url}
                  </a>
                  <p className="mt-1 text-xs text-slate-500">Status: {product.razorpay_payment_link_status || 'unknown'}</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-600">No optional Payment Link</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEditForm(product)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {product.razorpay_payment_link_url && (
                  <button
                    onClick={() => handleCopyPaymentLink(product.razorpay_payment_link_url)}
                    className="flex items-center justify-center gap-1 rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    <Copy size={13} />
                    Copy Payment Link
                  </button>
                )}
                <button
                  onClick={() => handleCreatePaymentLink(product.id)}
                  disabled={isCreatingPaymentLink}
                  className="flex items-center justify-center gap-1 rounded bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Link size={13} />
                  {isCreatingPaymentLink ? 'Creating...' : 'Create Payment Link'}
                </button>
                {product.razorpay_payment_link_id && (
                  <button
                    onClick={() => handleRefreshPaymentLink(product.id)}
                    disabled={isRefreshingPaymentLink}
                    className="flex items-center justify-center gap-1 rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw size={13} />
                    {isRefreshingPaymentLink ? 'Refreshing...' : 'Refresh Status'}
                  </button>
                )}
              </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const ProductForm = ({
  formData,
  onInputChange,
  onFieldChange,
  onArrayAdd,
  onArrayRemove,
  onSave,
  onClose,
  saving,
  isEdit,
}) => {
  const [newArrayItems, setNewArrayItems] = useState({
    features: '',
    benefits: '',
    before_images: '',
    after_images: '',
    images: '',
    gallery_images: '',
    product_images: '',
    videos: '',
  });
  const [uploading, setUploading] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedVideoSize, setSelectedVideoSize] = useState('');

  const currentSlug = normalizeSlug(formData.slug || formData.name);

  const uploadMedia = async ({ file, type, purpose, targetField, append = false }) => {
    if (!file) return;
    if (!currentSlug) {
      toast.error('Add a product name or slug before uploading');
      return;
    }
    const uploadKey = `${purpose}-${targetField}`;
    try {
      if (type === 'image') {
        setSelectedVideoSize('');
        const imageError = validateImageUploadFile(file);
        if (imageError) {
          toast.error(imageError);
          return;
        }
      }
      if (type === 'video') {
        setSelectedVideoSize(formatMegabytes(file.size));
        const videoError = validateVideoUploadFile(file);
        if (videoError) {
          toast.error(videoError);
          return;
        }
      }
      setUploading((prev) => ({ ...prev, [uploadKey]: true }));
      setUploadProgress((prev) => ({ ...prev, [uploadKey]: 0 }));
      const onUploadProgress = (event) => {
        if (!event.total) return;
        setUploadProgress((prev) => ({
          ...prev,
          [uploadKey]: Math.round((event.loaded * 100) / event.total),
        }));
      };
      let result;
      if (type === 'video') {
        const signed = await createAdminDirectVideoUpload({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          purpose: 'product-video',
          slug: currentSlug,
        });
        await uploadFileToSignedUrl({
          uploadUrl: signed.upload_url,
          file,
          headers: signed.required_headers || signed.headers || {},
          onUploadProgress,
        });
        result = await finalizeAdminDirectVideoUpload({
          key: signed.key,
          url: signed.public_url,
          filename: file.name,
          contentType: file.type,
          size: file.size,
          purpose: 'product-video',
          title: file.name,
        });
      } else {
        result = await uploadAdminProductMedia({
          file,
          type,
          purpose,
          productSlug: currentSlug,
          onUploadProgress,
        });
      }
      const nextUrl = result?.media?.public_url || result?.media?.url || result?.url;
      if (append) {
        onFieldChange(targetField, [...(formData[targetField] || []), nextUrl]);
      } else {
        onFieldChange(targetField, nextUrl);
      }
      toast.success('Upload complete');
    } catch (error) {
      console.warn('[admin/products] upload failed', {
        stage: error?.stage || 'unknown',
        status: error?.response?.status || error?.originalError?.response?.status || null,
        detail: error?.response?.data?.detail || error?.originalError?.response?.data?.detail || error?.message || error,
      });
      toast.error(formatUploadError(error));
    } finally {
      setUploading((prev) => ({ ...prev, [uploadKey]: false }));
    }
  };

  const uploadPrivateDownload = async (file) => {
    if (!file) return;
    if (!currentSlug) {
      toast.error('Add a product name or slug before uploading');
      return;
    }
    const uploadKey = 'private-download';
    try {
      setUploading((prev) => ({ ...prev, [uploadKey]: true }));
      setUploadProgress((prev) => ({ ...prev, [uploadKey]: 0 }));
      const result = await uploadAdminPrivateDownload({
        file,
        productSlug: currentSlug,
        purpose: 'paid-download',
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress((prev) => ({
            ...prev,
            [uploadKey]: Math.round((event.loaded * 100) / event.total),
          }));
        },
      });
      onFieldChange('download_file_key', result.key);
      onFieldChange('download_file_name', result.filename);
      onFieldChange('download_file_bucket', result.bucket);
      toast.success('Private download uploaded');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Private upload failed');
    } finally {
      setUploading((prev) => ({ ...prev, [uploadKey]: false }));
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/95 p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h1>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition flex items-center justify-center"
        >
          <X size={18} />
        </button>
      </div>

      <div className="max-w-3xl space-y-6 rounded-3xl border border-slate-800 bg-slate-950 p-4 sm:p-6">
        {/* Basic Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onInputChange}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Slug *</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={onInputChange}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Category</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={onInputChange}
            placeholder="e.g., LUT Pack"
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Price (₹)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={onInputChange}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Sale Price (₹)</label>
            <input
              type="number"
              name="sale_price"
              value={formData.sale_price}
              onChange={onInputChange}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={onInputChange}
            rows={3}
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>

        <PrivateDownloadSection
          formData={formData}
          onInputChange={onInputChange}
          onFieldChange={onFieldChange}
          uploading={!!uploading['private-download']}
          progress={uploadProgress['private-download']}
          onUpload={uploadPrivateDownload}
        />

        <MainProductImagesSection
          formData={formData}
          onInputChange={onInputChange}
          onFieldChange={onFieldChange}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onUploadMain={(file) => uploadMedia({
            file,
            type: 'image',
            purpose: 'product-image',
            targetField: 'image_url',
          })}
        />

        <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
          <input
            type="checkbox"
            name="create_razorpay_payment_link"
            checked={!!formData.create_razorpay_payment_link}
            onChange={onInputChange}
            className="mt-1 h-4 w-4 rounded"
          />
          <span>
            <span className="block font-semibold text-white">Also create Razorpay Payment Link after save</span>
            <span className="mt-1 block text-slate-500">Leave this off for normal product saves. Website checkout uses Razorpay Orders automatically, and the manual Create Payment Link button remains available separately.</span>
          </span>
        </label>

        {/* Arrays Editor */}
        <ArrayEditor
          label="Features"
          items={formData.features}
          newItem={newArrayItems.features}
          onNewItemChange={(val) => setNewArrayItems((p) => ({ ...p, features: val }))}
          onAdd={() => {
            onArrayAdd('features', newArrayItems.features);
            setNewArrayItems((p) => ({ ...p, features: '' }));
          }}
          onRemove={(idx) => onArrayRemove('features', idx)}
        />

        <ArrayEditor
          label="Benefits"
          items={formData.benefits}
          newItem={newArrayItems.benefits}
          onNewItemChange={(val) => setNewArrayItems((p) => ({ ...p, benefits: val }))}
          onAdd={() => {
            onArrayAdd('benefits', newArrayItems.benefits);
            setNewArrayItems((p) => ({ ...p, benefits: '' }));
          }}
          onRemove={(idx) => onArrayRemove('benefits', idx)}
        />

        <ArrayEditor
          label="Product Gallery Images"
          helpText="Extra images shown only in Product Gallery. Do not add the main product image here."
          items={formData.gallery_images || formData.images || []}
          newItem={newArrayItems.gallery_images}
          onNewItemChange={(val) => setNewArrayItems((p) => ({ ...p, gallery_images: val }))}
          onAdd={() => {
            onArrayAdd('gallery_images', newArrayItems.gallery_images);
            setNewArrayItems((p) => ({ ...p, gallery_images: '' }));
          }}
          onRemove={(idx) => onArrayRemove('gallery_images', idx)}
          isUrl
          previewType="image"
          uploadControl={
            <UploadButton
              label="Upload Gallery Image"
              accept={ADMIN_IMAGE_UPLOAD_ACCEPT}
              disabled={!!uploading['product-image-gallery_images']}
              progress={uploadProgress['product-image-gallery_images']}
              onFile={(file) => uploadMedia({
                file,
                type: 'image',
                purpose: 'product-image',
                targetField: 'gallery_images',
                append: true,
              })}
            />
          }
        />

        <ProductVideoSection
          formData={formData}
          onInputChange={onInputChange}
          onFieldChange={onFieldChange}
          uploading={!!uploading['product-video-video_url']}
          progress={uploadProgress['product-video-video_url']}
          selectedVideoSize={selectedVideoSize}
          onUpload={(file) => uploadMedia({
            file,
            type: 'video',
            purpose: 'product-video',
            targetField: 'video_url',
          })}
        />

        <BeforeAfterUploadSection
          formData={formData}
          onInputChange={onInputChange}
          onFieldChange={onFieldChange}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onUploadBefore={(file) => uploadMedia({
            file,
            type: 'image',
            purpose: 'before-image',
            targetField: 'before_image_url',
          })}
          onUploadAfter={(file) => uploadMedia({
            file,
            type: 'image',
            purpose: 'after-image',
            targetField: 'after_image_url',
          })}
        />

        {/* SEO Fields */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">SEO Title</label>
          <input
            type="text"
            name="seo_title"
            value={formData.seo_title}
            onChange={onInputChange}
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">SEO Description</label>
          <textarea
            name="seo_description"
            value={formData.seo_description}
            onChange={onInputChange}
            rows={2}
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="published"
            name="published"
            checked={formData.published}
            onChange={onInputChange}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="published" className="text-sm text-white">
            Publish this product
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500 disabled:opacity-60 sm:w-auto"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Product'}
        </button>
        <button
          onClick={onClose}
          className="w-full rounded-lg border border-slate-700 px-6 py-3 font-semibold text-white transition hover:border-slate-600 sm:w-auto"
        >
          Cancel
        </button>
      </div>
    </section>
  );
};

const UploadButton = ({ label, accept, disabled, progress, onFile }) => (
  <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
    <Upload size={16} />
    {disabled ? `Uploading${progress ? ` ${progress}%` : '...'}` : label}
    <input
      type="file"
      accept={accept}
      disabled={disabled}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) onFile(file);
      }}
      className="hidden"
    />
  </label>
);

const PrivateDownloadSection = ({
  formData,
  onInputChange,
  onFieldChange,
  uploading,
  progress,
  onUpload,
}) => (
  <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
    <div>
      <h2 className="text-sm font-semibold text-white">Private Paid Download</h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Use this for ZIP files, project files, LUT packs, templates, and paid course materials. Customers can access this only after successful payment.
      </p>
    </div>
    <div>
      <label className="mb-2 block text-sm font-semibold text-white">Legacy Download File URL</label>
      <input
        type="url"
        name="download_file"
        value={formData.download_file}
        onChange={(event) => {
          onInputChange(event);
          onFieldChange('download_file_url', event.target.value);
        }}
        placeholder="https://example.com/file.zip"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
      />
      <p className="mt-2 text-xs text-slate-500">Manual URL is for old products only. New paid files should use the protected upload below.</p>
    </div>
    <UploadButton
      label="Upload Private File"
      accept=".zip,.rar,.7z,.prproj,.drp,.cube,.xmp,.pdf,.mp4,application/zip,application/pdf,video/mp4"
      disabled={uploading}
      progress={progress}
      onFile={onUpload}
    />
    {formData.download_file_key && (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="mb-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          Private protected file
        </div>
        <p className="text-sm font-semibold text-white">{formData.download_file_name || 'Protected download'}</p>
        <p className="mt-1 break-all text-xs text-emerald-100/70">{formData.download_file_key}</p>
        <button
          type="button"
          onClick={() => {
            onFieldChange('download_file_key', '');
            onFieldChange('download_file_name', '');
            onFieldChange('download_file_bucket', '');
          }}
          className="mt-3 rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300"
        >
          Remove private file
        </button>
      </div>
    )}
  </div>
);

const MainProductImagesSection = ({
  formData,
  onInputChange,
  onFieldChange,
  uploading,
  uploadProgress,
  onUploadMain,
}) => (
  <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
    <div>
      <h2 className="text-sm font-semibold text-white">Main Product Image</h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Used for product card, product hero, thumbnail, and preview image.
      </p>
    </div>
    <div>
      <SingleImageField
        label="Main Product Image"
        name="image_url"
        value={formData.image_url}
        onInputChange={onInputChange}
        onFieldChange={onFieldChange}
        uploading={!!uploading['product-image-image_url']}
        progress={uploadProgress['product-image-image_url']}
        onUpload={onUploadMain}
      />
    </div>
  </div>
);

const ProductVideoSection = ({
  formData,
  onInputChange,
  onFieldChange,
  uploading,
  progress,
  selectedVideoSize,
  onUpload,
}) => (
  <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
    <div className="flex items-center gap-2 text-sm font-semibold text-white">
      <PlayCircle size={18} />
      Product Video
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        { value: '', label: 'None' },
        { value: 'youtube', label: 'YouTube Link' },
        { value: 'direct', label: 'Direct Video' },
      ].map((option) => (
        <label key={option.value} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          <input
            type="radio"
            name="video_type"
            value={option.value}
            checked={(formData.video_type || '') === option.value}
            onChange={(event) => {
              onInputChange(event);
              if (event.target.value === 'youtube') onFieldChange('video_url', '');
              if (event.target.value === 'direct') onFieldChange('youtube_url', '');
            }}
          />
          {option.label}
        </label>
      ))}
    </div>

    {formData.video_type === 'youtube' && (
      <div>
        <label className="mb-2 block text-sm font-semibold text-white">YouTube URL</label>
        <input
          type="url"
          name="youtube_url"
          value={formData.youtube_url}
          onChange={onInputChange}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
        />
        <YouTubePreview url={formData.youtube_url} />
      </div>
    )}

    {formData.video_type === 'direct' && (
      <div className="space-y-3">
        <div>
          <label className="mb-2 block text-sm font-semibold text-white">Direct Video URL</label>
          <input
            type="url"
            name="video_url"
            value={formData.video_url}
            onChange={onInputChange}
            placeholder="https://assets.pranvithdop.com/products/..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <p className="text-xs text-slate-500">Paste YouTube/Vimeo/R2 video URL, or upload video directly to Cloudflare R2.</p>
        <UploadButton
          label="Upload Video to R2"
          accept={ADMIN_VIDEO_UPLOAD_ACCEPT}
          disabled={uploading}
          progress={progress}
          onFile={onUpload}
        />
        <p className="text-xs text-slate-500">
          Max video size: {formatMegabytes(ADMIN_VIDEO_UPLOAD_MAX_BYTES)}
          {selectedVideoSize ? ` • Selected video: ${selectedVideoSize}` : ''}
        </p>
        <p className="text-xs text-slate-500">
          If upload fails with Network Error, check Cloudflare R2 CORS. Your bucket must allow PUT from your admin domain and localhost during development.
        </p>
        {formData.video_url && (
          <SafeVideoEmbed
            videoType="video_file"
            videoUrl={formData.video_url}
            title="Product video preview"
            className="mt-3 aspect-video w-full rounded-xl border border-slate-800 bg-black"
          />
        )}
      </div>
    )}
  </div>
);

const YouTubePreview = ({ url }) => {
  if (!url) return null;
  return (
    <SafeVideoEmbed
      videoType="youtube"
      videoUrl={url}
      title="YouTube preview"
      className="mt-3 aspect-video w-full rounded-xl border border-slate-800 bg-black"
    />
  );
};

const BeforeAfterUploadSection = ({
  formData,
  onInputChange,
  onFieldChange,
  uploading,
  uploadProgress,
  onUploadBefore,
  onUploadAfter,
}) => (
  <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
    <h2 className="text-sm font-semibold text-white">LUT Before / After Images</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <SingleImageField
        label="Before Image"
        name="before_image_url"
        value={formData.before_image_url}
        onInputChange={onInputChange}
        onFieldChange={onFieldChange}
        uploading={!!uploading['before-image-before_image_url']}
        progress={uploadProgress['before-image-before_image_url']}
        onUpload={onUploadBefore}
      />
      <SingleImageField
        label="After Image"
        name="after_image_url"
        value={formData.after_image_url}
        onInputChange={onInputChange}
        onFieldChange={onFieldChange}
        uploading={!!uploading['after-image-after_image_url']}
        progress={uploadProgress['after-image-after_image_url']}
        onUpload={onUploadAfter}
      />
    </div>
  </div>
);

const SingleImageField = ({ label, name, value, onInputChange, onFieldChange, uploading, progress, onUpload }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-white">{label}</label>
    <input
      type="url"
      name={name}
      value={value}
      onChange={onInputChange}
      placeholder="https://assets.pranvithdop.com/products/..."
      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
    />
    <div className="mt-3">
      <UploadButton
        label="Upload Image"
        accept={ADMIN_IMAGE_UPLOAD_ACCEPT}
        disabled={uploading}
        progress={progress}
        onFile={onUpload}
      />
    </div>
    {value && <img src={value} alt={label} className="mt-3 aspect-video w-full rounded-xl border border-slate-800 bg-slate-950 object-cover" />}
    {value && (
      <button
        type="button"
        onClick={() => onFieldChange(name, '')}
        className="mt-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
      >
        Clear image
      </button>
    )}
  </div>
);

const ArrayEditor = ({
  label,
  helpText = '',
  items = [],
  newItem,
  onNewItemChange,
  onAdd,
  onRemove,
  isUrl = false,
  uploadControl = null,
  previewType = null,
}) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-2">{label}</label>
      {helpText && <p className="mb-3 text-xs leading-relaxed text-slate-500">{helpText}</p>}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          type={isUrl ? 'url' : 'text'}
          value={newItem}
          onChange={(e) => onNewItemChange(e.target.value)}
          placeholder={isUrl ? 'https://example.com/image.jpg' : `Add a ${label.toLowerCase()} item`}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none"
          onKeyPress={(e) => e.key === 'Enter' && onAdd()}
        />
        <button
          onClick={onAdd}
          className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white transition hover:bg-violet-500"
        >
          Add
        </button>
        {uploadControl}
      </div>
      {previewType === 'image' && items.length > 0 ? (
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          {items.map((item, idx) => (
            <div key={`${item}-${idx}`} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
              <img src={item} alt={`${label} ${idx + 1}`} className="aspect-video w-full object-cover" />
              <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-slate-300">
                <span className="truncate">{item}</span>
                <button onClick={() => onRemove(idx)} className="text-slate-400 transition hover:text-red-400">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <div
            key={`${item}-${idx}`}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100"
          >
            <span className="max-w-[calc(100vw-8rem)] truncate sm:max-w-xs">{item}</span>
            <button
              onClick={() => onRemove(idx)}
              className="text-slate-400 hover:text-red-400 transition"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;
