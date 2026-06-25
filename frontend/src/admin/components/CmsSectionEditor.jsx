import React, { useEffect, useMemo, useRef, useState } from 'react';
import MediaUrlInput from './MediaUrlInput';

const fieldClass = 'w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500';
const sectionTypes = ['hero', 'text', 'image_text', 'video', 'showreel', 'services_cards', 'portfolio_grid', 'product_showcase', 'course_showcase', 'testimonial_videos', 'video_reviews', 'reviews', 'testimonials', 'faq', 'cta', 'contact_form', 'gallery', 'before_after'];
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

const SIMPLE_DEFAULT_SCHEMA = {
  sectionFields: ['section_id', 'type', 'title', 'description', 'enabled'],
  itemFields: ['title', 'description', 'sort_order', 'enabled'],
};

const SECTION_EDITOR_SCHEMAS = {
  'home:hero': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'button_text', 'button_link', 'media_type', 'media_url', 'poster_url', 'enabled'] },
  'home:featured-assets': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'button_text', 'button_link', 'enabled'], itemFields: ['title', 'category', 'description', 'thumbnail_image_url', 'video_url', 'sort_order', 'enabled'] },
  'home:instagram-profile': {
    sectionFields: ['section_id', 'type', 'title', 'description', 'button_text', 'button_link', 'media_url', 'enabled'],
    dataFields: ['username', 'display_name', 'followers_count', 'following_count', 'bio_line_1', 'bio_line_2', 'bio_line_3', 'bio_line_4', 'link_text', 'link_url', 'follow_button_url'],
    itemFields: ['title', 'type', 'coverText', 'thumbnail_image_url', 'link_url', 'sort_order', 'enabled'],
  },
  'home:services': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'enabled'], itemFields: ['title', 'description', 'button_link', 'sort_order', 'enabled'] },
  'home:showreel': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'button_text', 'button_link', 'media_type', 'media_url', 'poster_url', 'enabled'], itemFields: ['title', 'category', 'description', 'thumbnail_image_url', 'video_url', 'sort_order', 'enabled'] },
  'home:cta': { sectionFields: ['section_id', 'type', 'title', 'description', 'button_text', 'button_link', 'enabled'] },
  'home:faq': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'button_text', 'button_link', 'enabled'], itemFields: ['question', 'answer', 'sort_order', 'enabled'] },

  'courses:coming-soon': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'button_text', 'button_link', 'enabled'] },
  'courses:hero': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'button_text', 'button_link', 'media_url', 'enabled'] },
  'courses:right-for-you': { sectionFields: ['section_id', 'type', 'title', 'button_text', 'button_link', 'enabled'], dataFields: ['cta_text'], itemFields: ['title', 'description', 'sort_order', 'enabled'] },
  'courses:what-youll-learn': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'enabled'], itemFields: ['title', 'description', 'sort_order', 'enabled'] },
  'courses:course-list': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'enabled'], dataFields: ['show_course_list'] },
  'courses:student-videos': {
    sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'enabled'],
    itemFields: ['title', 'subtitle', 'description', 'image_url', 'video_url', 'sort_order', 'enabled'],
    itemLabels: { title: 'Video Title / Student Name', subtitle: 'Course / Role', description: 'Review Text', image_url: 'Thumbnail Image' },
  },
  'courses:student-reviews': {
    sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'enabled'],
    itemFields: ['title', 'subtitle', 'description', 'rating', 'image_url', 'sort_order', 'enabled'],
    itemLabels: { title: 'Student Name', subtitle: 'Course / Role', description: 'Review Text', image_url: 'Student Photo' },
  },
  'courses:testimonial_videos': {
    sectionFields: ['section_id', 'type', 'title', 'enabled'],
    itemFields: ['student_name', 'course_name', 'review_text', 'thumbnail_image_url', 'video_url', 'sort_order', 'enabled'],
    itemLabels: { student_name: 'Video Title / Student Name', course_name: 'Course / Role', review_text: 'Review Text', thumbnail_image_url: 'Thumbnail Image' },
  },
  'courses:reviews': {
    sectionFields: ['section_id', 'type', 'title', 'enabled'],
    itemFields: ['student_name', 'course_name', 'review_text', 'rating', 'student_image_url', 'sort_order', 'enabled'],
    itemLabels: { student_name: 'Student Name', course_name: 'Course / Role', review_text: 'Review Text', student_image_url: 'Student Photo' },
  },
  'courses:faq': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'enabled'], itemFields: ['question', 'answer', 'sort_order', 'enabled'] },

  'about:hero': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'button_text', 'button_link', 'media_url', 'enabled'], dataFields: ['secondary_button_text', 'secondary_button_link'] },
  'about:stats': { sectionFields: ['section_id', 'type', 'title', 'enabled'], itemFields: ['title', 'description', 'sort_order', 'enabled'], itemLabels: { title: 'Stat Number', description: 'Stat Label' } },
  'about:creative-positioning': { sectionFields: ['section_id', 'type', 'title', 'description', 'enabled'] },
  'about:gear-workflow': { sectionFields: ['section_id', 'type', 'title', 'enabled'], itemFields: ['title', 'sort_order', 'enabled'], itemLabels: { title: 'Gear Item' } },

  'assets:hero': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'enabled'] },

  'works:hero': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'enabled'] },
  'works:showreel': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'button_text', 'button_link', 'media_type', 'media_url', 'poster_url', 'enabled'] },
  'works:projects': { sectionFields: ['section_id', 'type', 'title', 'enabled'], itemFields: ['title', 'category', 'description', 'thumbnail_image_url', 'video_url', 'equipment', 'client', 'date', 'sort_order', 'enabled'] },
  'works:client-testimonials': {
    sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'enabled'],
    itemFields: ['title', 'subtitle', 'description', 'rating', 'image_url', 'sort_order', 'enabled'],
    itemLabels: { title: 'Client Name', subtitle: 'Client Role / Company', description: 'Testimonial Text', image_url: 'Client Photo / Logo' },
  },
  'works:cta': { sectionFields: ['section_id', 'type', 'title', 'description', 'button_text', 'button_link', 'enabled'] },

  'hire:hero': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'enabled'] },
  'hire:services': { sectionFields: ['section_id', 'type', 'title', 'enabled'], itemFields: ['title', 'sort_order', 'enabled'], itemLabels: { title: 'Benefit Text' } },
  'hire:info-cards': { sectionFields: ['section_id', 'type', 'title', 'enabled'], itemFields: ['title', 'description', 'sort_order', 'enabled'] },
  'hire:enquiry-form': {
    sectionFields: ['section_id', 'type', 'title', 'description', 'button_text', 'enabled'],
    dataFields: ['name_label', 'name_placeholder', 'email_label', 'email_placeholder', 'phone_label', 'phone_placeholder', 'project_type_label', 'project_type_placeholder', 'project_types', 'message_label', 'message_placeholder', 'submit_button_text', 'success_message', 'validation_message'],
  },

  'privacy:legal-sections': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'enabled'], itemFields: ['title', 'paragraphs', 'bullets', 'after', 'sort_order', 'enabled'] },
  'terms:legal-sections': { sectionFields: ['section_id', 'type', 'title', 'subtitle', 'description', 'enabled'], itemFields: ['title', 'paragraphs', 'bullets', 'after', 'sort_order', 'enabled'] },
};

