import React, { useEffect, useState } from 'react';
import { fetchAdminSettings, saveAdminSettings } from '../../lib/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    site_name: '',
    site_description: '',
    theme: '',
    notifications_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAdminSettings()
      .then((data) => setSettings({
        site_name: data.site_name || '',
        site_description: data.site_description || '',
        theme: data.theme || '',
        notifications_enabled: data.notifications_enabled ?? false,
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await saveAdminSettings(settings);
      setMessage('Settings saved successfully.');
    } catch (error) {
      setMessage('Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-3 text-slate-400">Manage global site configuration and CMS preferences from one place.</p>
      </div>

      <form onSubmit={handleSave} className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <label className="block text-sm text-slate-200">
            <span className="text-slate-400">Site name</span>
            <input
              value={settings.site_name}
              onChange={(e) => setSettings((prev) => ({ ...prev, site_name: e.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="BBEdits"
            />
          </label>
          <label className="block text-sm text-slate-200">
            <span className="text-slate-400">Theme</span>
            <input
              value={settings.theme}
              onChange={(e) => setSettings((prev) => ({ ...prev, theme: e.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="default"
            />
          </label>
        </div>

        <label className="block text-sm text-slate-200">
          <span className="text-slate-400">Site description</span>
          <textarea
            value={settings.site_description}
            onChange={(e) => setSettings((prev) => ({ ...prev, site_description: e.target.value }))}
            className="mt-2 min-h-[140px] w-full rounded-3xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Manage your CMS site description"
          />
        </label>

        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={settings.notifications_enabled}
            onChange={(e) => setSettings((prev) => ({ ...prev, notifications_enabled: e.target.checked }))}
            className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-violet-500"
          />
          Enable site notifications for CMS events
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-400">{message}</div>
          <button
            type="submit"
            disabled={saving || loading}
            className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default Settings;
