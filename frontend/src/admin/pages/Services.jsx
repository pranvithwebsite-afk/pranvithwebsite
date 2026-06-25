import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Edit2, Eye, EyeOff, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import MediaUrlInput from '../components/MediaUrlInput';
import {
  createAdminService,
  deleteAdminService,
  fetchAdminServices,
  publishAdminService,
  reorderAdminServices,
  updateAdminService,
} from '../../lib/api';
import { FALLBACK_IMAGE, handleImageError, safeImageSrc } from '../../lib/utils';

const emptyItem = { title: '', description: '' };
const emptyStep = { step: 1, title: '', description: '' };

const defaultForm = {
  title: '',
  slug: '',
  subtitle: '',
  short_description: '',
  description: '',
  banner_url: '',
  thumbnail_url: '',
  icon: 'Camera',
  category: '',
  offers: [{ ...emptyItem }],
  why_choose: [{ ...emptyItem }],
  process_steps: [{ ...emptyStep }],
  cta_title: '',
  cta_button_text: 'Contact / WhatsApp',
  cta_button_url: '/hire',
  sort_order: 0,
  is_published: true,
};

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const cleanItems = (items) => (items || []).filter((item) => item.title || item.description);
const cleanSteps = (items) => (items || []).filter((item) => item.title || item.description).map((item, index) => ({ ...item, step: Number(item.step) || index + 1 }));

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const sortedServices = useMemo(() => [...services].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [services]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Services could not be loaded');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm, offers: [{ ...emptyItem }], why_choose: [{ ...emptyItem }], process_steps: [{ ...emptyStep }] });
    setModalOpen(true);
  };

  const openEdit = (service) => {
    setEditingId(service.id);
    setForm({
      ...defaultForm,
      ...service,
      offers: service.offers?.length ? service.offers : [{ ...emptyItem }],
      why_choose: service.why_choose?.length ? service.why_choose : [{ ...emptyItem }],
      process_steps: service.process_steps?.length ? service.process_steps : [{ ...emptyStep }],
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const setField = (field, value) => {
    setForm((current) => {
      if (field === 'title' && !editingId && current.slug === normalizeSlug(current.title)) {
        return { ...current, title: value, slug: normalizeSlug(value) };
      }
      return { ...current, [field]: value };
    });
  };

  const saveService = async () => {
    const payload = {
      ...form,
      slug: normalizeSlug(form.slug || form.title),
      offers: cleanItems(form.offers),
      why_choose: cleanItems(form.why_choose),
      process_steps: cleanSteps(form.process_steps),
      sort_order: Number(form.sort_order) || sortedServices.length + 1,
    };
    if (!payload.title || !payload.slug) {
      toast.error('Title and slug are required');
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await updateAdminService(editingId, payload);
        toast.success('Service updated');
      } else {
        await createAdminService(payload);
        toast.success('Service created');
      }
      closeModal();
      await loadServices();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Service could not be saved');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (service) => {
    try {
      await publishAdminService(service.id, !service.is_published);
      setServices((items) => items.map((item) => (item.id === service.id ? { ...item, is_published: !service.is_published } : item)));
      toast.success(!service.is_published ? 'Service published' : 'Service hidden');
    } catch (error) {
      toast.error('Publish status could not be changed');
    }
  };

  const deleteService = async (service) => {
    if (!window.confirm(`Delete "${service.title}"? This cannot be undone.`)) return;
    try {
      await deleteAdminService(service.id);
      setServices((items) => items.filter((item) => item.id !== service.id));
      toast.success('Service deleted');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Service could not be deleted');
    }
  };

  const moveService = async (serviceId, direction) => {
    const current = sortedServices;
    const index = current.findIndex((item) => item.id === serviceId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;
    const reordered = [...current];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    setServices(reordered.map((item, itemIndex) => ({ ...item, sort_order: itemIndex + 1 })));
    try {
      const result = await reorderAdminServices(reordered.map((item) => item.id));
      if (Array.isArray(result?.services)) setServices(result.services);
    } catch (error) {
      toast.error('Service order could not be saved');
      loadServices();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-300">Services</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Services Management</h1>
          <p className="mt-1 text-sm text-slate-400">Manage public service pages, media, offer cards, reasons, and process steps.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500">
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-3xl bg-slate-900" />)}
        </div>
      ) : sortedServices.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">No services yet. Add your first service.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedServices.map((service, index) => (
            <article key={service.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
              <div className="aspect-video bg-slate-950">
                <img
                  src={safeImageSrc(service.thumbnail_url || service.banner_url, FALLBACK_IMAGE)}
                  alt={service.title}
                  className="h-full w-full object-cover"
                  onError={handleImageError}
                />
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{service.category || 'Service'}</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">{service.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">/{service.slug}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${service.is_published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                    {service.is_published ? 'Published' : 'Hidden'}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-slate-400">{service.short_description || service.subtitle}</p>
                <div className="flex flex-wrap gap-2">
                  <IconButton label="Move up" onClick={() => moveService(service.id, -1)} disabled={index === 0}><ArrowUp size={15} /></IconButton>
                  <IconButton label="Move down" onClick={() => moveService(service.id, 1)} disabled={index === sortedServices.length - 1}><ArrowDown size={15} /></IconButton>
                  <IconButton label={service.is_published ? 'Hide' : 'Publish'} onClick={() => togglePublish(service)}>{service.is_published ? <EyeOff size={15} /> : <Eye size={15} />}</IconButton>
                  <IconButton label="Edit" onClick={() => openEdit(service)}><Edit2 size={15} /></IconButton>
                  <IconButton label="Delete" danger onClick={() => deleteService(service)}><Trash2 size={15} /></IconButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen && (
        <ServiceModal
          form={form}
          setForm={setForm}
          setField={setField}
          saving={saving}
          editing={!!editingId}
          onClose={closeModal}
          onSave={saveService}
        />
      )}
    </div>
  );
};

const IconButton = ({ children, label, onClick, disabled, danger }) => (
  <button
    type="button"
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
      danger ? 'border-rose-500/30 text-rose-200 hover:bg-rose-500/10' : 'border-slate-700 text-slate-200 hover:border-violet-500 hover:bg-slate-800'
    }`}
  >
    {children}
    {label}
  </button>
);

const ServiceModal = ({ form, setForm, setField, saving, editing, onClose, onSave }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur">
    <div className="w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-5 py-4 backdrop-blur">
        <h2 className="text-lg font-semibold text-white">{editing ? 'Edit Service' : 'Add Service'}</h2>
        <button type="button" onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-7 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Title" value={form.title} onChange={(value) => setField('title', value)} />
          <TextField label="Slug" value={form.slug} onChange={(value) => setField('slug', normalizeSlug(value))} />
          <TextField label="Subtitle" value={form.subtitle} onChange={(value) => setField('subtitle', value)} />
          <TextField label="Category" value={form.category} onChange={(value) => setField('category', value)} />
          <TextField label="Icon" value={form.icon} onChange={(value) => setField('icon', value)} helper="Camera, Clapperboard, Globe, Heart, Music, Palette, Plane, PlaySquare, Scissors" />
          <TextField label="Sort Order" type="number" value={form.sort_order} onChange={(value) => setField('sort_order', value)} />
        </div>

        <TextArea label="Short Description" value={form.short_description} onChange={(value) => setField('short_description', value)} rows={3} />
        <TextArea label="Full Description" value={form.description} onChange={(value) => setField('description', value)} rows={5} />

        <div className="grid gap-5 lg:grid-cols-2">
          <MediaUrlInput label="Thumbnail Upload" value={form.thumbnail_url} onChange={(value) => setField('thumbnail_url', value)} accept="image/*" />
          <MediaUrlInput label="Banner Upload" value={form.banner_url} onChange={(value) => setField('banner_url', value)} accept="image/*,video/*" />
        </div>

        <ArrayEditor title="What We Offer" items={form.offers} itemTemplate={emptyItem} onChange={(items) => setForm((current) => ({ ...current, offers: items }))} />
        <ArrayEditor title="Why Choose Us" items={form.why_choose} itemTemplate={emptyItem} onChange={(items) => setForm((current) => ({ ...current, why_choose: items }))} />
        <ProcessEditor items={form.process_steps} onChange={(items) => setForm((current) => ({ ...current, process_steps: items }))} />

        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="CTA Title" value={form.cta_title} onChange={(value) => setField('cta_title', value)} />
          <TextField label="CTA Button Text" value={form.cta_button_text} onChange={(value) => setField('cta_button_text', value)} />
          <TextField label="CTA Button URL" value={form.cta_button_url} onChange={(value) => setField('cta_button_url', value)} />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-white">
          <input type="checkbox" checked={!!form.is_published} onChange={(event) => setField('is_published', event.target.checked)} className="h-4 w-4 accent-violet-500" />
          Publish service
        </label>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-800 bg-slate-950/95 px-5 py-4 backdrop-blur">
        <button type="button" onClick={onClose} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Cancel</button>
        <button type="button" onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60">
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Service'}
        </button>
      </div>
    </div>
  </div>
);

const TextField = ({ label, value, onChange, type = 'text', helper }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-white">{label}</span>
    <input
      type={type}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
    />
    {helper && <span className="mt-1 block text-xs text-slate-500">{helper}</span>}
  </label>
);

const TextArea = ({ label, value, onChange, rows = 4 }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-white">{label}</span>
    <textarea
      rows={rows}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
    />
  </label>
);

const ArrayEditor = ({ title, items, itemTemplate, onChange }) => (
  <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-white">{title}</h3>
      <button type="button" onClick={() => onChange([...(items || []), { ...itemTemplate }])} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
        <Plus size={14} />
        Add
      </button>
    </div>
    <div className="mt-4 space-y-3">
      {(items || []).map((item, index) => (
        <div key={index} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3 md:grid-cols-[1fr_2fr_auto]">
          <input value={item.title || ''} onChange={(event) => updateArrayItem(items, index, 'title', event.target.value, onChange)} placeholder="Title" className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
          <input value={item.description || ''} onChange={(event) => updateArrayItem(items, index, 'description', event.target.value, onChange)} placeholder="Description" className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
          <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/10">
            Remove
          </button>
        </div>
      ))}
    </div>
  </div>
);

const ProcessEditor = ({ items, onChange }) => (
  <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-white">Process Steps</h3>
      <button type="button" onClick={() => onChange([...(items || []), { ...emptyStep, step: (items || []).length + 1 }])} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
        <Plus size={14} />
        Add
      </button>
    </div>
    <div className="mt-4 space-y-3">
      {(items || []).map((item, index) => (
        <div key={index} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3 md:grid-cols-[90px_1fr_2fr_auto]">
          <input type="number" value={item.step || index + 1} onChange={(event) => updateArrayItem(items, index, 'step', event.target.value, onChange)} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
          <input value={item.title || ''} onChange={(event) => updateArrayItem(items, index, 'title', event.target.value, onChange)} placeholder="Title" className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
          <input value={item.description || ''} onChange={(event) => updateArrayItem(items, index, 'description', event.target.value, onChange)} placeholder="Description" className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
          <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/10">
            Remove
          </button>
        </div>
      ))}
    </div>
  </div>
);

const updateArrayItem = (items, index, field, value, onChange) => {
  const next = [...(items || [])];
  next[index] = { ...next[index], [field]: value };
  onChange(next);
};

export default Services;
