import React, { useEffect, useState } from 'react';
import { Activity, Save } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminRazorpayHealth, fetchAdminSettings, saveAdminSettings } from '../../lib/api';

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

  useEffect(() => {
    fetchAdminSettings()
      .then((data) => {
        setSettings({ ...defaultSettings, ...(data || {}) });
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
      };
      const result = await saveAdminSettings(payload);
      setSettings({ ...defaultSettings, ...(result.settings || payload) });
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
