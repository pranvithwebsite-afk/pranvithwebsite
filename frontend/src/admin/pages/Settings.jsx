import React, { useEffect, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminMedia, fetchAdminRazorpayHealth, fetchAdminSettings, saveAdminSettings } from '../../lib/api';

const defaultSettings = {
  site_name: '',
  site_description: '',
  theme: 'dark',
  notifications_enabled: false,
  logo_url: '',
  contact_email: '',
  contact_phone: '',
  contact_address: '',
  meta_pixel_id: '',
  ga4_id: '',
  gtm_id: '',
  home_hero: {
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
  },
  instagram_profile: {
    username: 'pranvith_dop',
    display_name: 'Pranvith Dop',
    profile_image_url: '/assets/brand-profile.png',
    followers_count: '5,131',
    following_count: '10',
    posts_count: '',
    bio_line_1: '🎥 DOP | Filmmaker | Video Editor',
    bio_line_2: '🚁 Drone Pilot | DI',
    bio_line_3: '📸 Product & Commercial Photography',
    bio_line_4: '🎨 Graphic Design',
    link_text: 'youtube.com/@pranvithdop',
    link_url: 'https://www.youtube.com/@pranvithdop',
    follow_button_url: 'https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
    cards: [
      { title: 'Cinematic editing reel', type: 'Reel', thumbnail_image_url: '', link_url: 'https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', enabled: true, sort_order: 0 },
      { title: 'Behind the scenes', type: 'Post', thumbnail_image_url: '', link_url: 'https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', enabled: true, sort_order: 1 },
      { title: 'Drone shot preview', type: 'Video', thumbnail_image_url: '', link_url: 'https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', enabled: true, sort_order: 2 },
    ],
  },
};

const fieldClass = 'w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500';

const validateSettings = (settings) => {
  const errors = {};
  if (!settings.site_name.trim()) errors.site_name = 'Site name is required';
  if (settings.site_name.trim().length > 120) errors.site_name = 'Site name is too long';
  if (!['dark', 'light', 'default'].includes(settings.theme.trim().toLowerCase())) {
    errors.theme = 'Theme must be dark, light, or default';
  }
  if (!settings.site_description.trim()) errors.site_description = 'Site description is required';
  if (settings.site_description.trim().length > 300) errors.site_description = 'Keep description under 300 characters';
  return errors;
};

