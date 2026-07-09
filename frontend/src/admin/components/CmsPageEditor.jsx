import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  createAdminCmsSection,
  deleteAdminCmsSection,
  fetchAdminCmsPage,
  formatApiErrorDetail,
  reorderAdminCmsSections,
  updateAdminCmsPage,
  updateAdminCmsSection,
  updateAdminCmsSectionVisibility,
} from '../../lib/api';
import CmsSectionEditor from './CmsSectionEditor';
import SectionOrderList from './SectionOrderList';
import { useAdminConfirm } from './AdminConfirmProvider';

const fieldClass = 'w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500';

const getSortOrder = (section, index) => {
  const order = Number(section?.sort_order);
  return Number.isFinite(order) ? order : index + 1;
};

const formatCmsSaveError = (error) => {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;
  const message = formatApiErrorDetail(detail) || error?.message || 'Could not save section';
  const fieldName = Array.isArray(detail)
    ? detail.map((item) => item?.loc?.[item.loc.length - 1]).filter(Boolean)[0]
    : '';
  const parts = [];
  if (status) parts.push(`Status ${status}`);
  if (fieldName) parts.push(`Field: ${fieldName}`);
  parts.push(message);
  return parts.join(' - ');
};

const normalizeSectionOrder = (sections = []) =>
  sections
    .map((section, index) => ({ section, originalIndex: index }))
    .sort((a, b) => {
      const orderDelta = getSortOrder(a.section, a.originalIndex) - getSortOrder(b.section, b.originalIndex);
      return orderDelta || a.originalIndex - b.originalIndex;
    })
    .map(({ section }) => section)
    .map((section, index) => ({ ...section, sort_order: index + 1 }));

const normalizePageSections = (page) => ({
  ...(page || {}),
  sections: normalizeSectionOrder(page?.sections || []),
});

const isCurrentPageSection = (section, currentPageKey) =>
  !section?.page_key || section.page_key === currentPageKey;

const PAGE_HELPERS = {
  assets: 'Product cards are managed from Products admin, not CMS sections.',
  courses: 'Course/product cards are managed from catalog/course admin, not CMS sections.',
};

