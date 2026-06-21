import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import {
  createAdminPage,
  fetchAdminMedia,
  fetchAdminPage,
  fetchAdminPages,
  updateAdminPage,
  uploadAdminFile,
} from '../../lib/api';
import { toast } from 'sonner';

const requiredPages = [
  { title: 'Home', slug: 'home', path: '/' },
  { title: 'Courses', slug: 'courses', path: '/courses' },
  { title: 'About', slug: 'about', path: '/about' },
  { title: 'Assets', slug: 'assets', path: '/assets' },
  { title: 'Our Works', slug: 'works', path: '/works' },
  { title: 'Hire From Us', slug: 'hire', path: '/hire' },
];

const sectionTypes = [
  ['hero', 'Hero section'],
  ['text', 'Text/content section'],
  ['image_text', 'Image + text section'],
  ['feature_cards', 'Feature cards/grid section'],
  ['gallery', 'Gallery section'],
  ['video', 'Video embed section'],
  ['before_after', 'Before/After comparison section'],
  ['products_showcase', 'Products/Assets showcase section'],
  ['courses_showcase', 'Courses showcase section'],
  ['works_grid', 'Works/Portfolio grid section'],
  ['testimonials', 'Testimonials section'],
  ['faq', 'FAQ section'],
  ['cta', 'CTA button section'],
  ['contact_form', 'Contact/Hire form section'],
  ['custom_html', 'Custom HTML section'],
];

const emptySection = (type = 'text', index = 0) => ({
  id: `${type}-${Date.now()}`,
  type,
  title: '',
  subtitle: '',
  description: '',
  image: '',
  video_url: '',
  button_text: '',
  button_link: '',
  cards: [],
  items: [],
  enabled: true,
  sort_order: index,
});

const defaultPagePayload = (page) => ({
  title: page.title,
  slug: page.slug,
  path: page.path,
  status: 'draft',
  seo_title: page.title,
  seo_description: '',
  hero_title: page.title,
  hero_subtitle: '',
  hero_button_text: '',
  hero_button_link: '',
  hero_background_image: '',
  sections: [emptySection('hero', 0)],
});

const mergeRequiredPages = (items) => requiredPages.map((required) => {
  const existing = items.find((page) => page.slug === required.slug || page.path === required.path);
  return existing ? { ...required, ...existing } : { ...required, status: 'not_created', missing: true };
});

const normalizeSections = (sections) => Array.isArray(sections)
  ? sections.map((section, index) => ({ ...emptySection(section.type || 'text', index), ...section, sort_order: index }))
  : [];

