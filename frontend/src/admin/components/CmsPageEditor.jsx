import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  createAdminCmsSection,
  deleteAdminCmsSection,
  fetchAdminCmsPage,
  reorderAdminCmsSections,
  updateAdminCmsPage,
  updateAdminCmsSection,
  updateAdminCmsSectionVisibility,
} from '../../lib/api';
import CmsSectionEditor from './CmsSectionEditor';
import SectionOrderList from './SectionOrderList';

const fieldClass = 'w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500';

const CmsPageEditor = ({ pageKey, title, path, mediaItems, onBack }) => {
  const [page, setPage] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sections = useMemo(() => [...(page?.sections || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [page]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminCmsPage(pageKey);
      setPage(data);
      setSelected((current) => current ? data.sections?.find((section) => section.id === current.id) || null : data.sections?.[0] || null);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load CMS page');
    } finally {
      setLoading(false);
    }
  }, [pageKey]);

  useEffect(() => {
    load();
  }, [load]);

  const updatePageField = (field, value) => setPage((current) => ({ ...current, [field]: value }));

  const savePage = async (status) => {
    try {
      setSaving(true);
      const data = await updateAdminCmsPage(pageKey, {
        ...(page || {}),
        title: page.title,
        subtitle: page.subtitle,
        path: page.path,
        status: status || page.status,
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        settings: page.settings || {},
      });
      setPage(data);
      toast.success(status === 'published' ? 'Page published' : 'Page saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save page');
    } finally {
      setSaving(false);
    }
  };

  const saveSection = async (payload) => {
    try {
      setSaving(true);
      if (payload.id) await updateAdminCmsSection(payload.id, payload);
      else await createAdminCmsSection(pageKey, payload);
      await load();
      toast.success('Section saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save section');
    } finally {
      setSaving(false);
    }
  };

  const moveSection = async (index, direction) => {
    const next = [...sections];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= next.length) return;
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    const data = await reorderAdminCmsSections(pageKey, next.map((section) => section.id));
    setPage(data);
  };

  const deleteSection = async (section) => {
    if (!window.confirm(`Delete section "${section.title || section.section_id}"?`)) return;
    await deleteAdminCmsSection(section.id);
    toast.success('Section deleted');
    await load();
  };

  const setVisibility = async (section, enabled) => {
    await updateAdminCmsSectionVisibility(section.id, enabled);
    await load();
  };

  if (loading || !page) return <div className="text-slate-400">Loading page editor...</div>;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200">
          <ArrowLeft size={16} /> Back to Website Pages
        </button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">{title} Page Editor</h1>
            <p className="mt-2 text-slate-400">{path}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.open(path, '_blank')} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-white">Preview</button>
            <button type="button" onClick={() => savePage('draft')} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-white"><Save size={15} /> Save Draft</button>
            <button type="button" onClick={() => savePage('published')} disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white">Publish</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <h2 className="text-xl font-semibold text-white">Page Settings</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field label="Page title"><input value={page.title || ''} onChange={(event) => updatePageField('title', event.target.value)} className={fieldClass} /></Field>
          <Field label="Page subtitle"><input value={page.subtitle || ''} onChange={(event) => updatePageField('subtitle', event.target.value)} className={fieldClass} /></Field>
          <Field label="SEO title"><input value={page.seo_title || ''} onChange={(event) => updatePageField('seo_title', event.target.value)} className={fieldClass} /></Field>
          <Field label="SEO description"><textarea value={page.seo_description || ''} onChange={(event) => updatePageField('seo_description', event.target.value)} rows={3} className={`${fieldClass} resize-none`} /></Field>
          <Field label="Status">
            <select value={page.status || 'draft'} onChange={(event) => updatePageField('status', event.target.value)} className={fieldClass}>
              <option value="published">published</option>
              <option value="draft">draft</option>
              <option value="hidden">hidden</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Sections</h2>
            <button type="button" onClick={() => setSelected(null)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white">
              <Plus size={14} /> Add
            </button>
          </div>
          <SectionOrderList sections={sections} selectedId={selected?.id} onSelect={setSelected} onMove={moveSection} onDelete={deleteSection} onVisibilityChange={setVisibility} />
        </div>
        <CmsSectionEditor pageKey={pageKey} section={selected} mediaItems={mediaItems} saving={saving} onSave={saveSection} />
      </div>
    </section>
  );
};

const Field = ({ label, children }) => (
  <label className="block text-sm text-slate-300">
    <span className="capitalize text-slate-400">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
);

export default CmsPageEditor;
