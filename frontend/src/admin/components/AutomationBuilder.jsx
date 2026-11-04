import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Youtube,
  Facebook,
  Instagram,
  Check,
  X,
  AlertTriangle,
  Play,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  Sliders,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  Send,
  HelpCircle,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminHybridAutomations,
  createAdminHybridAutomation,
  updateAdminHybridAutomation,
  deleteAdminHybridAutomation,
  testAdminHybridAutomation,
  formatApiErrorDetail
} from '../../lib/api';

const DEFAULT_SEED_AUTOMATION = {
  name: 'Sony Camera Settings',
  platforms: ['youtube', 'facebook', 'instagram'],
  videoUrl: '',
  triggerType: 'keyword',
  keywords: ['SETTINGS', 'LINK', 'PRICE'],
  replyMessage: 'Camera settings మరియు links ఇక్కడ చూడండి 👇',
  resourceUrl: '',
  aiFallback: true,
  enabled: false,
  safeTestingMode: true,
  status: 'draft',
  superprofile_coordinated: false
};

const SAMPLE_PLAYGROUND_QUERIES = [
  {
    label: 'Sony Settings (English)',
    comment: 'Sony A7 IV best settings?',
    platform: 'youtube',
    video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    label: 'Asset Link (Tanglish)',
    comment: 'bro link pampandi plz',
    platform: 'instagram',
    video: 'https://www.instagram.com/reel/DfTekPtNTe5/'
  },
  {
    label: 'Price Inquiry (Telugu)',
    comment: 'Camera price entha bro?',
    platform: 'youtube',
    video: ''
  },
  {
    label: 'Nikon Settings (Teluglish)',
    comment: 'Z6ii. Setting kavali plz',
    platform: 'youtube',
    video: ''
  },
  {
    label: 'Gratitude / Compliment',
    comment: 'Super explanation and cinematography, thank you!',
    platform: 'facebook',
    video: ''
  }
];