const FIELD_LABELS = {
  section_id: 'Section ID',
  type: 'Type',
  title: 'Title',
  subtitle: 'Subtitle',
  description: 'Description',
  button_text: 'Button Text',
  button_link: 'Button Link',
  media_type: 'Media Type',
  media_url: 'Image / Video URL',
  poster_url: 'Poster / Thumbnail URL',
  enabled: 'Section Enabled',
  question: 'Question',
  answer: 'Answer',
  category: 'Category',
  thumbnail_image_url: 'Thumbnail Image',
  image_url: 'Image',
  video_url: 'Video URL',
  link_url: 'Link URL',
  coverText: 'Cover Text',
  sort_order: 'Sort Order',
  equipment: 'Equipment',
  client: 'Client',
  date: 'Date',
  student_name: 'Student Name',
  course_name: 'Course Name',
  review_text: 'Review Text',
  rating: 'Rating',
  cta_text: 'CTA Text',
  show_course_list: 'Show Course List',
  project_types: 'Project Type Options',
  name_label: 'Name Label',
  name_placeholder: 'Name Placeholder',
  email_label: 'Email Label',
  email_placeholder: 'Email Placeholder',
  phone_label: 'Phone Label',
  phone_placeholder: 'Phone Placeholder',
  project_type_label: 'Project Type Label',
  project_type_placeholder: 'Project Type Placeholder',
  message_label: 'Message Label',
  message_placeholder: 'Message Placeholder',
  submit_button_text: 'Submit Button Text',
  success_message: 'Success Message',
  validation_message: 'Validation Message',
  paragraphs: 'Paragraphs',
  bullets: 'Bullets',
  after: 'After Paragraphs',
  username: 'Instagram Username',
  display_name: 'Display Name',
  followers_count: 'Followers Count',
  following_count: 'Following Count',
  bio_line_1: 'Bio Line 1',
  bio_line_2: 'Bio Line 2',
  bio_line_3: 'Bio Line 3',
  bio_line_4: 'Bio Line 4',
  link_text: 'Profile Link Text',
  follow_button_url: 'Follow Button URL',
  secondary_button_text: 'Secondary Button Text',
  secondary_button_link: 'Secondary Button Link',
};

