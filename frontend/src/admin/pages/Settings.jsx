import React, { useEffect, useState } from 'react';
import { Activity, Save } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminRazorpayHealth, fetchAdminSettings, formatApiErrorDetail, saveAdminSettings } from '../../lib/api';
import MediaUrlInput from '../components/MediaUrlInput';

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
  header: {
    logo_url: '',
    logo_badge_text: 'PD',
    brand_title_primary: 'PRANVITH',
    brand_title_accent: 'DOP',
    cta_text: 'Buy Bundle',
    cta_link: '/assets',
  },
  footer: {
    brand_title: 'PranvithDOP',
    description: 'Empowering creators with AI-driven tools and professional video editing resources.\nJoin the future of content creation.',
    youtube_link: '#',
    instagram_link: '#',
    explore_links: [
      { name: 'Courses', path: '/courses' },
      { name: 'About Us', path: '/about' },
      { name: 'Our Works', path: '/works' },
      { name: 'Assets', path: '/assets' },
      { name: 'Privacy Policy', path: '/privacy-policy' },
      { name: 'FAQ', path: '/#faq' },
    ],
    contact_location: 'Hyderabad, India',
    contact_email: 'info@pranvithdop.com',
    contact_phone: '+91 9059867883',
    newsletter_heading: 'Stay Updated',
    newsletter_description: 'Subscribe to our newsletter for the latest AI tools and editing tips.',
    subscribe_button_text: 'Subscribe',
  },
};

const fieldClass = 'w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500';

const encodeFooterLinks = (links = []) =>
  (Array.isArray(links) ? links : [])
    .map((link) => `${link.name || ''}|${link.path || ''}`)
    .join('\n');

