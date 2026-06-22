import React, { useEffect, useState } from 'react';
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