const Website = () => {
  const [pages, setPages] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPages();
    loadMedia();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminPages();
      setPages(mergeRequiredPages(Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('[admin/website] Failed to load pages', error?.response?.data?.detail || error?.message || error);
      toast.error('Failed to load pages');
      setPages(mergeRequiredPages([]));
    } finally {
      setLoading(false);
    }
  };

  const loadMedia = async () => {
    try {
      const data = await fetchAdminMedia();
      setMedia(Array.isArray(data) ? data : []);
    } catch {
      setMedia([]);
    }
  };

  const openEditor = async (page) => {
    try {
      let fullPage;
      if (page.missing) {
        const created = await createAdminPage(defaultPagePayload(page));
        fullPage = created.page;
      } else {
        fullPage = await fetchAdminPage(page.id || page.slug);
      }
      setEditingId(fullPage.id || fullPage.slug);
      setFormData({ ...fullPage, sections: normalizeSections(fullPage.sections) });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load page');
    }
  };

  const closeEditor = () => {
    setEditingId(null);
    setFormData(null);
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateSection = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((section, currentIndex) => (
        currentIndex === index ? { ...section, [field]: value } : section
      )),
    }));
  };

  const addSection = (type) => {
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, emptySection(type, prev.sections.length)],
    }));
  };

  const deleteSection = (index) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, currentIndex) => currentIndex !== index).map((section, sortOrder) => ({ ...section, sort_order: sortOrder })),
    }));
  };

  const moveSection = (index, direction) => {
    setFormData((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.sections.length) return prev;
      const next = [...prev.sections];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return { ...prev, sections: next.map((section, sortOrder) => ({ ...section, sort_order: sortOrder })) };
    });
  };

  const savePage = async (status) => {
    try {
      setSaving(true);
      const payload = {
        ...formData,
        status,
        sections: normalizeSections(formData.sections),
      };
      const result = await updateAdminPage(formData.id || formData.slug, payload);
      setFormData({ ...(result.page || payload), sections: normalizeSections((result.page || payload).sections) });
      toast.success(status === 'published' ? 'Page published' : 'Draft saved');
      await loadPages();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  if (editingId && formData) {
    return (
      <PageEditor
        page={formData}
        media={media}
        saving={saving}
        onClose={closeEditor}
        onField={updateField}
        onSection={updateSection}
        onAddSection={addSection}
        onDeleteSection={deleteSection}
        onMoveSection={moveSection}
        onSaveDraft={() => savePage('draft')}
        onPublish={() => savePage('published')}
        onUploadComplete={loadMedia}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Website Pages</h1>
        <p className="mt-3 text-slate-400">Edit public website pages, SEO, hero content and CMS sections.</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400">Loading pages...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div key={page.slug} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white">{page.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{page.path}</p>
              <p className="mt-2 text-xs text-slate-500">
                Status:{' '}
                <span className={page.status === 'published' ? 'text-green-400' : page.status === 'draft' ? 'text-yellow-400' : 'text-slate-400'}>
                  {page.status === 'not_created' ? 'Not created' : page.status}
                </span>
              </p>
              <button
                onClick={() => openEditor(page)}
                className="mt-4 w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
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

const PageEditor = ({
  page,
  media,
  saving,
  onClose,
  onField,
  onSection,
  onAddSection,
  onDeleteSection,
  onMoveSection,
  onSaveDraft,
  onPublish,
  onUploadComplete,
}) => {
  const previewUrl = page.path || (page.slug === 'home' ? '/' : `/${page.slug}`);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Edit: {page.title}</h1>
            <p className="mt-2 text-slate-400">{previewUrl}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => window.open(previewUrl, '_blank')} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-500">
              <Eye size={16} /> Preview
            </button>
            <button onClick={onClose} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-500">
              <X size={16} /> Close
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card title="Page details">
            <Field label="Page title" value={page.title} onChange={(value) => onField('title', value)} />
            <Field label="Slug" value={page.slug} onChange={(value) => onField('slug', value)} />
            <Field label="Path" value={page.path} onChange={(value) => onField('path', value)} />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-white">Status</span>
              <select value={page.status || 'draft'} onChange={(e) => onField('status', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none focus:border-violet-500">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="not_created">Not created</option>
              </select>
            </label>
          </Card>

          <Card title="SEO">
            <Field label="SEO title" value={page.seo_title} onChange={(value) => onField('seo_title', value)} />
            <TextArea label="SEO description" value={page.seo_description} onChange={(value) => onField('seo_description', value)} />
          </Card>

          <Card title="Hero">
            <Field label="Hero title" value={page.hero_title} onChange={(value) => onField('hero_title', value)} />
            <TextArea label="Hero subtitle" value={page.hero_subtitle} onChange={(value) => onField('hero_subtitle', value)} />
            <Field label="Hero button text" value={page.hero_button_text} onChange={(value) => onField('hero_button_text', value)} />
            <Field label="Hero button link" value={page.hero_button_link} onChange={(value) => onField('hero_button_link', value)} />
            <ImageInput label="Hero background image" value={page.hero_background_image} media={media} onChange={(value) => onField('hero_background_image', value)} onUploadComplete={onUploadComplete} />
          </Card>

          <Card title="Section builder">
            <div className="space-y-4">
              {page.sections.map((section, index) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  index={index}
                  media={media}
                  onSection={onSection}
                  onMoveSection={onMoveSection}
                  onDeleteSection={onDeleteSection}
                  onUploadComplete={onUploadComplete}
                  isFirst={index === 0}
                  isLast={index === page.sections.length - 1}
                />
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card title="Add section">
            <AddSectionMenu onAddSection={onAddSection} />
          </Card>
          <Card title="Save">
            <div className="space-y-3">
              <button disabled={saving} onClick={onSaveDraft} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-slate-500 disabled:opacity-60">
                <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button disabled={saving} onClick={onPublish} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60">
                <Save size={16} /> Publish
              </button>
            </div>
          </Card>
        </aside>
      </div>
    </section>
  );
};

const Card = ({ title, children }) => (
  <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950 p-5">
    <h2 className="text-lg font-semibold text-white">{title}</h2>
    {children}
  </div>
);

const Field = ({ label, value, onChange }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-white">{label}</span>
    <input value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none placeholder:text-slate-600 focus:border-violet-500" />
  </label>
);

const TextArea = ({ label, value, onChange, rows = 3 }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-white">{label}</span>
    <textarea value={value || ''} rows={rows} onChange={(e) => onChange(e.target.value)} className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white outline-none placeholder:text-slate-600 focus:border-violet-500" />
  </label>
);

const ImageInput = ({ label, value, media, onChange, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const images = useMemo(() => media.filter((item) => String(item.type || '').startsWith('image/')), [media]);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const result = await uploadAdminFile(file);
      if (result.url) onChange(result.url);
      toast.success('Image uploaded');
      onUploadComplete?.();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Field label={label} value={value} onChange={onChange} />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <select value="" onChange={(e) => e.target.value && onChange(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500">
          <option value="">Select from Media Library</option>
          {images.map((item) => (
            <option key={item.id} value={item.url}>{item.title || item.url}</option>
          ))}
        </select>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white hover:border-slate-500">
          <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" accept="image/*" disabled={uploading} onChange={upload} className="hidden" />
        </label>
      </div>
    </div>
  );
};

const AddSectionMenu = ({ onAddSection }) => (
  <div className="grid gap-2">
    {sectionTypes.map(([type, label]) => (
      <button key={type} onClick={() => onAddSection(type)} className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-sm text-slate-200 hover:border-violet-500 hover:text-white">
        <Plus size={14} /> {label}
      </button>
    ))}
  </div>
);

const SectionEditor = ({ section, index, media, onSection, onMoveSection, onDeleteSection, onUploadComplete, isFirst, isLast }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-white">{index + 1}. {sectionTypes.find(([type]) => type === section.type)?.[1] || section.type}</p>
        <p className="text-xs text-slate-500">ID: {section.id}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={isFirst} onClick={() => onMoveSection(index, -1)} className="rounded-lg border border-slate-700 p-2 text-slate-200 disabled:opacity-30"><ArrowUp size={15} /></button>
        <button disabled={isLast} onClick={() => onMoveSection(index, 1)} className="rounded-lg border border-slate-700 p-2 text-slate-200 disabled:opacity-30"><ArrowDown size={15} /></button>
        <button onClick={() => onDeleteSection(index)} className="rounded-lg border border-rose-500/30 p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 size={15} /></button>
      </div>
    </div>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-white">Type</span>
        <select value={section.type} onChange={(e) => onSection(index, 'type', e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-violet-500">
          {sectionTypes.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-3 pt-7">
        <input type="checkbox" checked={section.enabled !== false} onChange={(e) => onSection(index, 'enabled', e.target.checked)} />
        <span className="text-sm text-white">Enabled</span>
      </label>
      <Field label="Title" value={section.title} onChange={(value) => onSection(index, 'title', value)} />
      <Field label="Subtitle" value={section.subtitle} onChange={(value) => onSection(index, 'subtitle', value)} />
      <div className="md:col-span-2"><TextArea label="Description" value={section.description} onChange={(value) => onSection(index, 'description', value)} /></div>
      <ImageInput label="Image" value={section.image} media={media} onChange={(value) => onSection(index, 'image', value)} onUploadComplete={onUploadComplete} />
      <Field label="Video URL" value={section.video_url} onChange={(value) => onSection(index, 'video_url', value)} />
      <Field label="Button text" value={section.button_text} onChange={(value) => onSection(index, 'button_text', value)} />
      <Field label="Button link" value={section.button_link} onChange={(value) => onSection(index, 'button_link', value)} />
      {section.type === 'before_after' && (
        <>
          <ImageInput label="Before image" value={section.before_image} media={media} onChange={(value) => onSection(index, 'before_image', value)} onUploadComplete={onUploadComplete} />
          <ImageInput label="After image" value={section.after_image} media={media} onChange={(value) => onSection(index, 'after_image', value)} onUploadComplete={onUploadComplete} />
        </>
      )}
      {section.type === 'custom_html' && (
        <div className="md:col-span-2">
          <TextArea label="Custom HTML" rows={6} value={section.html} onChange={(value) => onSection(index, 'html', value)} />
          <p className="mt-2 text-xs text-slate-500">Scripts, event handlers and unsafe links are removed by the backend before saving.</p>
        </div>
      )}
      <ArrayEditor label="Cards/items JSON" value={section.cards?.length ? section.cards : section.items} onChange={(value) => onSection(index, 'cards', value)} />
    </div>
  </div>
);

const ArrayEditor = ({ label, value, onChange }) => {
  const [text, setText] = useState(JSON.stringify(value || [], null, 2));

  useEffect(() => {
    setText(JSON.stringify(value || [], null, 2));
  }, [value]);

  const apply = () => {
    try {
      const parsed = JSON.parse(text || '[]');
      if (!Array.isArray(parsed)) throw new Error('Must be an array');
      onChange(parsed);
      toast.success('Items updated');
    } catch {
      toast.error('Items must be valid JSON array');
    }
  };

  return (
    <div className="md:col-span-2">
      <TextArea label={label} rows={5} value={text} onChange={setText} />
      <button onClick={apply} className="mt-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:border-slate-500">Apply items</button>
    </div>
  );
};

export default Website;
