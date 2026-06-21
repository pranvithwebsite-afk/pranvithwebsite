import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminMedia, fetchAdminPages, fetchAdminSettings, saveAdminSettings } from '../../lib/api';
import { defaultCoursePageContent, defaultCourseVisibility } from '../../components/CoursePageContent';

const requiredPages = [
  { title: 'Home', slug: 'home', path: '/' },
  { title: 'Courses', slug: 'courses', path: '/courses' },
  { title: 'About', slug: 'about', path: '/about' },
  { title: 'Assets', slug: 'assets', path: '/assets' },
  { title: 'Our Works', slug: 'works', path: '/works' },
  { title: 'Hire From Us', slug: 'hire', path: '/hire' },
];

const homeSections = [
  ['hero', 'Hero Section'],
  ['featuredAssets', 'Featured Assets Section'],
  ['instagramProfile', 'Instagram/Profile Section'],
  ['services', 'Services Section'],
  ['showreel', 'Showreel Section'],
  ['coursesPreview', 'Courses Preview Section'],
  ['studentTestimonials', 'Student Testimonials Section'],
  ['cta', 'CTA Course Section'],
  ['footerCta', 'Footer CTA Section'],
];

const legacyHomeSectionKeys = {
  showHero: 'hero',
  showFeaturedAssets: 'featuredAssets',
  showInstagramProfile: 'instagramProfile',
  showServices: 'services',
  showShowreel: 'showreel',
  showCoursesPreview: 'coursesPreview',
  showStudentTestimonials: 'studentTestimonials',
  showCta: 'cta',
  showFooterCta: 'footerCta',
  transformVision: 'instagramProfile',
  profile: 'instagramProfile',
  worksPreview: 'showreel',
  testimonials: 'studentTestimonials',
};

const defaultHomeVisibility = {
  hero: true,
  featuredAssets: true,
  instagramProfile: true,
  services: true,
  showreel: true,
  coursesPreview: false,
  studentTestimonials: false,
  cta: true,
  footerCta: true,
  section_order: homeSections.map(([key]) => key),
};

const defaultHomeHero = {
  badge_text: 'Learn premium editing, LUTs, transitions, and storytelling workflows that get results.',
  hero_title: 'Video Editing Mastery for Creators',
  hero_subtitle: 'Master the art of video editing with our comprehensive courses. From beginner basics to advanced techniques, learn professional editing skills that transform your creative vision into stunning reality.',
  primary_button_text: 'Explore Assets',
  primary_button_link: '/assets',
  secondary_button_text: 'Join Community',
  secondary_button_link: '/courses',
  hero_media_type: 'image',
  hero_media_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1600&q=80',
  hero_media_poster_url: '',
  hero_media_autoplay: true,
  hero_media_muted: true,
  hero_media_loop: true,
};

const defaultInstagramProfile = {
  username: 'pranvith_dop',
  display_name: 'Pranvith Dop',
  profile_image_url: '/assets/brand-profile.png',
  followers_count: '5,131',
  following_count: '10',
  posts_count: '',
  bio_line_1: 'ðŸŽ¥ DOP | Filmmaker | Video Editor',
  bio_line_2: 'ðŸš Drone Pilot | DI',
  bio_line_3: 'ðŸ“¸ Product & Commercial Photography',
  bio_line_4: 'ðŸŽ¨ Graphic Design',
  link_text: 'youtube.com/@pranvithdop',
  link_url: 'https://www.youtube.com/@pranvithdop',
  follow_button_url: 'https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
  cards: [
    { title: 'Cinematic editing reel', type: 'Reel', thumbnail_image_url: '', link_url: '', enabled: true, sort_order: 0 },
    { title: 'Behind the scenes', type: 'Post', thumbnail_image_url: '', link_url: '', enabled: true, sort_order: 1 },
    { title: 'Drone shot preview', type: 'Video', thumbnail_image_url: '', link_url: '', enabled: true, sort_order: 2 },
  ],
};