const decodeFooterLinks = (value) =>
  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, ...pathParts] = line.split('|');
      return {
        name: (name || '').trim(),
        path: (pathParts.join('|') || '#').trim(),
        enabled: true,
        sort_order: index,
      };
    });

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
  const [rawSettings, setRawSettings] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [checkingRazorpay, setCheckingRazorpay] = useState(false);
  const [razorpayHealth, setRazorpayHealth] = useState(null);
  const [razorpayHealthError, setRazorpayHealthError] = useState('');

  useEffect(() => {
    fetchAdminSettings()
      .then((data) => {
        const loaded = data || {};
        setRawSettings(loaded);
        setSettings({
          ...defaultSettings,
          ...loaded,
          header: { ...defaultSettings.header, ...(loaded.header || {}) },
          footer: { ...defaultSettings.footer, ...(loaded.footer || {}) },
        });
        setLoadError('');
      })
      .catch((error) => {
        console.error('[admin/settings] Failed to load settings', error?.response?.data?.detail || error?.message || error);
        setLoadError('Settings could not be loaded.');
        toast.error('Failed to load settings');
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const updateHeader = (field, value) => {
    setSettings((current) => ({
      ...current,
      header: {
        ...(current.header || defaultSettings.header),
        [field]: value,
      },
    }));
  };

  const updateFooter = (field, value) => {
    setSettings((current) => ({
      ...current,
      footer: {
        ...(current.footer || defaultSettings.footer),
        [field]: value,
      },
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (saving) return;
    const nextErrors = validateSettings(settings);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        ...rawSettings,
        site_name: settings.site_name.trim(),
        site_description: settings.site_description.trim(),
        theme: settings.theme.trim().toLowerCase(),
        notifications_enabled: !!settings.notifications_enabled,
        logo_url: settings.logo_url,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        contact_address: settings.contact_address,
        meta_pixel_id: settings.meta_pixel_id,
        ga4_id: settings.ga4_id,
        gtm_id: settings.gtm_id,
        header: settings.header,
        footer: settings.footer,
      };
      const result = await saveAdminSettings(payload);
      const saved = result.settings || payload;
      setRawSettings(saved);
      setSettings({
        ...defaultSettings,
        ...saved,
        header: { ...defaultSettings.header, ...(saved.header || {}) },
        footer: { ...defaultSettings.footer, ...(saved.footer || {}) },
      });
      toast.success('Settings saved successfully');
      try {
        const refreshed = await fetchAdminSettings();
        const nextSettings = refreshed || saved;
        setRawSettings(nextSettings);
        setSettings({
          ...defaultSettings,
          ...nextSettings,
          header: { ...defaultSettings.header, ...(nextSettings.header || {}) },
          footer: { ...defaultSettings.footer, ...(nextSettings.footer || {}) },
        });
      } catch (refreshError) {
        console.warn('[admin/settings] Settings saved but refresh failed', refreshError?.response?.data?.detail || refreshError?.message || refreshError);
      }
    } catch (error) {
      console.error('[admin/settings] Failed to save settings', error?.response?.data?.detail || error?.message || error);
      const detail = formatApiErrorDetail(error?.response?.data?.detail);
      toast.error(detail || error?.message || 'Unable to save settings');
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
      if (data?.razorpay_key_id_present && data?.razorpay_key_secret_present && data?.razorpay_key_mode === 'live') {
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
        <p className="mt-3 text-slate-400">Manage global site settings. Page content lives under Website.</p>
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
            <MediaUrlInput
              label="Logo URL"
              value={settings.logo_url}
              onChange={(value) => update('logo_url', value)}
              accept="image/*"
              placeholder="/assets/brand-profile.png"
            />
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

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl font-semibold text-white">Header & Branding</h2>
            <p className="mt-2 text-sm text-slate-500">Customize the site header logo, brand name, and top-right CTA button dynamically.</p>
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <MediaUrlInput
                label="Header Logo Image"
                value={settings.header?.logo_url || ''}
                onChange={(value) => updateHeader('logo_url', value)}
                accept="image/*"
                placeholder="Upload logo image or paste image URL"
              />
              <Field label="Logo Badge Text (fallback if no image)">
                <input
                  value={settings.header?.logo_badge_text || ''}
                  onChange={(event) => updateHeader('logo_badge_text', event.target.value)}
                  className={fieldClass}
                  placeholder="PD"
                />
              </Field>
              <Field label="Brand Name Primary">
                <input
                  value={settings.header?.brand_title_primary || ''}
                  onChange={(event) => updateHeader('brand_title_primary', event.target.value)}
                  className={fieldClass}
                  placeholder="PRANVITH"
                />
              </Field>
              <Field label="Brand Name Accent (Highlighted)">
                <input
                  value={settings.header?.brand_title_accent || ''}
                  onChange={(event) => updateHeader('brand_title_accent', event.target.value)}
                  className={fieldClass}
                  placeholder="DOP"
                />
              </Field>
              <Field label="Header Button Text">
                <input
                  value={settings.header?.cta_text || ''}
                  onChange={(event) => updateHeader('cta_text', event.target.value)}
                  className={fieldClass}
                  placeholder="Buy Bundle"
                />
              </Field>
              <Field label="Header Button Link">
                <input
                  value={settings.header?.cta_link || ''}
                  onChange={(event) => updateHeader('cta_link', event.target.value)}
                  className={fieldClass}
                  placeholder="/assets"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-xl font-semibold text-white">Footer / Global Content</h2>
            <p className="mt-2 text-sm text-slate-500">These fields control the public footer across the website.</p>
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <Field label="Brand title">
                <input value={settings.footer?.brand_title || ''} onChange={(event) => updateFooter('brand_title', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="YouTube link">
                <input value={settings.footer?.youtube_link || ''} onChange={(event) => updateFooter('youtube_link', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Instagram link">
                <input value={settings.footer?.instagram_link || ''} onChange={(event) => updateFooter('instagram_link', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Contact location">
                <input value={settings.footer?.contact_location || ''} onChange={(event) => updateFooter('contact_location', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Contact email">
                <input value={settings.footer?.contact_email || ''} onChange={(event) => updateFooter('contact_email', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Contact phone">
                <input value={settings.footer?.contact_phone || ''} onChange={(event) => updateFooter('contact_phone', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Newsletter heading">
                <input value={settings.footer?.newsletter_heading || ''} onChange={(event) => updateFooter('newsletter_heading', event.target.value)} className={fieldClass} />
              </Field>
              <Field label="Subscribe button text">
                <input value={settings.footer?.subscribe_button_text || ''} onChange={(event) => updateFooter('subscribe_button_text', event.target.value)} className={fieldClass} />
              </Field>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Field label="Footer description">
                <textarea value={settings.footer?.description || ''} onChange={(event) => updateFooter('description', event.target.value)} rows={5} className={`${fieldClass} resize-none`} />
              </Field>
              <Field label="Newsletter description">
                <textarea value={settings.footer?.newsletter_description || ''} onChange={(event) => updateFooter('newsletter_description', event.target.value)} rows={5} className={`${fieldClass} resize-none`} />
              </Field>
            </div>
            <Field label="Explore links">
              <textarea
                value={encodeFooterLinks(settings.footer?.explore_links)}
                onChange={(event) => updateFooter('explore_links', decodeFooterLinks(event.target.value))}
                rows={7}
                className={`${fieldClass} mt-2 resize-none`}
              />
              <p className="mt-2 text-xs text-slate-500">One link per line as Label|/path.</p>
            </Field>
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