const mediaFields = new Set(['media_url', 'poster_url', 'thumbnail_image_url', 'image_url']);
const videoFields = new Set(['video_url']);
const longTextFields = new Set(['description', 'answer', 'review_text', 'paragraphs', 'bullets', 'after']);
const booleanFields = new Set(['enabled', 'show_course_list']);
const numberFields = new Set(['sort_order', 'rating']);

const getSchema = (pageKey, section) => {
  const sectionId = section?.section_id || '';
  return SECTION_EDITOR_SCHEMAS[`${pageKey}:${sectionId}`] || SIMPLE_DEFAULT_SCHEMA;
};

const getFieldLabel = (field, labels = {}) => labels[field] || FIELD_LABELS[field] || field.replaceAll('_', ' ');

const normalizeDataValue = (field, value) => {
  if (field === 'project_types') {
    if (Array.isArray(value)) return value.join('\n');
    return '';
  }
  if (['paragraphs', 'bullets', 'after'].includes(field)) {
    if (Array.isArray(value)) return value.join('\n');
    return value || '';
  }
  if (typeof value === 'boolean') return value;
  return value ?? '';
};

const denormalizeDataValue = (field, value) => {
  if (field === 'project_types') {
    return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
  }
  if (['paragraphs', 'bullets', 'after'].includes(field)) {
    return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
  }
  return value;
};

const createEmptyItem = (fields = []) => fields.reduce((item, field) => {
  if (field === 'enabled') return { ...item, enabled: true };
  if (field === 'sort_order') return item;
  if (numberFields.has(field)) return { ...item, [field]: 0 };
  return { ...item, [field]: '' };
}, {});

const getSectionIdentity = (section) => section?.id || section?.section_id || 'new-section';

const getItemIdentity = (item = {}, index) =>
  item.id || item.local_id || item._id || item.__cmsLocalId || `item-${index}`;

const stripEditorOnlyItemFields = (item = {}) => {
  const { __cmsLocalId, ...rest } = item;
  return rest;
};

