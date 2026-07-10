import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Save, X, Edit2, Trash2, Copy, Link, RefreshCw, Upload, PlayCircle, Image as ImageIcon } from 'lucide-react';
import {
  fetchAdminProducts,
  fetchAdminProduct,
  fetchAdminMedia,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  createProductPaymentLink,
  refreshProductPaymentLink,
  uploadAdminVideoToR2,
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
  gallery_layout: 'grid',
  before_image_url: '',
  after_image_url: '',
  download_file: '',
  download_file_url: '',
  download_file_key: '',
  download_file_name: '',
  download_file_bucket: '',
  create_razorpay_payment_link: true,
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
const mediaButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 disabled:pointer-events-none disabled:opacity-60';

const adminRequestFailureMessage = (error, fallbackMessage) => {
  const status = error?.response?.status || 'NETWORK';
  const baseURL = String(error?.config?.baseURL || '').replace(/\/$/, '');
  const requestPath = error?.config?.url || '';
  const requestUrl = requestPath
    ? (requestPath.startsWith('http') ? requestPath : `${baseURL}${requestPath}`)
    : '';
  const data = error?.response?.data || {};
  const code = data?.code || (typeof data?.detail === 'object' ? data.detail?.code : '') || '';
  const backendMessage = data?.message || (typeof data?.detail === 'object' ? data.detail?.message : '') || fallbackMessage;
  const detail = typeof data?.detail === 'object' && data.detail?.detail != null
    ? formatApiErrorDetail(data.detail.detail)
    : formatApiErrorDetail(data?.detail);
  const parts = [`${status}${code ? ` [${code}]` : ''}: ${backendMessage}`];
  if (detail && detail !== backendMessage && detail !== 'Something went wrong. Please try again.') parts.push(detail);
  if (Array.isArray(data?.errors)) {
    const validationDetails = data.errors.map((item) => `${Array.isArray(item.loc) ? item.loc.slice(-1)[0] : 'field'}: ${item.msg}`).join('; ');
    if (validationDetails) parts.push(validationDetails);
  }
  if (requestUrl) parts.push(requestUrl);
  return parts.join(' — ');
};

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatProductDate = (product) => {
  const value = product.updated_at || product.created_at;
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const paymentLinkWarningMessage = (warning, fallbackMessage) => {
  if (!warning) return fallbackMessage;
  if (typeof warning === 'string') return `Product saved. Payment Link warning: ${warning}`;
  const code = warning?.code || 'UNKNOWN';
  const message = warning?.message || fallbackMessage;
  const detail = warning?.detail || '';
  return `Product saved. Payment Link warning — ${code}: ${message}${detail ? ` (${detail})` : ''}`;
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

const getThumbnailProductImageUrl = (product = {}) => String(product.thumbnail_url || '').trim();

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
  const thumbnailImageUrl = getThumbnailProductImageUrl(product);
  const hasExistingPaymentLink = !!(product.razorpay_payment_link_id || product.razorpay_payment_link_url);
  return {
    ...defaultProductForm,
    ...product,
    image_url: mainImageUrl,
    thumbnail_url: thumbnailImageUrl,
    preview_image_url: String(product.preview_image_url || '').trim(),
    cover_image_url: String(product.cover_image_url || '').trim(),
    gallery_layout: product.gallery_layout === 'full' ? 'full' : 'grid',
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
    create_razorpay_payment_link: !hasExistingPaymentLink,
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
  const [deletingIds, setDeletingIds] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const saveInFlight = useRef(false);
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
    if (saveInFlight.current) return;
    const slug = normalizeSlug(formData.slug || formData.name);
    const mainImageUrl = rejectUnsafeMediaUrl(formData.image_url);
    const thumbnailImageUrl = rejectUnsafeMediaUrl(formData.thumbnail_url);
    const payload = {
      ...formData,
      slug,
      product_url: productUrlForSlug(slug),
      gallery_images: formData.gallery_images || [],
      images: formData.gallery_images || formData.images || [],
      product_images: formData.gallery_images || formData.images || [],
      image_url: mainImageUrl,
      thumbnail_url: thumbnailImageUrl,
      preview_image_url: rejectUnsafeMediaUrl(formData.preview_image_url),
      cover_image_url: rejectUnsafeMediaUrl(formData.cover_image_url),
      gallery_layout: formData.gallery_layout === 'full' ? 'full' : 'grid',
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
      saveInFlight.current = true;
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
      toast.error(adminRequestFailureMessage(error, 'Failed to save product'));
    } finally {
      saveInFlight.current = false;
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
        if (deletingIds[id]) return false;
        setDeletingIds((items) => ({ ...items, [id]: true }));
        try {
          await deleteAdminProduct(id);
          toast.success('Product deleted');
          await loadProducts({ showToast: false });
        } catch (error) {
          toast.error(adminRequestFailureMessage(error, 'Failed to delete product'));
          return false;
        } finally {
          setDeletingIds((items) => ({ ...items, [id]: false }));
        }
        return true;
      },
    });
  };

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const searchable = [product.name, product.title, product.slug, product.category, product.format, product.price, product.sale_price]
        .filter((value) => value != null)
        .join(' ')
        .toLowerCase();
      if (query && !searchable.includes(query)) return false;
      const hasLink = !!product.razorpay_payment_link_url;
      if (filter === 'published') return !!product.published;
      if (filter === 'draft') return !product.published;
      if (filter === 'with-link') return hasLink;
      if (filter === 'without-link') return !hasLink;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sort === 'title') return String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''));
      if (sort === 'price-low') return Number(a.price || 0) - Number(b.price || 0);
      if (sort === 'price-high') return Number(b.price || 0) - Number(a.price || 0);
      return new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0);
    });
  }, [products, search, filter, sort]);

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

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_190px]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products by title, slug, category..." className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500" />
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter products" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"><option value="all">All</option><option value="published">Published</option><option value="draft">Draft/Hidden</option><option value="with-link">With Payment Link</option><option value="without-link">Without Payment Link</option></select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A-Z</option><option value="price-low">Price low-high</option><option value="price-high">Price high-low</option></select>
        </div>
        <p className="mt-3 text-sm text-slate-400">Showing {visibleProducts.length} of {products.length} products</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400">Loading products...</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-rose-100">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-center text-slate-400">No products. Add one to get started!</div>
      ) : visibleProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center text-slate-400">No products match your search and filters.</div>
      ) : (
        <ProductList products={visibleProducts} paymentLinkLoading={paymentLinkLoading} deletingIds={deletingIds} onEdit={openEditForm} onDelete={handleDelete} onCopy={handleCopyPaymentLink} onCreateLink={handleCreatePaymentLink} onRefreshLink={handleRefreshPaymentLink} />
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
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [mediaLibraryItems, setMediaLibraryItems] = useState([]);
  const [mediaLibraryTarget, setMediaLibraryTarget] = useState(null);

  const currentSlug = normalizeSlug(formData.slug || formData.name);
  const hasExistingPaymentLink = !!(formData.razorpay_payment_link_id || formData.razorpay_payment_link_url);
  const imageMediaItems = useMemo(() => (
    (Array.isArray(mediaLibraryItems) ? mediaLibraryItems : []).filter((item) => {
      const mediaType = String(item?.media_type || '').toLowerCase();
      const mimeType = String(item?.mime_type || item?.type || '').toLowerCase();
      const url = String(item?.public_url || item?.url || '').trim();
      return !!url && (mediaType === 'image' || mimeType.startsWith('image/'));
    })
  ), [mediaLibraryItems]);
  const appendUniqueUrl = (items, nextUrl) => dedupeImageList([...(items || []), nextUrl]);

  const uploadMultipleMedia = async ({ files, type, purpose, targetField }) => {
    if (!files || files.length === 0) return;
    if (!currentSlug) {
      toast.error('Add a product name or slug before uploading');
      return;
    }

    const uploadKey = `${purpose}-${targetField}-multiple`;
    setUploading((prev) => ({ ...prev, [uploadKey]: true }));
    setUploadProgress((prev) => ({ ...prev, [uploadKey]: 0 }));

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const imageError = validateImageUploadFile(file);
        if (imageError) {
          throw new Error(imageError);
        }

        const onUploadProgress = (event) => {
          if (!event.total) return;
          const currentFileProgress = Math.round((event.loaded * 100) / event.total);
          const overallProgress = ((i + (event.loaded / event.total)) / files.length) * 100;
          setUploadProgress((prev) => ({
            ...prev,
            [uploadKey]: overallProgress,
          }));
        };

        const result = await uploadAdminProductMedia({
          file,
          type,
          purpose,
          productSlug: currentSlug,
          onUploadProgress,
        });
        
        const nextUrl = result?.media?.public_url || result?.media?.url || result?.url;
        if (nextUrl) {
          results.push(nextUrl);
        } else {
          throw new Error('Upload succeeded but no URL was returned.');
        }
      } catch (error) {
        errors.push({ file: file.name, error: formatUploadError(error) });
      }
    }

    if (results.length > 0) {
      onFieldChange(targetField, dedupeImageList([...(formData[targetField] || []), ...results]));
      toast.success(`${results.length} image(s) uploaded and added to gallery.`);
    }

    if (errors.length > 0) {
      toast.error(`${errors.length} upload(s) failed. See console for details.`);
      errors.forEach(err => console.warn(`[admin/products] gallery upload failed: ${err.file}`, err.error));
    }

    setUploading((prev) => ({ ...prev, [uploadKey]: false }));
  };

  const uploadMedia = async ({ file, type, purpose, targetField, append = false, errorMessage = '' }) => {
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
        result = await uploadAdminVideoToR2({
          file,
          purpose: 'product-video',
          slug: currentSlug,
          onUploadProgress,
          title: file.name,
          onFallback: () => {
            setUploadProgress((prev) => ({ ...prev, [uploadKey]: 0 }));
          },
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
        onFieldChange(targetField, appendUniqueUrl(formData[targetField], nextUrl));
      } else {
        onFieldChange(targetField, nextUrl);
      }
      toast.success(result?.message || 'Upload complete');
    } catch (error) {
      console.warn('[admin/products] upload failed', {
        stage: error?.stage || 'unknown',
        status: error?.response?.status || error?.originalError?.response?.status || null,
        detail: error?.response?.data?.detail || error?.originalError?.response?.data?.detail || error?.message || error,
      });
      toast.error(errorMessage || formatUploadError(error));
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

  const openMediaLibrary = async (target) => {
    setMediaLibraryTarget(target);
    setMediaLibraryOpen(true);
    try {
      setMediaLibraryLoading(true);
      const data = await fetchAdminMedia();
      setMediaLibraryItems(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(adminRequestFailureMessage(error, 'Media Library could not be loaded'));
      setMediaLibraryItems([]);
    } finally {
      setMediaLibraryLoading(false);
    }
  };

  const closeMediaLibrary = () => {
    setMediaLibraryOpen(false);
    setMediaLibraryTarget(null);
  };

  const selectMediaLibraryItem = (url) => {
    const cleanUrl = rejectUnsafeMediaUrl(url);
    if (!cleanUrl) return;
    if (mediaLibraryTarget === 'thumbnail_url') {
      onFieldChange('thumbnail_url', cleanUrl);
      closeMediaLibrary();
      return;
    }
    if (mediaLibraryTarget === 'image_url') {
      onFieldChange('image_url', cleanUrl);
      closeMediaLibrary();
      return;
    }
    if (mediaLibraryTarget === 'gallery_images') {
      onFieldChange('gallery_images', appendUniqueUrl(formData.gallery_images, cleanUrl));
      closeMediaLibrary();
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

        <ThumbnailImageSection
          formData={formData}
          onInputChange={onInputChange}
          onFieldChange={onFieldChange}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onOpenMediaLibrary={() => openMediaLibrary('thumbnail_url')}
          onUploadThumbnail={(file) => uploadMedia({
            file,
            type: 'image',
            purpose: 'product-thumbnail',
            targetField: 'thumbnail_url',
            errorMessage: 'Thumbnail Image upload failed. Please try again.',
          })}
        />

        <MainProductImagesSection
          formData={formData}
          onInputChange={onInputChange}
          onFieldChange={onFieldChange}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onOpenMediaLibrary={() => openMediaLibrary('image_url')}
          onUploadMain={(file) => uploadMedia({
            file,
            type: 'image',
            purpose: 'product-image',
            targetField: 'image_url',
            errorMessage: 'Main Product Image upload failed. Please try again.',
          })}
        />

        <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
          <input
            type="checkbox"
            name="create_razorpay_payment_link"
            checked={!!formData.create_razorpay_payment_link}
            disabled={hasExistingPaymentLink}
            onChange={onInputChange}
            className="mt-1 h-4 w-4 rounded"
          />
          <span>
            <span className="block font-semibold text-white">
              {hasExistingPaymentLink ? 'Payment Link already exists' : 'Also create Razorpay Payment Link after save'}
            </span>
            <span className="mt-1 block text-slate-500">
              Enabled: creates a Razorpay Payment Link after saving this product. Website checkout still uses Razorpay Orders.
            </span>
            {hasExistingPaymentLink && (
              <span className="mt-1 block text-xs text-emerald-300/80">
                Existing links are reused and will not be recreated automatically.
              </span>
            )}
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
              label="Upload Gallery Images"
              accept={ADMIN_IMAGE_UPLOAD_ACCEPT}
              multiple
              disabled={!!uploading['product-image-gallery_images-multiple']}
              progress={uploadProgress['product-image-gallery_images-multiple']}
              onFiles={(files) => uploadMultipleMedia({
                files,
                type: 'image',
                purpose: 'product-image',
                targetField: 'gallery_images',
              })}
            />
          }
          mediaLibraryControl={(
            <button
              type="button"
              onClick={() => openMediaLibrary('gallery_images')}
              className={mediaButtonClass}
            >
              <ImageIcon size={16} />
              Select from Media Library
            </button>
          )}
          controlsFooter={(
            <div className="mb-3">
              <label className="mb-2 block text-sm font-semibold text-white">Product Gallery Layout</label>
              <select
                name="gallery_layout"
                value={formData.gallery_layout || 'grid'}
                onChange={onInputChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="grid">Three Card Grid</option>
                <option value="full">Full Image Size</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Choose how gallery images appear on the asset detail page.
              </p>
            </div>
          )}
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
      {mediaLibraryOpen && (
        <MediaLibraryModal
          items={imageMediaItems}
          loading={mediaLibraryLoading}
          onClose={closeMediaLibrary}
          onSelect={selectMediaLibraryItem}
        />
      )}
    </section>
  );
};

const UploadButton = ({ label, accept, disabled, progress, onFile, onFiles, multiple }) => {
  const inputRef = useRef(null);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-slate-500 ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <Upload size={16} />
        {disabled ? `Uploading${progress ? ` ${progress}%` : '...'}` : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        multiple={multiple}
        onChange={(event) => {
          if (multiple) {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            if (files.length > 0) onFiles?.(files);
          } else {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onFile?.(file);
          }
        }}
        className="hidden"
      />
    </>
  );
};

const ProductActions = ({ product, paymentLinkLoading, deleting, onEdit, onDelete, onCopy, onCreateLink, onRefreshLink }) => {
  const creating = !!paymentLinkLoading[`create:${product.id}`];
  const refreshing = !!paymentLinkLoading[`refresh:${product.id}`];
  const button = 'inline-flex items-center justify-center gap-1 rounded-md bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45';
  return <div className="flex flex-wrap gap-1.5"><button className={button} onClick={() => onEdit(product)}><Edit2 size={13} />Edit</button><button className={`${button} text-rose-300`} disabled={deleting} onClick={() => onDelete(product.id)}><Trash2 size={13} />{deleting ? 'Deleting...' : 'Delete'}</button>{product.razorpay_payment_link_url && <button className={button} onClick={() => onCopy(product.razorpay_payment_link_url)}><Copy size={13} />Copy</button>}<button className={button} disabled={creating || !!product.razorpay_payment_link_url} onClick={() => onCreateLink(product.id)}><Link size={13} />{creating ? 'Creating...' : 'Create Link'}</button>{product.razorpay_payment_link_id && <button className={button} disabled={refreshing} onClick={() => onRefreshLink(product.id)}><RefreshCw size={13} />{refreshing ? 'Refreshing...' : 'Refresh'}</button>}</div>;
};

const ProductList = ({ products, paymentLinkLoading, deletingIds, onEdit, onDelete, onCopy, onCreateLink, onRefreshLink }) => <>
  <div className="hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 lg:block"><table className="w-full min-w-[1180px] table-fixed text-left text-sm"><thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-400"><tr><th className="w-20 px-4 py-3">Thumbnail</th><th className="w-56 px-4 py-3">Product Title</th><th className="w-24 px-4 py-3">Price</th><th className="w-24 px-4 py-3">Sale Price</th><th className="w-28 px-4 py-3">Status</th><th className="w-52 px-4 py-3">Payment Link</th><th className="w-32 px-4 py-3">Created/Updated</th><th className="w-72 px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-800">{products.map((product) => <tr key={product.id} className="hover:bg-slate-900/50"><td className="px-4 py-3"><ProductThumbnail product={product} /></td><td className="px-4 py-3"><button title={product.name || product.title} onClick={() => onEdit(product)} className="block w-full truncate text-left font-semibold text-white hover:text-violet-300">{product.name || product.title}</button><span title={product.slug} className="block truncate text-xs text-slate-500">{product.slug}</span></td><td className="px-4 py-3 text-slate-300">{formatCurrency(product.price)}</td><td className="px-4 py-3 text-emerald-400">{product.sale_price ? formatCurrency(product.sale_price) : '—'}</td><td className="px-4 py-3"><ProductStatus product={product} /></td><td className="px-4 py-3"><PaymentLink product={product} /></td><td className="px-4 py-3 text-xs text-slate-400">{formatProductDate(product)}</td><td className="px-4 py-3"><ProductActions product={product} paymentLinkLoading={paymentLinkLoading} deleting={!!deletingIds[product.id]} onEdit={onEdit} onDelete={onDelete} onCopy={onCopy} onCreateLink={onCreateLink} onRefreshLink={onRefreshLink} /></td></tr>)}</tbody></table></div>
  <div className="space-y-3 lg:hidden">{products.map((product) => <div key={product.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="flex gap-3"><ProductThumbnail product={product} large /><div className="min-w-0 flex-1"><h2 title={product.name || product.title} className="truncate font-semibold text-white">{product.name || product.title}</h2><p className="mt-1 text-sm text-slate-300">{formatCurrency(product.price)}{product.sale_price ? <span className="ml-2 text-emerald-400">Sale {formatCurrency(product.sale_price)}</span> : null}</p><div className="mt-2"><ProductStatus product={product} /></div></div></div><div className="mt-3"><PaymentLink product={product} /></div><div className="mt-4"><ProductActions product={product} paymentLinkLoading={paymentLinkLoading} deleting={!!deletingIds[product.id]} onEdit={onEdit} onDelete={onDelete} onCopy={onCopy} onCreateLink={onCreateLink} onRefreshLink={onRefreshLink} /></div></div>)}</div>
</>;

const ProductThumbnail = ({ product, large = false }) => <div className={`${large ? 'h-16 w-16' : 'h-12 w-12'} shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-900`}>{product.thumbnail_url ? <img src={product.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="m-auto h-full text-slate-600" size={22} />}</div>;
const ProductStatus = ({ product }) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{product.published ? 'Published' : 'Draft/Hidden'}</span>;
const PaymentLink = ({ product }) => product.razorpay_payment_link_url ? <><a href={product.razorpay_payment_link_url} title={product.razorpay_payment_link_url} target="_blank" rel="noreferrer" className="block truncate text-xs text-violet-300">{product.razorpay_payment_link_url}</a><span className="text-xs text-slate-500">{product.razorpay_payment_link_status || 'unknown'}</span></> : <span className="text-xs text-slate-600">No optional Payment Link</span>;

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
  onOpenMediaLibrary,
  onUploadMain,
}) => (
  <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
    <div>
      <h2 className="text-sm font-semibold text-white">Main Product Image</h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Used on product detail page hero. Recommended size: 1200 × 900 px or 1600 × 1200 px. For wide product posters use 1920 × 1080 px.
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
        onSelectFromMediaLibrary={onOpenMediaLibrary}
        helperText="Accepted formats: JPG, PNG, WEBP"
        actionButton={formData.thumbnail_url ? (
          <button
            type="button"
            onClick={() => onFieldChange('image_url', formData.thumbnail_url)}
            className={mediaButtonClass}
          >
            Use same image as Thumbnail Image
          </button>
        ) : null}
        multipleUpload
        onFiles={(files) => {
          if (files.length > 1) {
            toast.warning('Only the first image is used for Main Product Image.');
          }
          onUploadMain(files[0]);
        }}
      />
    </div>
  </div>
);

const ThumbnailImageSection = ({
  formData,
  onInputChange,
  onFieldChange,
  uploading,
  uploadProgress,
  onOpenMediaLibrary,
  onUploadThumbnail,
}) => (
  <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
    <div>
      <h2 className="text-sm font-semibold text-white">Thumbnail Image</h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Recommended Thumbnail Image Size: 1080 x 1080 px. Ratio: 1:1 square. Used only for Assets product cards.
      </p>
    </div>
    <div>
      <SingleImageField
        label="Thumbnail Image"
        name="thumbnail_url"
        value={formData.thumbnail_url}
        onInputChange={onInputChange}
        onFieldChange={onFieldChange}
        uploading={!!uploading['product-thumbnail-thumbnail_url']}
        progress={uploadProgress['product-thumbnail-thumbnail_url']}
        onUpload={onUploadThumbnail}
        onSelectFromMediaLibrary={onOpenMediaLibrary}
        actionButton={formData.image_url ? (
          <button
            type="button"
            onClick={() => onFieldChange('thumbnail_url', formData.image_url)}
            className={mediaButtonClass}
          >
            Use same image as Main Product Image
          </button>
        ) : null}
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
        onFiles={(files) => {
          if (files.length > 1) {
            toast.info('Only the first image will be used for this field.');
          }
          onUploadBefore(files[0]);
        }}
      />
      <SingleImageField
        label="After Image"
        name="after_image_url"
        value={formData.after_image_url}
        onInputChange={onInputChange}
        onFieldChange={onFieldChange}
        uploading={!!uploading['after-image-after_image_url']}
        progress={uploadProgress['after-image-after_image_url']}
        onFiles={(files) => {
          if (files.length > 1) {
            toast.info('Only the first image will be used for this field.');
          }
          onUploadAfter(files[0]);
        }}
      />
    </div>
  </div>
);

const SingleImageField = ({
  label,
  name,
  value,
  onInputChange,
  onFieldChange,
  uploading,
  progress,
  onUpload,
  onFiles,
  onSelectFromMediaLibrary,
  helperText,
  multipleUpload = false,
  actionButton = null,
}) => (
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
    {helperText && (
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{helperText}</p>
    )}
    <div className="mt-3 flex flex-wrap gap-2">
      <UploadButton
        label="Upload Image"
        accept={ADMIN_IMAGE_UPLOAD_ACCEPT}
        disabled={uploading}
        progress={progress}
        multiple={multipleUpload}
        onFile={onUpload}
        onFiles={onFiles}
      />
      {onSelectFromMediaLibrary && (
        <button type="button" onClick={onSelectFromMediaLibrary} className={mediaButtonClass}>
          <ImageIcon size={16} />
          Select from Media Library
        </button>
      )}
      {actionButton}
    </div>
    {value && <img src={value} alt={label} className="mt-3 aspect-video w-full rounded-xl border border-slate-800 bg-slate-950 object-contain" />}
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
  mediaLibraryControl = null,
  previewType = null,
  controlsFooter = null,
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
        {mediaLibraryControl}
      </div>
      {controlsFooter}
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
      {previewType !== 'image' && (
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
      )}
    </div>
  );
};

const MediaLibraryModal = ({ items, loading, onClose, onSelect }) => (
  <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
    <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Select from Media Library</h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-slate-500 hover:text-white"
          aria-label="Close media library"
        >
          <X size={18} />
        </button>
      </div>
      <div className="max-h-[72vh] overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-400">
            Loading media...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center text-sm text-slate-400">
            No media found
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const url = String(item?.public_url || item?.url || '').trim();
              const label = item?.original_filename || item?.filename || item?.title || 'Media image';
              return (
                <button
                  key={item?.id || url}
                  type="button"
                  onClick={() => onSelect(url)}
                  className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-left transition hover:border-violet-500"
                >
                  <img src={url} alt={label} className="aspect-video w-full object-cover" />
                  <div className="px-3 py-3">
                    <p className="truncate text-sm font-semibold text-white">{label}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{url}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default Products;
