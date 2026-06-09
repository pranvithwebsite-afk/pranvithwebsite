import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { fetchAdminPages, fetchAdminPage, updateAdminPage } from '../../lib/api';
import { toast } from 'sonner';

const Website = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminPages();
      setPages(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load pages');
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = async (page) => {
    try {
      const fullPage = await fetchAdminPage(page.id);
      setEditingPage(page.id);
      setFormData({ ...fullPage });
    } catch (error) {
      toast.error('Failed to load page details');
    }
  };

  const closeEditor = () => {
    setEditingPage(null);
    setFormData({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSectionChange = (sectionKey, fieldKey, value) => {
    setFormData((prev) => ({
      ...prev,
      sections: {
        ...(prev.sections || {}),
        [sectionKey]: {
          ...(prev.sections?.[sectionKey] || {}),
          [fieldKey]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateAdminPage(formData.id, {
        slug: formData.slug,
        title: formData.title,
        sections: formData.sections || {},
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        published: formData.published ?? true,
      });
      toast.success('Page updated successfully');
      closeEditor();
      loadPages();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  if (editingPage) {
    return (
      <PageEditor
        page={formData}
        onSave={handleSave}
        onClose={closeEditor}
        onInputChange={handleInputChange}
        onSectionChange={handleSectionChange}
        saving={saving}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Website Pages</h1>
        <p className="mt-3 text-slate-400">Manage CMS pages and website content.</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400">Loading pages...</div>
      ) : pages.length === 0 ? (
        <div className="text-center text-slate-400">No pages found</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div key={page.id} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white">{page.title}</h2>
              <p className="mt-2 text-sm text-slate-500">/{page.slug}</p>
              <p className="mt-2 text-xs text-slate-500">
                Status: <span className={page.published ? 'text-green-400' : 'text-yellow-400'}>
                  {page.published ? 'Published' : 'Draft'}
                </span>
              </p>
              <button
                onClick={() => openEditor(page)}
                className="mt-4 w-full rounded-lg bg-violet-600 hover:bg-violet-500 transition text-white py-2 text-sm font-semibold"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const PageEditor = ({ page, onSave, onClose, onInputChange, onSectionChange, saving }) => {
  const sectionKeys = Object.keys(page.sections || {});
  const previewUrl = page.slug ? `/${page.slug}` : '#';

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Edit: {page.title}</h1>
          <p className="mt-2 text-slate-400">/{page.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.open(previewUrl, '_blank')}
            className="px-5 py-3 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-100 hover:text-white transition bg-slate-900"
          >
            Preview
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-6 max-w-3xl">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">Page Title</label>
          <input
            type="text"
            name="title"
            value={page.title || ''}
            onChange={onInputChange}
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Slug</label>
          <input
            type="text"
            name="slug"
            value={page.slug || ''}
            onChange={onInputChange}
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">SEO Title</label>
          <input
            type="text"
            name="seo_title"
            value={page.seo_title || ''}
            onChange={onInputChange}
            placeholder="Optimize for search engines"
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">SEO Description</label>
          <textarea
            name="seo_description"
            value={page.seo_description || ''}
            onChange={onInputChange}
            rows={3}
            placeholder="Meta description for search results"
            className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 resize-none"
          />
        </div>

        {sectionKeys.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-slate-400">
            No page sections are configured yet. Add sections in the page JSON to make them editable.
          </div>
        ) : (
          sectionKeys.map((sectionKey) => (
            <SectionEditor
              key={sectionKey}
              sectionKey={sectionKey}
              section={page.sections?.[sectionKey] || {}}
              onSectionChange={onSectionChange}
            />
          ))
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              id="published"
              checked={page.published ?? true}
              onChange={(e) => onInputChange({ target: { name: 'published', value: e.target.checked } })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-white">Publish this page</span>
          </label>
          <span className="text-sm text-slate-400">
            Current status: <span className={page.published ? 'text-green-400' : 'text-yellow-400'}>{page.published ? 'Published' : 'Draft'}</span>
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold transition"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
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

const SectionEditor = ({ sectionKey, section = {}, onSectionChange }) => {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(section);

  const fieldLabel = (field) => field.replace(/([A-Z])/g, ' $1').trim();

  const renderField = (field, value) => {
    const onChange = (nextValue) => onSectionChange(sectionKey, field, nextValue);

    if (Array.isArray(value)) {
      return (
        <textarea
          value={(value || []).join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
          rows={4}
          className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 text-sm resize-none"
        />
      );
    }

    if (typeof value === 'string') {
      const isUrl = field.toLowerCase().includes('url') || field.toLowerCase().includes('image');
      const isLongText = field.toLowerCase().includes('description') || field.toLowerCase().includes('headline') || field.toLowerCase().includes('copy');

      if (isUrl) {
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 text-sm"
          />
        );
      }

      if (isLongText) {
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 text-sm resize-none"
          />
        );
      }

      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-violet-500 text-sm"
        />
      );
    }

    return (
      <textarea
        value={JSON.stringify(value, null, 2)}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 text-sm resize-none"
      />
    );
  };

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 hover:bg-slate-800 transition text-white"
      >
        <span className="font-semibold capitalize">{sectionKey} Section</span>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4 bg-slate-950 border-t border-slate-700">
          {entries.length === 0 ? (
            <div className="text-slate-400">No editable fields in this section.</div>
          ) : (
            entries.map(([field, value]) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                  {fieldLabel(field)}
                </label>
                {renderField(field, value)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Website;