const defaultPageSettings = {
  about: {
    heading: 'DOP, filmmaker, editor, drone pilot, and visual storyteller.',
    subtitle: 'About Pranvith Dop',
    profile_image_url: '',
    description: 'PranvithDOP creates cinematic visuals for brands, creators, weddings, products, and digital campaigns.',
    experience_highlights: 'Film, ad & edit projects\nProduct and commercial shoots\nAerial/drone sequences\nPost-production workflow',
    cta_text: 'Book a project',
    cta_link: '/hire',
    show_hero: true,
    show_stats: true,
    show_gear: true,
  },
  assets: {
    heading: 'Creative Assets Store',
    subtitle: 'Premium LUTs, sound packs, motion templates and more - built for editors.',
    show_hero: true,
    show_product_listing: true,
    show_featured_products: true,
    cta_text: 'Explore Assets',
    cta_link: '/assets',
  },
  works: {
    heading: 'Portfolio Built With Light, Motion & Emotion',
    subtitle: 'A curated collection of cinematic commercial, wedding, drone, editing, product, and film work.',
    show_portfolio_grid: true,
    show_showreel: true,
    show_testimonials: true,
    cta_text: 'Book a project',
    cta_link: '/hire',
  },
  hire: {
    heading: 'Build a film, campaign, or visual story with cinematic intent.',
    subtitle: 'Tell us about your shoot, brand film, wedding, reel, product campaign, or edit.',
    show_enquiry_form: true,
    show_services: true,
    show_contact_info: true,
    cta_text: 'Send Project Enquiry',
    cta_link: '/hire',
  },
};

const fieldClass = 'w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500';

const mergeRequiredPages = (items) => requiredPages.map((required) => {
  const existing = items.find((page) => (page.slug || '') === required.slug || page.title === required.title);
  return existing ? { ...required, ...existing, path: required.path } : { ...required, missing: true, published: false };
});

const normalizeHomeVisibility = (value = {}) => {
  const merged = { ...defaultHomeVisibility };
  const keys = homeSections.map(([key]) => key);
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(value, key)) merged[key] = value[key];
  });
  Object.entries(legacyHomeSectionKeys).forEach(([oldKey, newKey]) => {
    if (
      Object.prototype.hasOwnProperty.call(value, oldKey)
      && !Object.prototype.hasOwnProperty.call(value, newKey)
    ) {
      merged[newKey] = value[oldKey];
    }
  });
  const incoming = Array.isArray(value.section_order) ? value.section_order : keys;
  const order = [];
  incoming.forEach((key) => {
    const canonicalKey = legacyHomeSectionKeys[key] || key;
    if (keys.includes(canonicalKey) && !order.includes(canonicalKey)) {
      order.push(canonicalKey);
    }
  });
  keys.forEach((key) => {
    if (!order.includes(key)) order.push(key);
  });
  return { ...merged, section_order: order };
};