const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [checkingRazorpay, setCheckingRazorpay] = useState(false);
  const [razorpayHealth, setRazorpayHealth] = useState(null);
  const [razorpayHealthError, setRazorpayHealthError] = useState('');
  const [mediaItems, setMediaItems] = useState([]);

  useEffect(() => {
    fetchAdminSettings()
      .then((data) => {
        setSettings({
          ...defaultSettings,
          ...(data || {}),
          home_hero: {
            ...defaultSettings.home_hero,
            ...(data?.home_hero || {}),
          },
          instagram_profile: {
            ...defaultSettings.instagram_profile,
            ...(data?.instagram_profile || {}),
            cards: Array.isArray(data?.instagram_profile?.cards)
              ? data.instagram_profile.cards
              : defaultSettings.instagram_profile.cards,
          },
        });
        setLoadError('');
      })
      .catch((error) => {
        console.error('[admin/settings] Failed to load settings', error?.response?.data?.detail || error?.message || error);
        setLoadError('Settings could not be loaded.');
        toast.error('Failed to load settings');
      })
      .finally(() => setLoading(false));

    fetchAdminMedia()
      .then((data) => setMediaItems(Array.isArray(data) ? data : []))
      .catch(() => setMediaItems([]));
  }, []);

  const update = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const updateInstagram = (field, value) => {
    setSettings((current) => ({
      ...current,
      instagram_profile: {
        ...(current.instagram_profile || defaultSettings.instagram_profile),
        [field]: value,
      },
    }));
  };

  const updateHomeHero = (field, value) => {
    setSettings((current) => ({
      ...current,
      home_hero: {
        ...(current.home_hero || defaultSettings.home_hero),
        [field]: value,
      },
    }));
  };

  const updateInstagramCard = (index, field, value) => {
    setSettings((current) => {
      const profile = current.instagram_profile || defaultSettings.instagram_profile;
      const cards = [...(profile.cards || [])];
      cards[index] = { ...(cards[index] || {}), [field]: value };
      return {
        ...current,
        instagram_profile: {
          ...profile,
          cards: cards.map((card, sortOrder) => ({ ...card, sort_order: sortOrder })),
        },
      };
    });
  };

  const addInstagramCard = () => {
    setSettings((current) => {
      const profile = current.instagram_profile || defaultSettings.instagram_profile;
      const cards = [...(profile.cards || [])];
      cards.push({
        title: 'New Instagram card',
        type: 'Reel',
        thumbnail_image_url: '',
        link_url: profile.follow_button_url || defaultSettings.instagram_profile.follow_button_url,
        enabled: true,
        sort_order: cards.length,
      });
      return { ...current, instagram_profile: { ...profile, cards } };
    });
  };

  const removeInstagramCard = (index) => {
    setSettings((current) => {
      const profile = current.instagram_profile || defaultSettings.instagram_profile;
      const cards = (profile.cards || [])
        .filter((_, currentIndex) => currentIndex !== index)
        .map((card, sortOrder) => ({ ...card, sort_order: sortOrder }));
      return { ...current, instagram_profile: { ...profile, cards } };
    });
  };

  const moveInstagramCard = (index, direction) => {
    setSettings((current) => {
      const profile = current.instagram_profile || defaultSettings.instagram_profile;
      const cards = [...(profile.cards || [])];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= cards.length) return current;
      [cards[index], cards[nextIndex]] = [cards[nextIndex], cards[index]];
      return {
        ...current,
        instagram_profile: {
          ...profile,
          cards: cards.map((card, sortOrder) => ({ ...card, sort_order: sortOrder })),
        },
      };
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const nextErrors = validateSettings(settings);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        ...settings,
        site_name: settings.site_name.trim(),
        site_description: settings.site_description.trim(),
        theme: settings.theme.trim().toLowerCase(),
        home_hero: {
          ...(settings.home_hero || defaultSettings.home_hero),
        },
        instagram_profile: {
          ...(settings.instagram_profile || defaultSettings.instagram_profile),
          cards: (settings.instagram_profile?.cards || []).map((card, index) => ({
            ...card,
            sort_order: index,
          })),
        },
      };
      const result = await saveAdminSettings(payload);
      setSettings({
        ...defaultSettings,
        ...(result.settings || payload),
        home_hero: {
          ...defaultSettings.home_hero,
          ...((result.settings || payload).home_hero || {}),
        },
        instagram_profile: {
          ...defaultSettings.instagram_profile,
          ...((result.settings || payload).instagram_profile || {}),
        },
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('[admin/settings] Failed to save settings', error?.response?.data?.detail || error?.message || error);
      toast.error(error?.response?.data?.detail || 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  };

  const checkRazorpayHealth = async () => {
    setCheckingRazorpay(true);
    setRazorpayHealthError('');
    try {
      const data = await fetchAdminRazorpayHealth();
      setRazorpayHealth(data);
      if (
        data?.razorpay_key_id_present
        && data?.razorpay_key_secret_present
        && data?.razorpay_key_mode === 'live'
      ) {
        toast.success('Razorpay live keys are present');
      } else {
        toast.warning('Razorpay configuration needs attention');
      }
    } catch (error) {
      const message = error?.response?.status === 401
        ? 'Please login again. Admin authentication expired.'
        : (error?.response?.data?.detail || 'Unable to check Razorpay health');
      setRazorpayHealthError(message);
      toast.error(message);
    } finally {
      setCheckingRazorpay(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-3 text-slate-400">Manage safe public site settings. Secrets stay in environment variables.</p>
      </div>

      {loading ? (
        <div className="h-96 animate-pulse rounded-3xl border border-slate-800 bg-slate-950" />
      ) : loadError ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-rose-100">{loadError}</div>
      ) : (
        <form onSubmit={handleSave} className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="Site name" error={errors.site_name}>
              <input value={settings.site_name} onChange={(event) => update('site_name', event.target.value)} className={fieldClass} placeholder="PranvithDOP" />
            </Field>
            <Field label="Theme" error={errors.theme}>
              <select value={settings.theme} onChange={(event) => update('theme', event.target.value)} className={fieldClass}>
                <option value="dark">dark</option>
                <option value="light">light</option>
                <option value="default">default</option>
              </select>
            </Field>
          </div>

          <Field label="Site description" error={errors.site_description}>
            <textarea value={settings.site_description} onChange={(event) => update('site_description', event.target.value)} rows={4} className={`${fieldClass} min-h-[140px] resize-none`} placeholder="Premium video editing training, assets and tutorials." />
          </Field>

          <div className="grid gap-6 lg:grid-cols-2">
            <Field label="Logo URL">
              <input value={settings.logo_url} onChange={(event) => update('logo_url', event.target.value)} className={fieldClass} placeholder="/assets/brand-profile.png" />
            </Field>
            <Field label="Contact email">
              <input type="email" value={settings.contact_email} onChange={(event) => update('contact_email', event.target.value)} className={fieldClass} placeholder="info@pranvithdop.com" />
            </Field>
            <Field label="Contact phone">
              <input value={settings.contact_phone} onChange={(event) => update('contact_phone', event.target.value)} className={fieldClass} placeholder="+91 9059867883" />
            </Field>
            <Field label="Contact address">
              <input value={settings.contact_address} onChange={(event) => update('contact_address', event.target.value)} className={fieldClass} placeholder="Hyderabad, India" />
            </Field>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Field label="Meta Pixel ID">
              <input value={settings.meta_pixel_id} onChange={(event) => update('meta_pixel_id', event.target.value)} className={fieldClass} />
            </Field>
            <Field label="GA4 ID">
              <input value={settings.ga4_id} onChange={(event) => update('ga4_id', event.target.value)} className={fieldClass} />
            </Field>
            <Field label="GTM ID">
              <input value={settings.gtm_id} onChange={(event) => update('gtm_id', event.target.value)} className={fieldClass} />
            </Field>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input type="checkbox" checked={settings.notifications_enabled} onChange={(event) => update('notifications_enabled', event.target.checked)} className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-violet-500" />
            Enable site notifications for CMS events
          </label>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-white">Home Hero Section</h2>
              <p className="mt-2 text-sm text-slate-400">Controls the top hero copy, buttons, and media preview on the Home page.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Field label="Badge text">
                <input value={settings.home_hero.badge_text} onChange={(event) => updateHomeHero('badge_text', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Hero title">
                <input value={settings.home_hero.hero_title} onChange={(event) => updateHomeHero('hero_title', event.target.value)} className={fieldClass} />
              </Field>
            </div>

            <div className="mt-6">
              <Field label="Hero subtitle">
                <textarea value={settings.home_hero.hero_subtitle} onChange={(event) => updateHomeHero('hero_subtitle', event.target.value)} rows={4} className={`${fieldClass} min-h-[120px] resize-none`} />
              </Field>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Field label="Primary button text">
                <input value={settings.home_hero.primary_button_text} onChange={(event) => updateHomeHero('primary_button_text', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Primary button link">
                <input value={settings.home_hero.primary_button_link} onChange={(event) => updateHomeHero('primary_button_link', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Secondary button text">
                <input value={settings.home_hero.secondary_button_text} onChange={(event) => updateHomeHero('secondary_button_text', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Secondary button link">
                <input value={settings.home_hero.secondary_button_link} onChange={(event) => updateHomeHero('secondary_button_link', event.target.value)} className={fieldClass} />
              </Field>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Field label="Hero media type">
                <select value={settings.home_hero.hero_media_type} onChange={(event) => updateHomeHero('hero_media_type', event.target.value)} className={fieldClass}>
                  <option value="image">image</option>
                  <option value="video_file">video_file</option>
                  <option value="video_url">video_url</option>
                </select>
              </Field>
              <Field label="Hero media URL">
                <input value={settings.home_hero.hero_media_url} onChange={(event) => updateHomeHero('hero_media_url', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Poster/thumbnail URL optional">
                <input value={settings.home_hero.hero_media_poster_url} onChange={(event) => updateHomeHero('hero_media_poster_url', event.target.value)} className={fieldClass} />
              </Field>
            </div>

            {mediaItems.length > 0 && (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <select value="" onChange={(event) => event.target.value && updateHomeHero('hero_media_url', event.target.value)} className={fieldClass}>
                  <option value="">Select uploaded hero image/video</option>
                  {mediaItems.map((item) => (
                    <option key={item.id} value={item.url}>{item.title || item.url}</option>
                  ))}
                </select>
                <select value="" onChange={(event) => event.target.value && updateHomeHero('hero_media_poster_url', event.target.value)} className={fieldClass}>
                  <option value="">Select uploaded poster/thumbnail</option>
                  {mediaItems.filter((item) => String(item.type || '').startsWith('image/')).map((item) => (
                    <option key={item.id} value={item.url}>{item.title || item.url}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input type="checkbox" checked={!!settings.home_hero.hero_media_autoplay} onChange={(event) => updateHomeHero('hero_media_autoplay', event.target.checked)} className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-violet-500" />
                Autoplay
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input type="checkbox" checked={!!settings.home_hero.hero_media_muted} onChange={(event) => updateHomeHero('hero_media_muted', event.target.checked)} className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-violet-500" />
                Muted
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input type="checkbox" checked={!!settings.home_hero.hero_media_loop} onChange={(event) => updateHomeHero('hero_media_loop', event.target.checked)} className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-violet-500" />
                Loop
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-white">Instagram Profile</h2>
              <p className="mt-2 text-sm text-slate-400">Controls the Instagram-style profile mockup on the Home page.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Field label="Username">
                <input value={settings.instagram_profile.username} onChange={(event) => updateInstagram('username', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Display name">
                <input value={settings.instagram_profile.display_name} onChange={(event) => updateInstagram('display_name', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Profile image URL">
                <input value={settings.instagram_profile.profile_image_url} onChange={(event) => updateInstagram('profile_image_url', event.target.value)} className={fieldClass} placeholder="/assets/brand-profile.png" />
              </Field>
              <Field label="Followers count">
                <input value={settings.instagram_profile.followers_count} onChange={(event) => updateInstagram('followers_count', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Following count">
                <input value={settings.instagram_profile.following_count} onChange={(event) => updateInstagram('following_count', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Posts count optional">
                <input value={settings.instagram_profile.posts_count} onChange={(event) => updateInstagram('posts_count', event.target.value)} className={fieldClass} />
              </Field>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Field label="Bio line 1">
                <input value={settings.instagram_profile.bio_line_1} onChange={(event) => updateInstagram('bio_line_1', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Bio line 2">
                <input value={settings.instagram_profile.bio_line_2} onChange={(event) => updateInstagram('bio_line_2', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Bio line 3">
                <input value={settings.instagram_profile.bio_line_3} onChange={(event) => updateInstagram('bio_line_3', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Bio line 4">
                <input value={settings.instagram_profile.bio_line_4} onChange={(event) => updateInstagram('bio_line_4', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Link text">
                <input value={settings.instagram_profile.link_text} onChange={(event) => updateInstagram('link_text', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Link URL">
                <input value={settings.instagram_profile.link_url} onChange={(event) => updateInstagram('link_url', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Follow button URL">
                <input value={settings.instagram_profile.follow_button_url} onChange={(event) => updateInstagram('follow_button_url', event.target.value)} className={fieldClass} />
              </Field>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-white">Instagram cards/reels</h3>
              <button type="button" onClick={addInstagramCard} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white hover:border-violet-500">
                <Plus size={15} /> Add card
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {(settings.instagram_profile.cards || []).map((card, index) => (
                <div key={`${card.title}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Card {index + 1}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => moveInstagramCard(index, -1)} disabled={index === 0} className="rounded-lg border border-slate-700 p-2 text-slate-200 disabled:opacity-30"><ArrowUp size={14} /></button>
                      <button type="button" onClick={() => moveInstagramCard(index, 1)} disabled={index === settings.instagram_profile.cards.length - 1} className="rounded-lg border border-slate-700 p-2 text-slate-200 disabled:opacity-30"><ArrowDown size={14} /></button>
                      <button type="button" onClick={() => removeInstagramCard(index)} className="rounded-lg border border-rose-500/30 p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Title">
                      <input value={card.title || ''} onChange={(event) => updateInstagramCard(index, 'title', event.target.value)} className={fieldClass} />
                    </Field>
                    <Field label="Type">
                      <select value={card.type || 'Reel'} onChange={(event) => updateInstagramCard(index, 'type', event.target.value)} className={fieldClass}>
                        <option value="Reel">Reel</option>
                        <option value="Post">Post</option>
                        <option value="Video">Video</option>
                      </select>
                    </Field>
                    <Field label="Thumbnail image URL">
                      <input value={card.thumbnail_image_url || ''} onChange={(event) => updateInstagramCard(index, 'thumbnail_image_url', event.target.value)} className={fieldClass} />
                    </Field>
                    <Field label="Link URL">
                      <input value={card.link_url || ''} onChange={(event) => updateInstagramCard(index, 'link_url', event.target.value)} className={fieldClass} />
                    </Field>
                  </div>
                  <label className="mt-4 flex items-center gap-3 text-sm text-slate-200">
                    <input type="checkbox" checked={card.enabled !== false} onChange={(event) => updateInstagramCard(index, 'enabled', event.target.checked)} className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-violet-500" />
                    Enabled
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
              <Save size={16} />
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Razorpay Health</h2>
            <p className="mt-2 text-sm text-slate-400">Checks whether backend Razorpay live keys are present without showing any key or secret.</p>
          </div>
          <button
            type="button"
            onClick={checkRazorpayHealth}
            disabled={checkingRazorpay}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            <Activity size={16} />
            {checkingRazorpay ? 'Checking...' : 'Check Razorpay Health'}
          </button>
        </div>

        {razorpayHealthError && (
          <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{razorpayHealthError}</p>
        )}

        {razorpayHealth && (
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <HealthItem label="Key ID Present" value={razorpayHealth.razorpay_key_id_present ? 'Yes' : 'No'} ok={!!razorpayHealth.razorpay_key_id_present} />
            <HealthItem label="Key Secret Present" value={razorpayHealth.razorpay_key_secret_present ? 'Yes' : 'No'} ok={!!razorpayHealth.razorpay_key_secret_present} />
            <HealthItem label="Mode" value={razorpayHealth.razorpay_key_mode || 'unknown'} ok={razorpayHealth.razorpay_key_mode === 'live'} />
          </div>
        )}

        {razorpayHealth?.razorpay_key_id_present && razorpayHealth?.razorpay_key_secret_present && razorpayHealth?.razorpay_key_mode === 'live' && (
          <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            If checkout still shows Razorpay authentication failed, the Key Secret may not match the Key ID, or the key may be regenerated/deactivated.
          </p>
        )}
      </div>

    </section>
  );
};

const HealthItem = ({ label, value, ok }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`mt-1 font-semibold ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>{value}</p>
  </div>
);

const Field = ({ label, error, children }) => (
  <label className="block text-sm text-slate-200">
    <span className="text-slate-400">{label}</span>
    <div className="mt-2">{children}</div>
    {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
  </label>
);

export default Settings;
