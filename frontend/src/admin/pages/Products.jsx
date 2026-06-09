import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Save, X, Edit2, Trash2 } from 'lucide-react';
import {
  fetchAdminProducts,
  fetchAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
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
  seo_title: '',
  seo_description: '',
  published: true,
  product_url: '',
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(defaultProductForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load products');
      setProducts([]);
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
    if (!formData.slug || !formData.name) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateAdminProduct(editingId, formData);
        toast.success('Product updated successfully');
      } else {
        await createAdminProduct(formData);
        toast.success('Product created successfully');
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
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
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
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Products</h1>
          <p className="mt-3 text-slate-400">Manage your product catalog.</p>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400">Loading products...</div>
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
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-white">
          {isEdit ? 'Edit Product' : 'New Product'}
        </h1>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition flex items-center justify-center"
        >
          <X size={18} />
        </button>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-6 max-w-3xl">
        {/* Basic Fields */}
        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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

      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold transition"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Product'}
        </button>
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-lg border border-slate-700 hover:border-slate-600 text-white font-semibold transition"
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
      <div className="flex gap-2 mb-3">
        <input
          type={isUrl ? 'url' : 'text'}
          value={newItem}
          onChange={(e) => onNewItemChange(e.target.value)}
          placeholder={isUrl ? 'https://example.com/image.jpg' : `Add a ${label.toLowerCase()} item`}
          className="flex-1 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 text-sm"
          onKeyPress={(e) => e.key === 'Enter' && onAdd()}
        />
        <button
          onClick={onAdd}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-100 text-sm"
          >
            <span className="truncate max-w-xs">{item}</span>
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