const Website = () => {
  const [pages, setPages] = useState([]);
  const [settings, setSettings] = useState({});
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pagesData, settingsData, mediaData] = await Promise.all([
        fetchAdminPages().catch(() => []),
        fetchAdminSettings().catch(() => ({})),
        fetchAdminMedia().catch(() => []),
      ]);
      setPages(mergeRequiredPages(Array.isArray(pagesData) ? pagesData : []));
      setSettings(settingsData || {});
      setMediaItems(Array.isArray(mediaData) ? mediaData : []);
    } catch (error) {
      toast.error('Failed to load website data');
      setPages(mergeRequiredPages([]));
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (nextSettings) => {
    setSaving(true);
    try {
      const result = await saveAdminSettings({ ...settings, ...nextSettings });
      setSettings(result.settings || { ...settings, ...nextSettings });
      toast.success('Page settings saved');
      setEditingPage(null);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to save page settings');
    } finally {
      setSaving(false);
    }
  };

  if (editingPage) {
    return (
      <PageEditor
        page={editingPage}
        settings={settings}
        mediaItems={mediaItems}
        onBack={() => setEditingPage(null)}
        onSave={saveSettings}
        saving={saving}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Website Pages</h1>
        <p className="mt-3 text-slate-400">Choose a page card to edit its simple page-specific settings.</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400">Loading pages...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div key={page.id || page.slug} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white">{page.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{page.path || `/${page.slug}`}</p>
              <p className="mt-2 text-xs text-slate-500">
                Status: <span className={page.published ? 'text-green-400' : 'text-yellow-400'}>
                  {page.missing ? 'Not created' : page.published ? 'Published' : 'Draft'}
                </span>
              </p>
              <button
                onClick={() => setEditingPage(page)}
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

const PageEditor = ({ page, settings, mediaItems, onBack, onSave, saving }) => {
  const [draft, setDraft] = useState(() => ({
    home_hero: { ...defaultHomeHero, ...(settings.home_hero || {}) },
    home_visibility: normalizeHomeVisibility(settings.home_visibility),
    instagram_profile: {
      ...defaultInstagramProfile,
      ...(settings.instagram_profile || {}),
      cards: Array.isArray(settings.instagram_profile?.cards) ? settings.instagram_profile.cards : defaultInstagramProfile.cards,
    },
    course_visibility: { ...defaultCourseVisibility, ...(settings.course_visibility || {}) },
    course_page: {
      ...defaultCoursePageContent,
      ...(settings.course_page || {}),
      hero: { ...defaultCoursePageContent.hero, ...(settings.course_page?.hero || {}) },
    },
    page_settings: {
      ...defaultPageSettings,
      ...(settings.page_settings || {}),
    },
  }));

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const updatePageSettings = (slug, field, value) => {
    setDraft((current) => ({
      ...current,
      page_settings: {
        ...current.page_settings,
        [slug]: {
          ...defaultPageSettings[slug],
          ...(current.page_settings?.[slug] || {}),
          [field]: value,
        },
      },
    }));
  };

  const save = () => {
    const pagePayloads = {
      home: {
        home_hero: draft.home_hero,
        home_visibility: draft.home_visibility,
        instagram_profile: {
          ...draft.instagram_profile,
          cards: (draft.instagram_profile.cards || []).map((card, index) => ({ ...card, sort_order: index })),
        },
      },
      courses: {
        course_visibility: draft.course_visibility,
        course_page: {
          ...draft.course_page,
          learn_items: (draft.course_page.learn_items || []).map((item, index) => ({ ...item, sort_order: index })),
          testimonial_videos: (draft.course_page.testimonial_videos || []).map((item, index) => ({ ...item, sort_order: index })),
          text_reviews: (draft.course_page.text_reviews || []).map((item, index) => ({ ...item, sort_order: index })),
          comments: (draft.course_page.comments || []).map((item, index) => ({ ...item, sort_order: index })),
          faqs: (draft.course_page.faqs || []).map((item, index) => ({ ...item, sort_order: index })),
        },
      },
    };

    if (page.slug === 'home' || page.slug === 'courses') {
      onSave(pagePayloads[page.slug]);
      return;
    }
    onSave({ page_settings: draft.page_settings });
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200">
          <ArrowLeft size={16} /> Back to Website Pages
        </button>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">{page.title} Page Editor</h1>
            <p className="mt-2 text-slate-400">{page.path}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => window.open(page.path, '_blank')} className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white hover:border-violet-500">
              Preview
            </button>
            <button type="button" onClick={onBack} className="rounded-full border border-slate-700 p-3 text-slate-300 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {page.slug === 'home' && (
        <HomeEditor
          draft={draft}
          update={update}
          mediaItems={mediaItems}
        />
      )}
      {page.slug === 'courses' && (
        <CoursesEditor
          draft={draft}
          update={update}
          mediaItems={mediaItems}
        />
      )}
      {['about', 'assets', 'works', 'hire'].includes(page.slug) && (
        <SimplePageEditor
          slug={page.slug}
          pageSettings={{ ...defaultPageSettings[page.slug], ...(draft.page_settings?.[page.slug] || {}) }}
          update={(field, value) => updatePageSettings(page.slug, field, value)}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500 disabled:opacity-60 sm:w-auto"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button type="button" onClick={onBack} className="w-full rounded-lg border border-slate-700 px-6 py-3 font-semibold text-white transition hover:border-slate-600 sm:w-auto">
          Cancel
        </button>
      </div>
    </section>
  );
};

const HomeEditor = ({ draft, update, mediaItems }) => {
  const updateHero = (field, value) => update('home_hero', { ...draft.home_hero, [field]: value });
  const updateInstagram = (field, value) => update('instagram_profile', { ...draft.instagram_profile, [field]: value });
  const updateVisibility = (next) => update('home_visibility', normalizeHomeVisibility(next));

  return (
    <div className="space-y-6">
      <HomeVisibilityEditor visibility={draft.home_visibility} onChange={updateVisibility} />
      <HomeHeroEditor hero={draft.home_hero} mediaItems={mediaItems} onChange={updateHero} />
      <InstagramEditor profile={draft.instagram_profile} onChange={updateInstagram} update={update} />
    </div>
  );
};

const HomeVisibilityEditor = ({ visibility, onChange }) => {
  const order = normalizeHomeVisibility(visibility).section_order;
  const labels = Object.fromEntries(homeSections);

  const move = (index, direction) => {
    const next = [...order];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= next.length) return;
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange({ ...visibility, section_order: next });
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <h2 className="text-xl font-semibold text-white">Home Page Visibility</h2>
      <p className="mt-2 text-sm text-slate-400">Choose which sections are visible and control their Home page order.</p>
      <div className="mt-5 space-y-3">
        {order.map((key, index) => (
          <div key={key} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">{labels[key] || key}</p>
              <p className="text-xs text-slate-500">Order {index + 1}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={!!visibility[key]}
                  onChange={(event) => onChange({ ...visibility, [key]: event.target.checked })}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-violet-500 accent-violet-600"
                />
                Enabled
              </label>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-30 hover:border-violet-500">
                <ArrowUp size={14} /> Move Up
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === order.length - 1} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-30 hover:border-violet-500">
                <ArrowDown size={14} /> Move Down
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HomeHeroEditor = ({ hero, mediaItems, onChange }) => (
  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
    <h2 className="text-xl font-semibold text-white">Home Hero Section</h2>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <Field label="Badge text"><input value={hero.badge_text || ''} onChange={(event) => onChange('badge_text', event.target.value)} className={fieldClass} /></Field>
      <Field label="Hero title"><input value={hero.hero_title || ''} onChange={(event) => onChange('hero_title', event.target.value)} className={fieldClass} /></Field>
      <Field label="Hero subtitle"><textarea value={hero.hero_subtitle || ''} onChange={(event) => onChange('hero_subtitle', event.target.value)} rows={4} className={`${fieldClass} resize-none`} /></Field>
      <Field label="Hero media type">
        <select value={hero.hero_media_type || 'image'} onChange={(event) => onChange('hero_media_type', event.target.value)} className={fieldClass}>
          <option value="image">image</option>
          <option value="video_file">video_file</option>
          <option value="video_url">video_url</option>
        </select>
      </Field>
      <Field label="Primary button text"><input value={hero.primary_button_text || ''} onChange={(event) => onChange('primary_button_text', event.target.value)} className={fieldClass} /></Field>
      <Field label="Primary button link"><input value={hero.primary_button_link || ''} onChange={(event) => onChange('primary_button_link', event.target.value)} className={fieldClass} /></Field>
      <Field label="Secondary button text"><input value={hero.secondary_button_text || ''} onChange={(event) => onChange('secondary_button_text', event.target.value)} className={fieldClass} /></Field>
      <Field label="Secondary button link"><input value={hero.secondary_button_link || ''} onChange={(event) => onChange('secondary_button_link', event.target.value)} className={fieldClass} /></Field>
      <Field label="Hero media URL"><input value={hero.hero_media_url || ''} onChange={(event) => onChange('hero_media_url', event.target.value)} className={fieldClass} /></Field>
      <Field label="Poster/thumbnail URL"><input value={hero.hero_media_poster_url || ''} onChange={(event) => onChange('hero_media_poster_url', event.target.value)} className={fieldClass} /></Field>
    </div>
    {mediaItems.length > 0 && (
      <div className="mt-4">
        <select value="" onChange={(event) => event.target.value && onChange('hero_media_url', event.target.value)} className={fieldClass}>
          <option value="">Select uploaded hero image/video</option>
          {mediaItems.map((item) => <option key={item.id} value={item.url}>{item.title || item.url}</option>)}
        </select>
      </div>
    )}
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <Toggle label="Autoplay" checked={hero.hero_media_autoplay} onChange={(value) => onChange('hero_media_autoplay', value)} />
      <Toggle label="Muted" checked={hero.hero_media_muted} onChange={(value) => onChange('hero_media_muted', value)} />
      <Toggle label="Loop" checked={hero.hero_media_loop} onChange={(value) => onChange('hero_media_loop', value)} />
    </div>
  </div>
);

const InstagramEditor = ({ profile, onChange, update }) => {
  const cards = profile.cards || [];
  const updateCard = (index, field, value) => {
    const next = [...cards];
    next[index] = { ...(next[index] || {}), [field]: value };
    update('instagram_profile', { ...profile, cards: next.map((card, sort_order) => ({ ...card, sort_order })) });
  };
  const moveCard = (index, direction) => {
    const next = [...cards];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= next.length) return;
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    update('instagram_profile', { ...profile, cards: next.map((card, sort_order) => ({ ...card, sort_order })) });
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <h2 className="text-xl font-semibold text-white">Instagram/Profile</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {['username', 'display_name', 'profile_image_url', 'followers_count', 'following_count', 'posts_count', 'link_text', 'link_url', 'follow_button_url'].map((field) => (
          <Field key={field} label={field.replaceAll('_', ' ')}>
            <input value={profile[field] || ''} onChange={(event) => onChange(field, event.target.value)} className={fieldClass} />
          </Field>
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {['bio_line_1', 'bio_line_2', 'bio_line_3', 'bio_line_4'].map((field) => (
          <Field key={field} label={field.replaceAll('_', ' ')}>
            <input value={profile[field] || ''} onChange={(event) => onChange(field, event.target.value)} className={fieldClass} />
          </Field>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <h3 className="font-semibold text-white">Instagram cards/reels</h3>
        <button type="button" onClick={() => update('instagram_profile', { ...profile, cards: [...cards, { title: 'New card', type: 'Reel', thumbnail_image_url: '', link_url: '', enabled: true, sort_order: cards.length }] })} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white hover:border-violet-500">
          <Plus size={14} /> Add card
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {cards.map((card, index) => (
          <div key={`${card.title}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <Toggle label="Enabled" checked={card.enabled !== false} onChange={(value) => updateCard(index, 'enabled', value)} />
              <div className="flex gap-2">
                <IconButton disabled={index === 0} onClick={() => moveCard(index, -1)}><ArrowUp size={14} /></IconButton>
                <IconButton disabled={index === cards.length - 1} onClick={() => moveCard(index, 1)}><ArrowDown size={14} /></IconButton>
                <IconButton onClick={() => update('instagram_profile', { ...profile, cards: cards.filter((_, current) => current !== index) })}><Trash2 size={14} /></IconButton>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Title"><input value={card.title || ''} onChange={(event) => updateCard(index, 'title', event.target.value)} className={fieldClass} /></Field>
              <Field label="Type">
                <select value={card.type || 'Reel'} onChange={(event) => updateCard(index, 'type', event.target.value)} className={fieldClass}>
                  <option value="Reel">Reel</option>
                  <option value="Post">Post</option>
                  <option value="Video">Video</option>
                </select>
              </Field>
              <Field label="Thumbnail URL"><input value={card.thumbnail_image_url || ''} onChange={(event) => updateCard(index, 'thumbnail_image_url', event.target.value)} className={fieldClass} /></Field>
              <Field label="Link URL"><input value={card.link_url || ''} onChange={(event) => updateCard(index, 'link_url', event.target.value)} className={fieldClass} /></Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CoursesEditor = ({ draft, update, mediaItems }) => {
  const updateVisibility = (field, value) => update('course_visibility', { ...draft.course_visibility, [field]: value });
  const updateCourse = (next) => update('course_page', next);
  const updateHero = (field, value) => updateCourse({ ...draft.course_page, hero: { ...draft.course_page.hero, [field]: value } });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
        <h2 className="text-xl font-semibold text-white">Course Visibility</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Toggle label="Courses Enabled" checked={draft.course_visibility.courses_enabled} onChange={(value) => updateVisibility('courses_enabled', value)} />
          <Toggle label="Show Coming Soon" checked={draft.course_visibility.show_coming_soon} onChange={(value) => updateVisibility('show_coming_soon', value)} />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field label="Coming Soon title"><input value={draft.course_visibility.coming_soon_title || ''} onChange={(event) => updateVisibility('coming_soon_title', event.target.value)} className={fieldClass} /></Field>
          <Field label="Coming Soon subtitle"><textarea value={draft.course_visibility.coming_soon_subtitle || ''} onChange={(event) => updateVisibility('coming_soon_subtitle', event.target.value)} rows={3} className={`${fieldClass} resize-none`} /></Field>
          <Field label="Button text"><input value={draft.course_visibility.coming_soon_button_text || ''} onChange={(event) => updateVisibility('coming_soon_button_text', event.target.value)} className={fieldClass} /></Field>
          <Field label="Button link"><input value={draft.course_visibility.coming_soon_button_link || ''} onChange={(event) => updateVisibility('coming_soon_button_link', event.target.value)} className={fieldClass} /></Field>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
        <h2 className="text-xl font-semibold text-white">Course Hero</h2>
        <div className="mt-5">
          <Toggle
            label={'Show "Is This Course Right For You?" Section'}
            checked={draft.course_page.show_right_for_you !== false}
            onChange={(value) => updateCourse({ ...draft.course_page, show_right_for_you: value })}
          />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field label="Heading"><input value={draft.course_page.hero?.heading || ''} onChange={(event) => updateHero('heading', event.target.value)} className={fieldClass} /></Field>
          <Field label="Subtitle"><textarea value={draft.course_page.hero?.subtitle || ''} onChange={(event) => updateHero('subtitle', event.target.value)} rows={3} className={`${fieldClass} resize-none`} /></Field>
          <Field label="Button text"><input value={draft.course_page.hero?.button_text || ''} onChange={(event) => updateHero('button_text', event.target.value)} className={fieldClass} /></Field>
          <Field label="Button link"><input value={draft.course_page.hero?.button_link || ''} onChange={(event) => updateHero('button_link', event.target.value)} className={fieldClass} /></Field>
          <Field label="Image/video URL"><input value={draft.course_page.hero?.media_url || ''} onChange={(event) => updateHero('media_url', event.target.value)} className={fieldClass} /></Field>
        </div>
        {mediaItems.length > 0 && (
          <select value="" onChange={(event) => event.target.value && updateHero('media_url', event.target.value)} className={`${fieldClass} mt-4`}>
            <option value="">Select hero media from Media Library</option>
            {mediaItems.map((item) => <option key={item.id} value={item.url}>{item.title || item.url}</option>)}
          </select>
        )}
      </div>

      <CourseListEditor title="What You'll Learn" section="learn_items" items={draft.course_page.learn_items || []} updateCourse={updateCourse} coursePage={draft.course_page} template={{ title: 'New item', description: '', icon: '', enabled: true }} fields={['title', 'icon', 'description']} />
      <CourseListEditor title="Student Testimonial Video Cards" section="testimonial_videos" items={draft.course_page.testimonial_videos || []} updateCourse={updateCourse} coursePage={draft.course_page} template={{ student_name: 'New student', course_name: '', thumbnail_image_url: '', video_type: 'video_url', video_url: '', review_text: '', rating: 5, enabled: true }} fields={['student_name', 'course_name', 'thumbnail_image_url', 'video_type', 'video_url', 'rating', 'review_text']} />
      <CourseListEditor title="Student Text Reviews" section="text_reviews" items={draft.course_page.text_reviews || []} updateCourse={updateCourse} coursePage={draft.course_page} template={{ student_name: 'New student', student_image_url: '', course_name: '', rating: 5, review_text: '', enabled: true }} fields={['student_name', 'student_image_url', 'course_name', 'rating', 'review_text']} />
      <CourseListEditor title="Student Comments" section="comments" items={draft.course_page.comments || []} updateCourse={updateCourse} coursePage={draft.course_page} template={{ student_name: 'New student', comment_text: '', date: '', enabled: true }} fields={['student_name', 'date', 'comment_text']} />
      <CourseListEditor title="FAQ" section="faqs" items={draft.course_page.faqs || []} updateCourse={updateCourse} coursePage={draft.course_page} template={{ question: 'New question', answer: '', enabled: true }} fields={['question', 'answer']} />
    </div>
  );
};

const CourseListEditor = ({ title, section, items, coursePage, updateCourse, template, fields }) => {
  const updateItem = (index, field, value) => {
    const next = [...items];
    next[index] = { ...(next[index] || {}), [field]: value };
    updateCourse({ ...coursePage, [section]: next.map((item, sort_order) => ({ ...item, sort_order })) });
  };
  const move = (index, direction) => {
    const next = [...items];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= next.length) return;
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateCourse({ ...coursePage, [section]: next.map((item, sort_order) => ({ ...item, sort_order })) });
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <button type="button" onClick={() => updateCourse({ ...coursePage, [section]: [...items, { ...template, sort_order: items.length }] })} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-white hover:border-violet-500">
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {items.map((item, index) => (
          <div key={`${section}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <Toggle label="Enabled" checked={item.enabled !== false} onChange={(value) => updateItem(index, 'enabled', value)} />
              <div className="flex gap-2">
                <IconButton disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></IconButton>
                <IconButton disabled={index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></IconButton>
                <IconButton onClick={() => updateCourse({ ...coursePage, [section]: items.filter((_, current) => current !== index) })}><Trash2 size={14} /></IconButton>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {fields.map((field) => (
                <Field key={field} label={field.replaceAll('_', ' ')}>
                  {field === 'video_type' ? (
                    <select value={item[field] || 'video_url'} onChange={(event) => updateItem(index, field, event.target.value)} className={fieldClass}>
                      <option value="video_file">video_file</option>
                      <option value="video_url">video_url</option>
                      <option value="youtube">youtube</option>
                      <option value="vimeo">vimeo</option>
                    </select>
                  ) : field.includes('text') || field === 'description' || field === 'answer' ? (
                    <textarea value={item[field] || ''} onChange={(event) => updateItem(index, field, event.target.value)} rows={3} className={`${fieldClass} resize-none`} />
                  ) : (
                    <input type={field === 'rating' ? 'number' : 'text'} value={item[field] || ''} onChange={(event) => updateItem(index, field, event.target.value)} className={fieldClass} />
                  )}
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimplePageEditor = ({ slug, pageSettings, update }) => {
  const textFields = Object.entries(pageSettings).filter(([, value]) => typeof value !== 'boolean');
  const toggles = Object.entries(pageSettings).filter(([, value]) => typeof value === 'boolean');
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <h2 className="text-xl font-semibold capitalize text-white">{slug} Page Settings</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {textFields.map(([field, value]) => (
          <Field key={field} label={field.replaceAll('_', ' ')}>
            {field.includes('description') || field.includes('subtitle') || field.includes('highlights') ? (
              <textarea value={value || ''} onChange={(event) => update(field, event.target.value)} rows={4} className={`${fieldClass} resize-none`} />
            ) : (
              <input value={value || ''} onChange={(event) => update(field, event.target.value)} className={fieldClass} />
            )}
          </Field>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {toggles.map(([field, value]) => (
          <Toggle key={field} label={field.replaceAll('_', ' ')} checked={value} onChange={(next) => update(field, next)} />
        ))}
      </div>
    </div>
  );
};

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100">
    <span className="capitalize">{label}</span>
    <input type="checkbox" checked={!!checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-violet-500 accent-violet-600" />
  </label>
);

const IconButton = ({ children, onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="rounded-lg border border-slate-700 p-2 text-slate-200 disabled:opacity-30 hover:border-violet-500">
    {children}
  </button>
);

const Field = ({ label, children }) => (
  <label className="block text-sm text-slate-200">
    <span className="capitalize text-slate-400">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
);

export default Website;
