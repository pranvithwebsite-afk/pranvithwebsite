import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Save, X, Edit2, Trash2, Copy, Link, RefreshCw } from 'lucide-react';
import {
  fetchAdminProducts,
  fetchAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  createProductPaymentLink,
  refreshProductPaymentLink,
} from '../../lib/api';
import { toast } from 'sonner';

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
  videos: [],
  download_file: '',
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

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(defaultProductForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminProducts();
      setProducts(Array.isArray(data) ? data : []);
      setError('');
    } catch (error) {
      console.error('[admin/products] Failed to load products', error?.response?.data?.detail || error?.message || error);
      toast.error('Failed to load products');
      setProducts([]);
      setError('Products could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const openNewForm = () => {
    setFormData(defaultProductForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = async (product) => {
    try {
      const fullProduct = await fetchAdminProduct(product.id);
      setFormData(fullProduct);
      setEditingId(product.id);
      setShowForm(true);
    } catch (error) {
      toast.error('Failed to load product details');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData(defaultProductForm);
    setEditingId(null);
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      slug: normalizeSlug(formData.slug || formData.name),
    };
    if (!payload.slug || !payload.name) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        const result = await updateAdminProduct(editingId, payload);
        toast[result?.warning ? 'warning' : 'success'](result?.warning || 'Product updated successfully');
      } else {
        const result = await createAdminProduct(payload);
        toast[result?.warning ? 'warning' : 'success'](result?.warning || 'Product created successfully');
      }
      closeForm();
      loadProducts();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await deleteAdminProduct(id);
      toast.success('Product deleted');
      loadProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
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
    try {
      const result = await createProductPaymentLink(id);
      toast.success(result?.created ? 'Payment Link created' : 'Payment Link already exists');
      loadProducts();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not create Payment Link');
    }
  };

  const handleRefreshPaymentLink = async (id) => {
    try {
      await refreshProductPaymentLink(id);
      toast.success('Payment Link status refreshed');
      loadProducts();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not refresh Payment Link');
    }
  };

  const handleArrayAdd = (field, item) => {
    if (!item.trim()) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), item],
    }));
  };

  const handleArrayRemove = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field]?.filter((_, i) => i !== index) || [],
    }));
  };

  if (showForm) {
    return (
      <ProductForm
        formData={formData}
        onInputChange={handleInputChange}
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
          {products.map((product) => (
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
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
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
                  className="flex items-center justify-center gap-1 rounded bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-600"
                >
                  <Link size={13} />
                  Create Payment Link
                </button>
                {product.razorpay_payment_link_id && (
                  <button
                    onClick={() => handleRefreshPaymentLink(product.id)}
                    className="flex items-center justify-center gap-1 rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    <RefreshCw size={13} />
                    Refresh Status
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const ProductForm = ({
  formData,
  onInputChange,
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
    videos: '',
  });

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

        <div className="grid gap-4 sm:grid-cols-2">
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
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Product URL</label>
            <input
              type="text"
              name="product_url"
              value={formData.product_url}
              onChange={onInputChange}
              placeholder="/products/item"
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
            />
          </div>
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

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Download File URL</label>
          <input
            type="url"
            name="download_file"
            value={formData.download_file}
            onChange={onInputChange}
            placeholder="https://example.com/file.zip"
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200">
          <input
            type="checkbox"
            name="create_razorpay_payment_link"
            checked={!!formData.create_razorpay_payment_link}
            onChange={onInputChange}
            className="mt-1 h-4 w-4 rounded"
          />
          <span>
            <span className="block font-semibold text-white">Create Razorpay Payment Link</span>
            <span className="mt-1 block text-slate-500">Website checkout uses Razorpay Orders automatically. Payment Links are optional for manual sharing.</span>
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
          label="Product Images"
          items={formData.images}
          newItem={newArrayItems.images}
          onNewItemChange={(val) => setNewArrayItems((p) => ({ ...p, images: val }))}
          onAdd={() => {
            onArrayAdd('images', newArrayItems.images);
            setNewArrayItems((p) => ({ ...p, images: '' }));
          }}
          onRemove={(idx) => onArrayRemove('images', idx)}
          isUrl
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

const ArrayEditor = ({
  label,
  items = [],
  newItem,
  onNewItemChange,
  onAdd,
  onRemove,
  isUrl = false,
}) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-2">{label}</label>
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
      </div>
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