const CmsSectionEditor = ({ pageKey, section, mediaItems, onSave, saving }) => {
  const [draft, setDraft] = useState(section || emptySection);
  const localItemCounter = useRef(0);
  const sectionIdentity = `${pageKey}:${getSectionIdentity(section)}`;
  const previousSectionIdentity = useRef(sectionIdentity);

  useEffect(() => {
    const nextIdentity = `${pageKey}:${getSectionIdentity(section)}`;
    if (previousSectionIdentity.current !== nextIdentity) {
      previousSectionIdentity.current = nextIdentity;
      setDraft(section || emptySection);
    }
  }, [pageKey, section, sectionIdentity]);

  const schema = useMemo(() => getSchema(pageKey, draft), [pageKey, draft]);
  const data = draft.data && typeof draft.data === 'object' ? draft.data : {};
  const items = Array.isArray(data.items) ? data.items : [];

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const updateData = (field, value) => setDraft((current) => ({
    ...current,
    data: {
      ...(current.data || {}),
      [field]: denormalizeDataValue(field, value),
    },
  }));
  const updateItems = (nextItems) => setDraft((current) => ({
    ...current,
    data: {
      ...(current.data || {}),
      items: nextItems.map((item, index) => ({
        ...item,
        sort_order: item.sort_order ?? index,
      })),
    },
  }));
  const updateItem = (index, field, value) => updateItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const updateNormalizedItem = (index, field, value) => updateItem(index, field, denormalizeDataValue(field, value));
  const addItem = () => {
    const localId = `cms-item-${localItemCounter.current}`;
    localItemCounter.current += 1;
    updateItems([...items, { ...createEmptyItem(schema.itemFields || []), __cmsLocalId: localId, sort_order: items.length }]);
  };
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
    const mergedData = {
      ...(section?.data || {}),
      ...(draft.data || {}),
    };

    if (Array.isArray(mergedData.items)) {
      mergedData.items = mergedData.items.map(stripEditorOnlyItemFields);
    }

    onSave({
      ...(section || {}),
      ...draft,
      data: mergedData,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <h2 className="text-xl font-semibold text-white">{draft?.id ? 'Edit Section' : 'Add Section'}</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {(schema.sectionFields || SIMPLE_DEFAULT_SCHEMA.sectionFields).map((field) => (
          <SectionField
            key={field}
            field={field}
            value={draft[field]}
            onChange={(value) => update(field, value)}
            mediaItems={mediaItems}
          />
        ))}
      </div>

      {(schema.dataFields || []).length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="text-lg font-semibold text-white">Section Details</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {schema.dataFields.map((field) => (
              <DataField
                key={field}
                field={field}
                value={normalizeDataValue(field, data[field])}
                onChange={(value) => updateData(field, value)}
              />
            ))}
          </div>
        </div>
      )}

      {(schema.itemFields || []).length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Items</h3>
              <p className="mt-1 text-xs text-slate-500">Only the fields used by this public section are shown.</p>
            </div>
            <button type="button" onClick={addItem} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white hover:border-violet-500">Add item</button>
          </div>
          {items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No items yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {items.map((item, index) => (
                <div key={getItemIdentity(item, index)} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">Item {index + 1}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-white disabled:opacity-40">Up</button>
                      <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-white disabled:opacity-40">Down</button>
                      <button type="button" onClick={() => deleteItem(index)} className="rounded-lg border border-rose-500/30 px-2 py-1 text-xs text-rose-100">Delete</button>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {schema.itemFields.map((field) => (
                      <ItemField
                        key={field}
                        field={field}
                        labels={schema.itemLabels}
                        value={field === 'sort_order' ? item.sort_order ?? index : normalizeDataValue(field, item[field])}
                        onChange={(value) => updateNormalizedItem(index, field, value)}
                        mediaItems={mediaItems}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button type="button" onClick={save} disabled={saving} className="mt-5 rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60">
        {saving ? 'Saving...' : 'Save Section'}
      </button>
    </div>
  );
};

const SectionField = ({ field, value, onChange, mediaItems }) => {
  if (field === 'type') {
    return (
      <Field label="Section Type">
        <select value={value || 'text'} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
          {sectionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </Field>
    );
  }
  if (field === 'media_type') {
    return (
      <Field label={FIELD_LABELS[field]}>
        <select value={value || 'auto'} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
          {mediaTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </Field>
    );
  }
  return <EditableField field={field} value={value} onChange={onChange} mediaItems={mediaItems} label={FIELD_LABELS[field]} />;
};

const DataField = ({ field, value, onChange }) => (
  <EditableField field={field} value={value} onChange={onChange} label={FIELD_LABELS[field]} />
);

const ItemField = ({ field, labels, value, onChange, mediaItems }) => (
  <EditableField field={field} value={value} onChange={onChange} mediaItems={mediaItems} label={getFieldLabel(field, labels)} />
);

const EditableField = ({ field, value, onChange, mediaItems, label }) => {
  if (booleanFields.has(field)) {
    return (
      <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white">
        <input type="checkbox" checked={value !== false} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-violet-600" />
        {label}
      </label>
    );
  }
  if (mediaFields.has(field) || videoFields.has(field)) {
    const accept = field === 'media_url' ? 'image/*,video/*' : videoFields.has(field) ? 'video/*' : 'image/*';
    return (
      <MediaUrlInput
        label={label}
        value={value || ''}
        onChange={onChange}
        accept={accept}
        mediaItems={mediaItems}
      />
    );
  }
  if (numberFields.has(field)) {
    return (
      <Field label={label}>
        <input type="number" value={value ?? 0} onChange={(event) => onChange(Number(event.target.value))} className={fieldClass} />
      </Field>
    );
  }
  if (longTextFields.has(field) || field === 'project_types') {
    return (
      <Field label={label}>
        <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} rows={field === 'project_types' || ['paragraphs', 'bullets', 'after'].includes(field) ? 7 : 4} className={`${fieldClass} resize-none`} />
        {(field === 'project_types' || ['paragraphs', 'bullets', 'after'].includes(field)) && <p className="mt-2 text-xs text-slate-500">One entry per line.</p>}
      </Field>
    );
  }
  return (
    <Field label={label}>
      <input value={value || ''} onChange={(event) => onChange(event.target.value)} className={fieldClass} />
    </Field>
  );
};

const Field = ({ label, children }) => (
  <label className="block text-sm text-slate-300">
    <span className="text-slate-400">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
);

export default CmsSectionEditor;