export default function AutomationBuilder() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePlatformFilter, setActivePlatformFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({ ...DEFAULT_SEED_AUTOMATION });
  const [keywordInput, setKeywordInput] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Playground state
  const [playgroundPlatform, setPlaygroundPlatform] = useState('youtube');
  const [playgroundVideoUrl, setPlaygroundVideoUrl] = useState('');
  const [playgroundUsername, setPlaygroundUsername] = useState('raj_creator');
  const [playgroundComment, setPlaygroundComment] = useState('Sony A7 IV best settings?');
  const [testingSimulation, setTestingSimulation] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Load automations
  const loadAutomations = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminHybridAutomations();
      setAutomations(data || []);
    } catch (err) {
      console.warn('Failed to load hybrid automations:', err);
      toast.error('Unable to load automations. Using local draft preset.');
      setAutomations([DEFAULT_SEED_AUTOMATION]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  // Handle Platform Toggle in Form
  const togglePlatform = (p) => {
    const current = formData.platforms || [];
    const exists = current.includes(p);
    const updated = exists ? current.filter((x) => x !== p) : [...current, p];
    setFormData({ ...formData, platforms: updated });
  };

  // Handle Keyword Add
  const addKeyword = (kw) => {
    const clean = (kw || keywordInput || '').trim().toUpperCase();
    if (!clean) return;
    const current = formData.keywords || [];
    if (!current.includes(clean)) {
      setFormData({ ...formData, keywords: [...current, clean] });
    }
    setKeywordInput('');
  };

  // Handle Keyword Remove
  const removeKeyword = (kw) => {
    setFormData({
      ...formData,
      keywords: (formData.keywords || []).filter((k) => k !== kw)
    });
  };

  // Validate form client-side before save
  const validateForm = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = 'Automation Name is required.';
    if (!formData.platforms?.length) errs.platforms = 'Select at least one platform.';
    if (formData.triggerType === 'keyword' && !formData.keywords?.length) {
      errs.keywords = 'Add at least one keyword for keyword triggers.';
    }
    if (!formData.replyMessage?.trim() && !formData.aiFallback) {
      errs.replyMessage = 'Reply message is required unless AI Fallback is enabled.';
    }
    if (formData.enabled && formData.videoUrl && !formData.videoUrl.startsWith('http')) {
      errs.videoUrl = 'Video URL must start with http:// or https://';
    }
    if (formData.enabled && formData.resourceUrl && !formData.resourceUrl.startsWith('http')) {
      errs.resourceUrl = 'Resource URL must start with http:// or https://';
    }
    if (formData.enabled && formData.platforms?.includes('instagram') && !formData.superprofile_coordinated) {
      errs.superprofile = 'You must confirm SuperProfile coordination before enabling for Instagram.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save or Create Automation
  const handleSaveAutomation = async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        videoUrl: (formData.videoUrl || '').trim(),
        resourceUrl: (formData.resourceUrl || '').trim(),
        replyMessage: (formData.replyMessage || '').trim(),
        safeTestingMode: true // Strict safety constraint
      };

      const res = await createAdminHybridAutomation(payload);
      toast.success(res?.message || 'Automation saved successfully as Draft.');
      await loadAutomations();
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || err.message;
      toast.error(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Enable/Disable on an existing automation
  const handleToggleEnable = async (auto) => {
    const newEnabled = !auto.enabled;
    if (newEnabled && auto.platforms?.includes('instagram') && !auto.superprofile_coordinated) {
      toast.error('SuperProfile Protection: Cannot enable Instagram automation without coordination confirmation.');
      return;
    }

    try {
      await updateAdminHybridAutomation(auto.id, {
        enabled: newEnabled,
        status: newEnabled ? 'active' : 'draft',
        safeTestingMode: true
      });
      toast.success(`Automation '${auto.name}' ${newEnabled ? 'enabled (Safe Mode)' : 'disabled'}.`);
      await loadAutomations();
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || err.message;
      toast.error(`Update failed: ${msg}`);
    }
  };

  // Delete Automation
  const handleDeleteAutomation = async (autoId, autoName) => {
    if (!window.confirm(`Delete automation '${autoName}'?`)) return;
    try {
      await deleteAdminHybridAutomation(autoId);
      toast.success(`Automation '${autoName}' deleted.`);
      await loadAutomations();
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || err.message;
      toast.error(`Delete failed: ${msg}`);
    }
  };

  // Run Playground Simulation
  const handleRunPlaygroundTest = async () => {
    if (!playgroundComment.trim()) {
      toast.error('Please enter a comment to simulate.');
      return;
    }

    setTestingSimulation(true);
    try {
      const payload = {
        platform: playgroundPlatform,
        video_url: playgroundVideoUrl.trim(),
        comment_text: playgroundComment.trim(),
        author_name: playgroundUsername.trim() || 'creator',
        comment_id: `sim_test_${Date.now()}`,
        automation_override: formData // Test current in-editor draft dynamically!
      };

      const res = await testAdminHybridAutomation(payload);
      setTestResult(res?.test_result || null);
      toast.success('Simulation executed in Preview Mode.');
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || err.message;
      toast.error(`Simulation failed: ${msg}`);
    } finally {
      setTestingSimulation(false);
    }
  };

  const filteredAutomations = automations.filter((a) => {
    if (activePlatformFilter === 'all') return true;
    return (a.platforms || []).includes(activePlatformFilter);
  });

  return (
    <div className="space-y-8">
      {/* ============================================================== */}
      {/* HEADER BANNER                                                  */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">Hybrid Automation Builder</h2>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Phase 4 Hybrid Engine
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Safe Preview Mode ON
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Visual rule configuration, video-mapped triggers, multilingual keyword routing & contextual AI fallback for YouTube, Facebook & Instagram.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setFormData({ ...DEFAULT_SEED_AUTOMATION });
                setFormErrors({});
                toast.info('Loaded initial seed draft automation.');
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 font-semibold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
              Reset to Seed Draft
            </button>
          </div>
        </div>

        {/* Global Safety Guarantees Notice */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-neutral-300">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Safe Testing Mode Active</p>
              <p className="text-[11px] text-neutral-400">All automations default to OFF. Live publishing is locked.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">SuperProfile Protection</p>
              <p className="text-[11px] text-neutral-400">30 existing Instagram automations are guarded and untouched.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Multilingual AI Intelligence</p>
              <p className="text-[11px] text-neutral-400">Telugu, English, and Tanglish camera specs from verified database.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* AUTOMATION BUILDER FORM                                        */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Configure Automation</h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
              {formData.id ? 'Editing Existing' : 'New Automation Draft'}
            </span>
          </div>
          <div className="text-xs text-neutral-400">
            Status: <span className="text-amber-400 font-semibold uppercase">{formData.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Core Fields */}
          <div className="space-y-4">
            {/* Automation Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Automation Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sony Camera Settings"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {formErrors.name && <p className="text-[11px] text-red-400 mt-1">{formErrors.name}</p>}
            </div>

            {/* Platform Selection */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Platforms <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* YouTube */}
                <button
                  type="button"
                  onClick={() => togglePlatform('youtube')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    formData.platforms?.includes('youtube')
                      ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-sm'
                      : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Youtube className="w-4 h-4" /> YouTube
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={() => togglePlatform('facebook')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    formData.platforms?.includes('facebook')
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-sm'
                      : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Facebook className="w-4 h-4" /> Facebook
                </button>

                {/* Instagram */}
                <button
                  type="button"
                  onClick={() => togglePlatform('instagram')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    formData.platforms?.includes('instagram')
                      ? 'bg-pink-500/10 border-pink-500/40 text-pink-400 shadow-sm'
                      : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Instagram className="w-4 h-4" /> Instagram
                </button>
              </div>
              {formErrors.platforms && <p className="text-[11px] text-red-400 mt-1">{formErrors.platforms}</p>}
            </div>

            {/* SuperProfile Advisory for Instagram */}
            {formData.platforms?.includes('instagram') && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  SuperProfile Coordination Required for Instagram
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  You currently have approximately 30 active automations in SuperProfile. If this automation targets a specific Instagram post/reel, verify that SuperProfile does not have an active AutoDM trigger on the same post.
                </p>
                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.superprofile_coordinated}
                    onChange={(e) => setFormData({ ...formData, superprofile_coordinated: e.target.checked })}
                    className="mt-0.5 rounded border-amber-500/40 text-amber-500 focus:ring-0"
                  />
                  <span className="text-[11px] text-white">
                    I confirm overlapping SuperProfile automation has been disabled or coordinated for this Instagram content.
                  </span>
                </label>
                {formErrors.superprofile && (
                  <p className="text-[11px] text-red-400 font-semibold">{formErrors.superprofile}</p>
                )}
              </div>
            )}

            {/* Video / Post URL */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Target Video / Post URL
                </label>
                <span className="text-[11px] text-neutral-500">Optional (Blank = Channel/Page Default)</span>
              </div>
              <input
                type="text"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=... or https://www.instagram.com/reel/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Leave empty to apply as default fallback across all videos/reels.
              </p>
              {formErrors.videoUrl && <p className="text-[11px] text-red-400 mt-1">{formErrors.videoUrl}</p>}
            </div>

            {/* Trigger Type */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Trigger Type <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, triggerType: 'keyword' })}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    formData.triggerType === 'keyword'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  Keyword Trigger
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, triggerType: 'any_comment' })}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    formData.triggerType === 'any_comment'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  Any Comment Trigger
                </button>
              </div>
            </div>

            {/* Keywords Tag Editor */}
            {formData.triggerType === 'keyword' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-300">
                  Trigger Keywords <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                    placeholder="Type keyword and press Enter (e.g. SETTINGS)"
                    className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => addKeyword()}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {/* Keywords Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(formData.keywords || []).map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        className="hover:text-red-400 transition-colors ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Quick Add Suggestions */}
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-neutral-400">
                  <span>Suggestions:</span>
                  {['SETTINGS', 'LINK', 'PRICE', 'LUT', 'ధర', 'సెట్టింగ్స్'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addKeyword(s)}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5"
                    >
                      +{s}
                    </button>
                  ))}
                </div>
                {formErrors.keywords && <p className="text-[11px] text-red-400">{formErrors.keywords}</p>}
              </div>
            )}
          </div>

          {/* Right Column: Reply Template & Actions */}
          <div className="space-y-4">
            {/* Public Reply Message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Public Reply Message <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const current = formData.replyMessage || '';
                    setFormData({ ...formData, replyMessage: `${current} @{username}` });
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono"
                >
                  + Add &#123;username&#125;
                </button>
              </div>
              <textarea
                rows={4}
                value={formData.replyMessage}
                onChange={(e) => setFormData({ ...formData, replyMessage: e.target.value })}
                placeholder="Camera settings మరియు links ఇక్కడ చూడండి 👇"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans leading-relaxed"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Supports Telugu script, Romanized Telugu, English, and emojis.
              </p>
              {formErrors.replyMessage && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.replyMessage}</p>
              )}
            </div>

            {/* Resource / Product URL */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Resource / Product Link
                </label>
                <span className="text-[11px] text-neutral-500">Optional</span>
              </div>
              <input
                type="text"
                value={formData.resourceUrl}
                onChange={(e) => setFormData({ ...formData, resourceUrl: e.target.value })}
                placeholder="https://pranvithdop.com/assets or /assets/creative-lut-pack"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
              {formErrors.resourceUrl && (
                <p className="text-[11px] text-red-400 mt-1">{formErrors.resourceUrl}</p>
              )}
            </div>

            {/* AI Fallback Toggle */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">AI Contextual Fallback</p>
                    <p className="text-[11px] text-neutral-400">
                      Generate intelligent camera response if no keywords match
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, aiFallback: !formData.aiFallback })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    formData.aiFallback ? 'bg-indigo-600' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.aiFallback ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                When enabled, technical camera questions (Sony, Nikon, Canon) and Telugu/Tanglish queries are intelligently answered using the creator knowledge base if no explicit keyword matches. If disabled, no action is taken.
              </p>
            </div>

            {/* Safe Testing Mode Indicator */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Safe Testing Mode: <strong>ENABLED</strong></span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Locked
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveAutomation}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving Draft...' : 'Save Draft Automation'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlaygroundPlatform(formData.platforms?.[0] || 'youtube');
                  setPlaygroundVideoUrl(formData.videoUrl || '');
                  setPlaygroundComment(
                    formData.keywords?.length ? `${formData.keywords[0].toLowerCase()} details kavali` : 'Camera settings'
                  );
                  toast.info('Loaded current draft into Playground below.');
                }}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-indigo-400" />
                Test in Playground
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CONFIGURED AUTOMATIONS LIST & HISTORY                          */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Configured Automations</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Manage your active and draft hybrid automations across YouTube, Facebook, and Instagram
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-white/10 text-xs">
            {['all', 'youtube', 'facebook', 'instagram'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActivePlatformFilter(tab)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                  activePlatformFilter === tab
                    ? 'bg-indigo-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" /> Loading automations...
          </div>
        ) : filteredAutomations.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            No automations found matching this platform filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAutomations.map((auto) => (
              <div
                key={auto.id || auto.name}
                className="p-5 rounded-2xl border border-white/10 bg-neutral-950/40 hover:border-indigo-500/30 transition-all space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {auto.name}
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          auto.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}
                      >
                        {auto.enabled ? 'Enabled (Safe Mode)' : 'Draft'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Scope: {auto.videoUrl ? <code className="text-neutral-300 font-mono text-[10px]">{auto.videoUrl.slice(0, 42)}...</code> : 'Channel / Page Default'}
                    </p>
                  </div>

                  {/* Platforms */}
                  <div className="flex items-center gap-1">
                    {(auto.platforms || []).map((p) => {
                      if (p === 'youtube')
                        return <Youtube key={p} className="w-4 h-4 text-red-400" title="YouTube" />;
                      if (p === 'facebook')
                        return <Facebook key={p} className="w-4 h-4 text-blue-400" title="Facebook" />;
                      if (p === 'instagram')
                        return <Instagram key={p} className="w-4 h-4 text-pink-400" title="Instagram" />;
                      return null;
                    })}
                  </div>
                </div>

                {/* Trigger & Keywords */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-neutral-400">Keywords:</span>
                  {(auto.keywords || []).map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono text-neutral-300"
                    >
                      {kw}
                    </span>
                  ))}
                  {auto.aiFallback && (
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300 flex items-center gap-1 font-semibold">
                      <Sparkles className="w-2.5 h-2.5" /> AI Fallback
                    </span>
                  )}
                </div>

                {/* Reply preview */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-neutral-300 leading-relaxed font-sans line-clamp-2">
                  {auto.replyMessage}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <div className="text-[11px] text-neutral-500">
                    Runs: <strong className="text-neutral-300">{auto.run_count || 0}</strong> (Safe Mode)
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...auto });
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                        toast.info(`Loaded '${auto.name}' into editor.`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs transition-colors"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleEnable(auto)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        auto.enabled
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {auto.enabled ? 'Disable' : 'Enable'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAutomation(auto.id, auto.name)}
                      className="p-1 rounded-lg text-neutral-500 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SAFE TESTING PLAYGROUND (REQUIREMENT 7)                        */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Safe Testing Playground</h3>
              <p className="text-xs text-neutral-400">
                Simulate hybrid reply matching in real-time. Zero live comments, DMs, or external actions.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Read-Only Simulation
          </span>
        </div>

        {/* Quick Sample Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-400">Quick Test Scenarios:</label>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PLAYGROUND_QUERIES.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  setPlaygroundPlatform(q.platform);
                  setPlaygroundVideoUrl(q.video);
                  setPlaygroundComment(q.comment);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Platform Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Simulated Platform
            </label>
            <select
              value={playgroundPlatform}
              onChange={(e) => setPlaygroundPlatform(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram (Public + DM)</option>
            </select>
          </div>

          {/* Viewer Username */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Viewer Username
            </label>
            <input
              type="text"
              value={playgroundUsername}
              onChange={(e) => setPlaygroundUsername(e.target.value)}
              placeholder="raj_creator"
              className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Video / Content URL */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Target Video / Reel URL
            </label>
            <input
              type="text"
              value={playgroundVideoUrl}
              onChange={(e) => setPlaygroundVideoUrl(e.target.value)}
              placeholder="https://... or blank for channel default"
              className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Comment Text Input */}
        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
            Incoming Viewer Comment
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={playgroundComment}
              onChange={(e) => setPlaygroundComment(e.target.value)}
              placeholder="Type a sample comment in Telugu, English, or Tanglish..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleRunPlaygroundTest}
              disabled={testingSimulation}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {testingSimulation ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>
        </div>

        {/* Simulation Output Card */}
        {testResult && (
          <div className="p-5 rounded-2xl border border-indigo-500/30 bg-neutral-950/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Simulation Diagnostics</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {testResult.action}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] text-neutral-400">Language:</span>
                <span className="px-2 py-0.5 rounded bg-white/5 text-white font-semibold uppercase text-[10px]">
                  {testResult.detected_language}
                </span>
                <span className="text-[11px] text-neutral-400 ml-2">Intent:</span>
                <span className="px-2 py-0.5 rounded bg-white/5 text-indigo-300 font-semibold text-[10px]">
                  {testResult.detected_intent}
                </span>
              </div>
            </div>

            {/* Diagnostics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <p className="text-[11px] text-neutral-400">Matched Automation</p>
                <p className="font-semibold text-white">
                  {testResult.matched_automation?.name || 'None (AI Fallback)'}
                </p>
                <p className="text-[10px] text-neutral-500">
                  Scope: {testResult.matched_automation?.match_scope || 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <p className="text-[11px] text-neutral-400">Matched Keywords</p>
                <div className="flex flex-wrap gap-1">
                  {testResult.matched_keywords?.length ? (
                    testResult.matched_keywords.map((k) => (
                      <span key={k} className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
                        {k}
                      </span>
                    ))
                  ) : (
                    <span className="text-neutral-500 text-[11px]">No keywords matched</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <p className="text-[11px] text-neutral-400">AI Fallback</p>
                <p className="font-semibold text-white">
                  {testResult.ai_fallback_used ? 'YES (Invoked)' : 'NO (Rule matched)'}
                </p>
                {testResult.ai_fallback_reason && (
                  <p className="text-[10px] text-neutral-400 line-clamp-1">{testResult.ai_fallback_reason}</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <p className="text-[11px] text-neutral-400">Duplicate Check</p>
                <p className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {testResult.duplicate_detection_result}
                </p>
              </div>
            </div>

            {/* Public Reply Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                Public Comment Reply Preview:
              </label>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-sans leading-relaxed">
                {testResult.public_reply || '(No reply generated)'}
              </div>
            </div>

            {/* Instagram Private DM Preview (Requirement 5) */}
            {testResult.platform === 'instagram' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-pink-400 flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5" />
                  Instagram Private Direct Message (DM) Preview:
                </label>
                <div className="p-3.5 rounded-xl bg-pink-500/[0.05] border border-pink-500/20 text-xs text-pink-100 font-sans leading-relaxed whitespace-pre-line">
                  {testResult.dm_reply || '(No DM configured)'}
                </div>
              </div>
            )}

            {/* Safe Mode Guarantee Footer */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
              <span>SuperProfile Status: {testResult.superprofile_status}</span>
              <span className="text-emerald-400 font-medium">Safe Mode: 0 live calls made</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

