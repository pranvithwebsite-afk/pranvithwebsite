import React, { useEffect, useMemo, useState } from 'react';
import MediaUrlInput from './MediaUrlInput';

const fieldClass = 'w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500';
const sectionTypes = ['hero', 'text', 'image_text', 'video', 'showreel', 'services_cards', 'portfolio_grid', 'product_showcase', 'course_showcase', 'testimonial_videos', 'reviews', 'faq', 'cta', 'contact_form', 'gallery', 'before_after'];
const mediaTypes = ['auto', 'image', 'video_file', 'youtube', 'vimeo'];

const emptySection = {
  section_id: '',
  type: 'text',
  title: '',
  subtitle: '',
  description: '',
  button_text: '',
  button_link: '',
  media_type: 'auto',
  media_url: '',
  poster_url: '',
  data: {},
  enabled: true,
};

const CmsSectionEditor = ({ section, mediaItems, onSave, saving }) => {
  const [draft, setDraft] = useState(section || emptySection);
  const [dataJson, setDataJson] = useState(JSON.stringify(section?.data || {}, null, 2));
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    setDraft(section || emptySection);
    setDataJson(JSON.stringify(section?.data || {}, null, 2));
    setJsonError('');
  }, [section]);

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const parsedData = useMemo(() => {
    try {
      return dataJson.trim() ? JSON.parse(dataJson) : {};
    } catch {
      return null;
    }
  }, [dataJson]);
  const items = Array.isArray(parsedData?.items) ? parsedData.items : [];
  const setDataValue = (field, value) => {
    const base = parsedData && typeof parsedData === 'object' ? parsedData : {};
    setDataJson(JSON.stringify({ ...base, [field]: value }, null, 2));
    setJsonError('');
  };
  const updateItems = (nextItems) => setDataValue('items', nextItems.map((item, index) => ({
    ...item,
    sort_order: item.sort_order ?? index,
  })));
  const addItem = () => updateItems([
    ...items,
    { title: '', subtitle: '', description: '', image_url: '', video_url: '', poster_url: '', button_text: '', button_link: '', category: '', enabled: true, sort_order: items.length },
  ]);
  const updateItem = (index, field, value) => updateItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const deleteItem = (index) => {
    if (!window.confirm('Delete this item?')) return;
    updateItems(items.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sort_order: itemIndex })));
  };
  const moveItem = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateItems(next.map((item, itemIndex) => ({ ...item, sort_order: itemIndex })));
  };
  const save = () => {
    try {
      const parsed = dataJson.trim() ? JSON.parse(dataJson) : {};
      setJsonError('');
      onSave({ ...draft, data: parsed });
    } catch {
      setJsonError('Data JSON is invalid.');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <h2 className="text-xl font-semibold text-white">{draft?.id ? 'Edit Section' : 'Add Section'}</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Section id"><input value={draft.section_id || ''} onChange={(event) => update('section_id', event.target.value)} className={fieldClass} /></Field>
        <Field label="Section type">
          <select value={draft.type || 'text'} onChange={(event) => update('type', event.target.value)} className={fieldClass}>
            {sectionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <Field label="Title"><input value={draft.title || ''} onChange={(event) => update('title', event.target.value)} className={fieldClass} /></Field>
        <Field label="Subtitle"><input value={draft.subtitle || ''} onChange={(event) => update('subtitle', event.target.value)} className={fieldClass} /></Field>
        <Field label="Description"><textarea value={draft.description || ''} onChange={(event) => update('description', event.target.value)} rows={4} className={`${fieldClass} resize-none`} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button text"><input value={draft.button_text || ''} onChange={(event) => update('button_text', event.target.value)} className={fieldClass} /></Field>
          <Field label="Button link"><input value={draft.button_link || ''} onChange={(event) => update('button_link', event.target.value)} className={fieldClass} /></Field>
        </div>
        <Field label="Media type">
          <select value={draft.media_type || 'auto'} onChange={(event) => update('media_type', event.target.value)} className={fieldClass}>
            {mediaTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </Field>
        <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white">
          <input type="checkbox" checked={draft.enabled !== false} onChange={(event) => update('enabled', event.target.checked)} className="h-5 w-5 accent-violet-600" />
          Section enabled
        </label>
        <MediaUrlInput label="Image/video URL" value={draft.media_url || ''} onChange={(value) => update('media_url', value)} mediaItems={mediaItems} />
        <MediaUrlInput label="Poster/thumbnail URL" value={draft.poster_url || ''} onChange={(value) => update('poster_url', value)} accept="image/*" mediaItems={mediaItems} />
        <Field label="Cards/items/advanced data JSON">
          <textarea value={dataJson} onChange={(event) => setDataJson(event.target.value)} rows={10} className={`${fieldClass} resize-none font-mono text-sm`} />
          {jsonError && <p className="mt-2 text-sm text-rose-300">{jsonError}</p>}
        </Field>
      </div>
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Cards / Items</h3>
            <p className="mt-1 text-xs text-slate-500">Structured editor for data.items. Raw JSON stays available above for advanced fields.</p>
          </div>
          <button type="button" onClick={addItem} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white hover:border-violet-500">Add item</button>
        </div>
        {!parsedData && <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">Fix invalid JSON before editing items.</p>}
        {parsedData && items.length === 0 && <p className="mt-4 text-sm text-slate-500">No items yet.</p>}
        {parsedData && items.length > 0 && (
          <div className="mt-4 space-y-4">
            {items.map((item, index) => (
              <div key={`${item.title || 'item'}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">Item {index + 1}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-white disabled:opacity-40">Up</button>
                    <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-white disabled:opacity-40">Down</button>
                    <button type="button" onClick={() => deleteItem(index)} className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-100">Delete</button>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Item title"><input value={item.title || item.question || item.student_name || ''} onChange={(event) => updateItem(index, item.question !== undefined ? 'question' : item.student_name !== undefined ? 'student_name' : 'title', event.target.value)} className={fieldClass} /></Field>
                  <Field label="Subtitle / category"><input value={item.subtitle || item.category || item.course_name || ''} onChange={(event) => updateItem(index, item.category !== undefined ? 'category' : item.course_name !== undefined ? 'course_name' : 'subtitle', event.target.value)} className={fieldClass} /></Field>
                  <Field label="Description / answer"><textarea value={item.description || item.answer || item.review_text || item.comment_text || ''} onChange={(event) => updateItem(index, item.answer !== undefined ? 'answer' : item.review_text !== undefined ? 'review_text' : item.comment_text !== undefined ? 'comment_text' : 'description', event.target.value)} rows={3} className={`${fieldClass} resize-none`} /></Field>
                  <Field label="Button text"><input value={item.button_text || ''} onChange={(event) => updateItem(index, 'button_text', event.target.value)} className={fieldClass} /></Field>
                  <Field label="Button link"><input value={item.button_link || item.link_url || ''} onChange={(event) => updateItem(index, item.link_url !== undefined ? 'link_url' : 'button_link', event.target.value)} className={fieldClass} /></Field>
                  <Field label="Sort order"><input type="number" value={item.sort_order ?? index} onChange={(event) => updateItem(index, 'sort_order', Number(event.target.value))} className={fieldClass} /></Field>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white">
                    <input type="checkbox" checked={item.enabled !== false} onChange={(event) => updateItem(index, 'enabled', event.target.checked)} className="h-5 w-5 accent-violet-600" />
                    Item enabled
                  </label>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <MediaUrlInput label="Image / thumbnail URL" value={item.image_url || item.thumbnail_image_url || item.thumbnail_url || ''} onChange={(value) => updateItem(index, item.thumbnail_image_url !== undefined ? 'thumbnail_image_url' : item.thumbnail_url !== undefined ? 'thumbnail_url' : 'image_url', value)} accept="image/*" mediaItems={mediaItems} />
                  <MediaUrlInput label="Video URL" value={item.video_url || ''} onChange={(value) => updateItem(index, 'video_url', value)} accept="video/*" mediaItems={mediaItems} />
                  <MediaUrlInput label="Poster URL" value={item.poster_url || ''} onChange={(value) => updateItem(index, 'poster_url', value)} accept="image/*" mediaItems={mediaItems} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={save} disabled={saving} className="mt-5 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60">
        {saving ? 'Saving...' : 'Save Section'}
      </button>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block text-sm text-slate-300">
    <span className="capitalize text-slate-400">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
);

export default CmsSectionEditor;