const CmsPageEditor = ({ pageKey, title, path, mediaItems, onBack }) => {
  const [page, setPage] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [sectionDirty, setSectionDirty] = useState(false);
  const [sectionEditorOpen, setSectionEditorOpen] = useState(false);
  const confirm = useAdminConfirm();

  const currentPageKey = page?.page_key || pageKey;
  const sections = useMemo(
    () => normalizeSectionOrder((page?.sections || []).filter((section) => isCurrentPageSection(section, currentPageKey))),
    [currentPageKey, page]
  );

  const load = useCallback(async ({ showToast = true } = {}) => {
    setLoading(true);
    try {
      const data = await fetchAdminCmsPage(pageKey);
      const normalizedPage = normalizePageSections(data);
      setPage(normalizedPage);
      setSelected((current) => current ? normalizedPage.sections?.find((section) => section.id === current.id) || null : current);
      setSectionDirty(false);
    } catch (error) {
      if (showToast) toast.error(error?.response?.data?.detail || 'Could not load CMS page');
    } finally {
      setLoading(false);
    }
  }, [pageKey]);

  useEffect(() => {
    load();
  }, [load]);

  const updatePageField = (field, value) => setPage((current) => ({ ...current, [field]: value }));

  const savePage = async (status) => {
    if (saving) return;
    if (status === 'published' && sectionDirty) {
      toast.warning('Save section before publishing.');
      return;
    }
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
      setPage(normalizePageSections(data));
      toast.success(status === 'published' ? 'Page published' : 'Page saved');
      setSectionEditorOpen(false);
      setSelected(null);
      try {
        await load({ showToast: false });
      } catch (refreshError) {
        console.warn('[admin/cms] Page saved but refresh failed', refreshError?.response?.data?.detail || refreshError?.message || refreshError);
      }
    } catch (error) {
      console.error('[admin/cms] Failed to save page', error?.response?.data?.detail || error?.message || error);
      toast.error(error?.response?.data?.detail || 'Could not save page');
    } finally {
      setSaving(false);
    }
  };

  const saveSection = async (payload) => {
    if (saving) return;
    try {
      setSaving(true);
      if (payload.id) await updateAdminCmsSection(payload.id, payload);
      else await createAdminCmsSection(pageKey, payload);
      toast.success('Section saved');
      setSectionDirty(false);
      setSectionEditorOpen(false);
      setSelected(null);
      try {
        await load({ showToast: false });
      } catch (refreshError) {
        console.warn('[admin/cms] Section saved but refresh failed', refreshError?.response?.data?.detail || refreshError?.message || refreshError);
      }
    } catch (error) {
      console.error('[admin/cms] Failed to save section', error?.response?.data?.detail || error?.message || error);
      toast.error(formatCmsSaveError(error));
    } finally {
      setSaving(false);
    }
  };

  const moveSection = async (index, direction) => {
    const next = [...sections];
    const nextIndex = index + direction;
    if (reordering || nextIndex < 0 || nextIndex >= next.length) return;

    const previousPage = page;
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    const reorderedSections = next.map((section, sectionIndex) => ({ ...section, sort_order: sectionIndex + 1 }));

    setPage((current) => ({
      ...(current || {}),
      sections: (current?.sections || []).map((section) => {
        const reordered = reorderedSections.find((item) => item.id === section.id);
        return reordered || section;
      }),
    }));
    setSelected((current) => current ? reorderedSections.find((section) => section.id === current.id) || current : null);

    try {
      setReordering(true);
      const data = await reorderAdminCmsSections(currentPageKey, reorderedSections.map((section) => ({
        id: section.id,
        sort_order: section.sort_order,
      })));
      const normalizedPage = normalizePageSections(data);
      setPage(normalizedPage);
      setSelected((current) => current ? normalizedPage.sections?.find((section) => section.id === current.id) || current : normalizedPage.sections?.[0] || null);
      toast.success('Section order saved');
    } catch (error) {
      setPage(previousPage);
      setSelected((current) => current ? previousPage?.sections?.find((section) => section.id === current.id) || current : previousPage?.sections?.[0] || null);
      toast.error(error?.response?.data?.detail || 'Could not save section order');
    } finally {
      setReordering(false);
    }
  };

  const deleteSection = async (section) => {
    await confirm({
      title: 'Delete section?',
      itemName: section.title || section.section_id || 'Selected section',
      message: 'This section will be removed from the page layout. This action cannot be undone.',
      confirmText: 'Delete',
      loadingText: 'Deleting...',
      onConfirm: async () => {
        try {
          await deleteAdminCmsSection(section.id);
          toast.success('Section deleted');
          await load();
        } catch (error) {
          toast.error(error?.response?.data?.detail || 'Could not delete section');
          return false;
        }
        return true;
      },
    });
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
        {PAGE_HELPERS[pageKey] && (
          <p className="mt-2 rounded-xl border border-purple-300/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">{PAGE_HELPERS[pageKey]}</p>
        )}
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
            <button type="button" onClick={() => { setSelected(null); setSectionEditorOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white">
              <Plus size={14} /> Add
            </button>
          </div>
          <SectionOrderList
            sections={sections}
            selectedId={selected?.id}
            onSelect={(section) => {
              setSelected(section);
              setSectionEditorOpen(true);
            }}
            onMove={moveSection}
            onDelete={deleteSection}
            onVisibilityChange={setVisibility}
            disabled={reordering}
          />
        </div>
        {sectionEditorOpen ? (
          <CmsSectionEditor pageKey={pageKey} section={selected} mediaItems={mediaItems} saving={saving} onSave={saveSection} onDirtyChange={setSectionDirty} />
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center">
            <h2 className="text-xl font-semibold text-white">Section overview</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">Select a section to edit it, or add a new section from the list.</p>
          </div>
        )}
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
