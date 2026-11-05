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
  Trash2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Pencil,
  Clock,
  CornerDownRight,
  Smartphone,
  Video,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminHybridAutomations,
  createAdminHybridAutomation,
  deleteAdminHybridAutomation,
  duplicateAdminHybridAutomation,
  testAdminHybridAutomation,
  formatApiErrorDetail
} from '../../lib/api';

const DEFAULT_SEED_AUTOMATION = {
  name: 'Sony Camera Settings',
  platforms: ['youtube', 'facebook', 'instagram'],
  videoUrl: '',
  platformUrls: { youtube: '', facebook: '', instagram: '' },
  videoTitle: 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon',
  videoCaption: 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon',
  thumbnailUrl: '/assets/superprofile-sample-thumb.jpg',
  triggerType: 'any_comment',
  keywords: ['SETTINGS', 'LINK', 'PRICE'],
  triggerDelaySeconds: 30,
  replyMessage: '@priya.sharma Thanks! Please see DMs.',
  replyVariations: [
    '@{username} Thanks! Please see DMs.',
    'Camera settings మరియు links ఇక్కడ చూడండి 👇',
    'Hi @{username}! Camera settings and links: https://pranvithdop.com/assets 🎬'
  ],
  requireFollow: true,
  followMessage: "Oops! Looks like you haven't followed me yet 👀\nIt would mean a lot if you could visit my profile and hit that follow button 😊.",
  followButtonLabel: 'Visit Profile',
  followConfirmLabel: "I'm following ✅",
  primaryDmMessage: "Hi! Appreciate the interaction 🙌\nHere's the link as promised ⬇️",
  primaryDmButtonLabel: 'Click me for link',
  resourceMessage: "1. Nikon z50ii\nhttps://link.amazon/B08V0k2KI\n2. Sony zv-e10ii\nhttps://link.amazon/B07ZQ5bfd\n3. Sony a6400\nhttps://link.amazon/B04SfYq6K\n4. Canon Eos r10\nhttps://link.amazon/B03DhzQmC\n5. Canon r50v\nhttps://link.amazon/B06J4al3o",
  resourceUrl: '',
  aiFallback: true,
  enabled: false,
  safeTestingMode: true,
  status: 'draft',
  superprofile_coordinated: false
};

const QUICK_TEST_PRESETS = [
  {
    id: 'test_sony_settings',
    label: '1. Sony Camera Settings',
    comment: 'Sony A7 IV best settings?',
    platform: 'youtube',
    video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  {
    id: 'test_link_request',
    label: '2. Product Link Request',
    comment: 'bro link pampandi plz',
    platform: 'instagram',
    video: 'https://www.instagram.com/reel/DfTekPtNTe5/'
  },
  {
    id: 'test_price_inquiry',
    label: '3. Price Inquiry (Telugu)',
    comment: 'Camera price entha bro?',
    platform: 'youtube',
    video: ''
  },
  {
    id: 'test_nikon_settings',
    label: '4. Nikon Camera Settings',
    comment: 'Z6ii. Setting kavali plz',
    platform: 'youtube',
    video: ''
  },
  {
    id: 'test_compliment',
    label: '5. Compliment / Gratitude',
    comment: 'Super explanation and cinematography, thank you!',
    platform: 'facebook',
    video: ''
  },
  {
    id: 'test_unmatched',
    label: '6. Unmatched Comment (AI)',
    comment: 'Nice location, where was this filmed?',
    platform: 'youtube',
    video: ''
  },
  {
    id: 'test_duplicate',
    label: '7. Duplicate Comment Check',
    comment: 'SETTINGS',
    platform: 'youtube',
    video: '',
    commentId: 'sim_duplicate_comment_001'
  },
  {
    id: 'test_overlapping',
    label: '8. Overlapping Automation Check',
    comment: 'send link',
    platform: 'instagram',
    video: 'https://www.instagram.com/reel/DfTekPtNTe5/'
  }
];

export default function AutomationBuilder() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePlatformFilter, setActivePlatformFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal editor state (SuperProfile style)
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({
    step1: false, // Video
    step2: false, // Trigger & Delay
    step3: false, // Follow Request Gate
    step4: false, // Public Comment Reply
    step5: false, // Primary DM
    step6: false, // Final Resource Message
    step7: false  // AI Fallback
  });

  // Active automation form data
  const [formData, setFormData] = useState({ ...DEFAULT_SEED_AUTOMATION });
  const [keywordInput, setKeywordInput] = useState('');
  const [newVariationInput, setNewVariationInput] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Playground simulation state
  const [playgroundPlatform, setPlaygroundPlatform] = useState('instagram');
  const [playgroundVideoUrl, setPlaygroundVideoUrl] = useState('https://www.instagram.com/reel/DfTekPtNTe5/');
  const [playgroundUsername, setPlaygroundUsername] = useState('priya.sharma');
  const [playgroundComment, setPlaygroundComment] = useState('Interested!');
  const [testingSimulation, setTestingSimulation] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Simulated interactive chat state (SuperProfile mobile preview)
  const [chatFollowed, setChatFollowed] = useState(false);
  const [chatButtonClicked, setChatButtonClicked] = useState(false);

  // Modal in-view interactive preview state
  const [modalDmButtonTapped, setModalDmButtonTapped] = useState(false);

  // Load Automations
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

  // Run initial simulation preview on load
  useEffect(() => {
    handleRunPlaygroundTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name]);

  const toggleStepExpand = (stepKey) => {
    setExpandedSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

  const togglePlatform = (p) => {
    const current = formData.platforms || [];
    const exists = current.includes(p);
    const updated = exists ? current.filter((x) => x !== p) : [...current, p];
    setFormData({ ...formData, platforms: updated });
  };

  const addKeyword = (kw) => {
    const clean = (kw || keywordInput || '').trim().toUpperCase();
    if (!clean) return;
    const current = formData.keywords || [];
    if (!current.includes(clean)) {
      setFormData({ ...formData, keywords: [...current, clean] });
    }
    setKeywordInput('');
  };

  const removeKeyword = (kw) => {
    setFormData({
      ...formData,
      keywords: (formData.keywords || []).filter((k) => k !== kw)
    });
  };

  const addVariation = () => {
    if (!newVariationInput.trim()) return;
    const current = formData.replyVariations || [];
    setFormData({ ...formData, replyVariations: [...current, newVariationInput.trim()] });
    setNewVariationInput('');
  };

  const removeVariation = (idx) => {
    const current = formData.replyVariations || [];
    setFormData({ ...formData, replyVariations: current.filter((_, i) => i !== idx) });
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = 'Automation Name is required.';
    if (!formData.platforms?.length) errs.platforms = 'Select at least one platform.';
    if (formData.triggerType === 'keyword' && !formData.keywords?.length) {
      errs.keywords = 'Add at least one keyword for keyword triggers.';
    }
    if (!formData.replyMessage?.trim() && !formData.replyVariations?.length && !formData.aiFallback) {
      errs.replyMessage = 'Public reply message is required unless AI Fallback is enabled.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

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
        safeTestingMode: true,
        status: 'draft',
        enabled: false // Safety requirement: always draft/disabled in preview
      };

      const res = await createAdminHybridAutomation(payload);
      toast.success(res?.message || 'Automation draft saved successfully.');
      await loadAutomations();
      setShowEditorModal(false);
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || err.message;
      toast.error(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (autoId, autoName) => {
    try {
      const res = await duplicateAdminHybridAutomation(autoId);
      toast.success(`Duplicated '${autoName}' as new draft.`);
      await loadAutomations();
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || err.message;
      toast.error(`Duplicate failed: ${msg}`);
    }
  };

  const handleDelete = async (autoId, autoName) => {
    if (!window.confirm(`Delete draft automation '${autoName}'?`)) return;
    try {
      await deleteAdminHybridAutomation(autoId);
      toast.success(`Automation '${autoName}' deleted.`);
      await loadAutomations();
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || err.message;
      toast.error(`Delete failed: ${msg}`);
    }
  };

  const handleRunPlaygroundTest = async (overrideParams = null) => {
    const pPlatform = overrideParams?.platform || playgroundPlatform;
    const pVideo = overrideParams?.video !== undefined ? overrideParams.video : playgroundVideoUrl;
    const pComment = overrideParams?.comment || playgroundComment;
    const pUsername = overrideParams?.username || playgroundUsername;
    const pCommentId = overrideParams?.commentId || null;

    setTestingSimulation(true);
    setChatFollowed(false);
    setChatButtonClicked(false);

    try {
      const payload = {
        platform: pPlatform,
        video_url: (pVideo || '').trim(),
        comment_text: (pComment || '').trim(),
        author_name: (pUsername || 'priya.sharma').trim(),
        comment_id: pCommentId,
        automation_override: formData
      };

      const res = await testAdminHybridAutomation(payload);
      setTestResult(res?.test_result || null);
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || err.message;
      toast.error(`Simulation failed: ${msg}`);
    } finally {
      setTestingSimulation(false);
    }
  };

  const filteredAutomations = automations.filter((a) => {
    const matchPlatform = activePlatformFilter === 'all' || (a.platforms || []).includes(activePlatformFilter);
    const matchQuery = !searchQuery.trim() || (a.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchPlatform && matchQuery;
  });

  return (
    <div className="space-y-8">
      {/* ============================================================== */}
      {/* TOP HEADER & CONTROLS                                          */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  SuperProfile-Style Visual Flow Builder
                </h2>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Visual Workflow Editor
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Preview Only
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Vertically connected automation flows inspired directly by SuperProfile AutoDM. Step-by-step triggers, follow gate, rotating replies & final resource delivery.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setFormData({ ...DEFAULT_SEED_AUTOMATION });
                setShowEditorModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2"
            >
              <Pencil className="w-3.5 h-3.5" />
              Open Visual Flow Editor
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData({ ...DEFAULT_SEED_AUTOMATION });
                toast.info('Reset editor to initial Sony Camera Settings draft.');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 font-semibold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
              Reset Draft
            </button>
          </div>
        </div>

        {/* Advisory Ribbons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-neutral-300">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">100% Preview Mode</p>
              <p className="text-[11px] text-neutral-400">
                All write actions and auto-publishers are strictly locked. No live DMs or comments are sent.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">SuperProfile Safe Guard</p>
              <p className="text-[11px] text-neutral-400">
                30 existing Instagram automations are preserved. No overlapping triggers without confirmation.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Multilingual AI Fallback</p>
              <p className="text-[11px] text-neutral-400">
                Accurate camera specs (Sony, Nikon, Canon) and Telugu/Tanglish pricing when keywords miss.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* AREA A: AUTOMATION LIBRARY (DRAFTS & WORKFLOWS)               */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Area A — Automation Library
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Saved automation drafts, triggers, video associations, and completion readiness status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drafts..."
              className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
            />

            {/* Platform Filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-950 border border-white/10 text-xs">
              {['all', 'youtube', 'facebook', 'instagram'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivePlatformFilter(tab)}
                  className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                    activePlatformFilter === tab
                      ? 'bg-purple-600 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-purple-400" /> Loading automations...
          </div>
        ) : filteredAutomations.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            No automations found. Click "Open Visual Flow Editor" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAutomations.map((auto) => {
              const isIncomplete = !auto.videoUrl && !auto.resourceUrl && !auto.resourceMessage;
              return (
                <div
                  key={auto.id || auto.name}
                  className="p-5 rounded-2xl border border-white/10 bg-neutral-950/40 hover:border-purple-500/30 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Video Thumbnail + Name */}
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-white/10 overflow-hidden shrink-0 relative">
                        {auto.thumbnailUrl || auto.videoUrl ? (
                          <img
                            src={auto.thumbnailUrl || '/assets/superprofile-sample-thumb.jpg'}
                            alt="Video Thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = '/apple-touch-icon.png';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500">
                            <Video className="w-6 h-6" />
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 px-1 py-0.2 rounded-tl bg-black/70 text-[9px] font-mono text-neutral-300">
                          {auto.triggerDelaySeconds || 30}s
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate" title={auto.name}>
                          {auto.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isIncomplete
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {isIncomplete ? 'Incomplete (Draft)' : 'Ready for Review'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Platforms & Triggers */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5">
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

                      <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {auto.triggerType === 'keyword' ? 'Keyword Trigger' : 'Any Comment'}
                      </span>
                    </div>

                    {/* Keywords Chips */}
                    {auto.triggerType === 'keyword' && (
                      <div className="flex flex-wrap gap-1">
                        {(auto.keywords || []).slice(0, 4).map((kw) => (
                          <span
                            key={kw}
                            className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-neutral-300"
                          >
                            {kw}
                          </span>
                        ))}
                        {(auto.keywords || []).length > 4 && (
                          <span className="text-[10px] text-neutral-500">
                            +{auto.keywords.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Public Reply Snippet */}
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/5 font-sans">
                      {auto.replyMessage || (auto.replyVariations?.[0]) || 'No reply text configured.'}
                    </p>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                    <span className="text-[10px] text-neutral-500">
                      Safe Mode: <strong className="text-neutral-400">Locked</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...auto });
                          setShowEditorModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3 text-purple-400" /> Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(auto.id, auto.name)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        title="Duplicate Draft"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...auto });
                          setPlaygroundPlatform(auto.platforms?.[0] || 'instagram');
                          setPlaygroundVideoUrl(auto.videoUrl || '');
                          handleRunPlaygroundTest({
                            platform: auto.platforms?.[0] || 'instagram',
                            video: auto.videoUrl || ''
                          });
                          window.scrollTo({ top: 900, behavior: 'smooth' });
                          toast.info(`Loaded '${auto.name}' into Conversation Preview below.`);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        title="Preview in Playground"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(auto.id, auto.name)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-red-400 transition-colors"
                        title="Delete Draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* AREA C: CONVERSATION PREVIEW & PLAYGROUND                     */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Area C — SuperProfile-Style Conversation Preview
              </h3>
              <p className="text-xs text-neutral-400">
                Simulated turn-by-turn viewer comment, public reply rotation, follow request gate, DM buttons & final resource delivery.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 self-start lg:self-center">
            <ShieldCheck className="w-3.5 h-3.5" /> Read-Only Simulation
          </span>
        </div>

        {/* 8 Quick Test Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            8 Test Scenarios (One-Click Verification):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_TEST_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPlaygroundPlatform(p.platform);
                  setPlaygroundVideoUrl(p.video);
                  setPlaygroundComment(p.comment);
                  handleRunPlaygroundTest({
                    platform: p.platform,
                    video: p.video,
                    comment: p.comment,
                    commentId: p.commentId
                  });
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left text-xs text-neutral-300 hover:text-white transition-all flex flex-col justify-between"
              >
                <span className="font-semibold text-white truncate">{p.label}</span>
                <span className="text-[11px] text-neutral-400 truncate mt-0.5">"{p.comment}"</span>
              </button>
            ))}
          </div>
        </div>

        {/* Test Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Platform Simulator
            </label>
            <select
              value={playgroundPlatform}
              onChange={(e) => {
                setPlaygroundPlatform(e.target.value);
                handleRunPlaygroundTest({ platform: e.target.value });
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
            >
              <option value="instagram">Instagram (Full Public + Follow + DM)</option>
              <option value="youtube">YouTube (Public Comment Reply Only)</option>
              <option value="facebook">Facebook (Public Page Reply)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Viewer Username
            </label>
            <input
              type="text"
              value={playgroundUsername}
              onChange={(e) => setPlaygroundUsername(e.target.value)}
              placeholder="priya.sharma"
              className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Target Video / Reel URL
            </label>
            <input
              type="text"
              value={playgroundVideoUrl}
              onChange={(e) => setPlaygroundVideoUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/DfTekPtNTe5/"
              className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
        </div>

        {/* Comment input + Run simulation */}
        <div className="flex gap-3">
          <input
            type="text"
            value={playgroundComment}
            onChange={(e) => setPlaygroundComment(e.target.value)}
            placeholder="Type comment in English, Telugu, or Tanglish..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={() => handleRunPlaygroundTest()}
            disabled={testingSimulation}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {testingSimulation ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>

        {/* Realistic Conversation & Diagnostics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Diagnostic Sidebar */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-3.5 text-xs text-neutral-300 h-fit">
            <h4 className="font-bold text-white border-b border-white/10 pb-2 flex items-center justify-between">
              <span>Matching Diagnostics</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">
                {testResult?.action || 'idle'}
              </span>
            </h4>

            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500">Detected Language</span>
              <div className="font-semibold text-white uppercase text-xs">
                {testResult?.detected_language || 'english'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500">Detected Intent</span>
              <div className="font-semibold text-purple-300 text-xs font-mono">
                {testResult?.detected_intent || 'GENERAL'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500">Matched Automation</span>
              <div className="font-semibold text-white">
                {testResult?.matched_automation?.name || 'None (AI Fallback)'}
              </div>
              <div className="text-[10px] text-neutral-500">
                Scope: {testResult?.matched_automation?.match_scope || 'N/A'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500">Matched Keywords</span>
              <div className="flex flex-wrap gap-1">
                {testResult?.matched_keywords?.length ? (
                  testResult.matched_keywords.map((k) => (
                    <span key={k} className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                      {k}
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-500 text-[11px]">No keywords matched</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500">Duplicate Check</span>
              <div className="font-semibold text-emerald-400 flex items-center gap-1 text-[11px]">
                <Check className="w-3.5 h-3.5" />
                {testResult?.duplicate_detection_result || 'NO_DUPLICATE: Fresh comment'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500">AI Fallback Status</span>
              <div className="text-[11px] text-neutral-300">
                {testResult?.ai_fallback_used ? (
                  <span className="text-purple-300 font-semibold">Invoked (Contextual AI)</span>
                ) : (
                  <span className="text-neutral-400">Rule Matched (AI Idle)</span>
                )}
              </div>
              {testResult?.ai_fallback_reason && (
                <p className="text-[10px] text-neutral-500 mt-0.5">{testResult.ai_fallback_reason}</p>
              )}
            </div>

            <div className="pt-2 border-t border-white/5 text-[11px] text-neutral-500">
              SuperProfile: {testResult?.superprofile_status || 'Protected'}
            </div>
          </div>

          {/* Phone / Mobile Conversation Mockup (SuperProfile Inspired) */}
          <div className="lg:col-span-2 rounded-3xl bg-neutral-950 border-2 border-white/10 p-5 space-y-4 shadow-2xl max-w-xl mx-auto w-full">
            {/* Header: Comments on this post */}
            <div className="text-center text-xs font-semibold text-neutral-400 border-b border-white/10 pb-2">
              Comments on this post
            </div>

            {/* Post Card */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10">
              <img
                src={formData.thumbnailUrl || '/assets/superprofile-sample-thumb.jpg'}
                alt="Post Preview"
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                onError={(e) => {
                  e.target.src = '/apple-touch-icon.png';
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">pranvith_dop</span>
                  <span className="text-[10px] text-neutral-500">· 2d</span>
                </div>
                <p className="text-[11px] text-neutral-300 line-clamp-2 mt-0.5 font-sans">
                  {formData.videoCaption || 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon'}
                </p>
              </div>
            </div>

            {/* Viewer Comment */}
            <div className="flex items-start gap-2.5 pt-1 pl-2">
              <div className="w-7 h-7 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center font-bold text-xs shrink-0 border border-white/10">
                {playgroundUsername.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-semibold text-white mr-1.5">
                  {playgroundUsername}
                </span>
                <span className="text-xs text-neutral-200 font-sans">
                  {playgroundComment}
                </span>
              </div>
            </div>

            {/* Public Reply (Rotates 1 of 3) */}
            <div className="ml-8 space-y-1 border-l-2 border-white/10 pl-3 pt-1">
              <div className="text-[10px] text-neutral-500">
                {testResult?.workflow_steps?.step3_public_reply?.rotation_label || 'Replies rotate: 1 of 3'}
              </div>
              <div className="flex items-start gap-2">
                <img
                  src="/apple-touch-icon.png"
                  alt="pranvith_dop"
                  className="w-6 h-6 rounded-full object-cover shrink-0 border border-purple-500/40"
                />
                <div>
                  <span className="text-xs font-semibold text-purple-300 mr-1.5">
                    pranvith_dop
                  </span>
                  <span className="text-xs text-neutral-200 font-sans">
                    {testResult?.public_reply || `@${playgroundUsername} Thanks! Please see DMs.`}
                  </span>
                </div>
              </div>
            </div>

            {/* If Instagram: Instagram DM Container */}
            {playgroundPlatform === 'instagram' ? (
              <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
                <div className="text-center text-[11px] text-neutral-500 font-mono">
                  Message to @{playgroundUsername}
                </div>

                {/* Follow Request Gate */}
                {formData.requireFollow && (
                  <div className="space-y-2">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-neutral-900 border border-white/10 p-3.5 text-xs text-neutral-200 space-y-2 font-sans leading-relaxed">
                      <p className="whitespace-pre-line">
                        {formData.followMessage || "Oops! Looks like you haven't followed me yet 👀\nIt would mean a lot if you could visit my profile and hit that follow button 😊."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 max-w-[85%]">
                      <button
                        type="button"
                        onClick={() => toast.info('Simulated: Navigated to Instagram Profile.')}
                        className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold text-center transition-colors border border-white/10"
                      >
                        {formData.followButtonLabel || 'Visit Profile'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setChatFollowed(true);
                          toast.success("Simulated: Follow confirmed! Advancing to Primary DM.");
                        }}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all border ${
                          chatFollowed
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 shadow-md'
                        }`}
                      >
                        {chatFollowed ? "Following Verified ✅" : (formData.followConfirmLabel || "I'm following ✅")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary DM Bubble */}
                {(!formData.requireFollow || chatFollowed) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-neutral-900 border border-white/10 p-3.5 text-xs text-neutral-200 space-y-2 font-sans leading-relaxed">
                      <p className="whitespace-pre-line">
                        {formData.primaryDmMessage || "Hi! Appreciate the interaction 🙌\nHere's the link as promised ⬇️"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setChatButtonClicked(true);
                        toast.success("Simulated: Button tapped! Delivering final resource DM.");
                      }}
                      className={`w-[85%] py-2.5 px-4 rounded-xl text-xs font-bold text-center transition-all border shadow-lg ${
                        chatButtonClicked
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                      }`}
                    >
                      {formData.primaryDmButtonLabel || 'Click me for link'}
                    </button>
                  </div>
                )}

                {/* Final Resource Message */}
                {chatButtonClicked && (
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-neutral-900 border border-purple-500/30 p-3.5 text-xs text-neutral-200 space-y-2 font-sans leading-relaxed animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                      Delivered Resources
                    </div>
                    <p className="whitespace-pre-line text-neutral-100 font-mono text-[11px]">
                      {formData.resourceMessage || formData.resourceUrl || "1. Nikon z50ii\nhttps://link.amazon/B08V0k2KI\n2. Sony zv-e10ii\nhttps://link.amazon/B07ZQ5bfd\n3. Sony a6400\nhttps://link.amazon/B04SfYq6K\n4. Canon Eos r10\nhttps://link.amazon/B03DhzQmC\n5. Canon r50v\nhttps://link.amazon/B06J4al3o"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-neutral-400 text-center">
                YouTube & Facebook workflows use Public Comment Replies. Instagram-style DM flows are kept exclusive to Instagram.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* AREA B: SUPERPROFILE-STYLE VISUAL WORKFLOW EDITOR MODAL        */}
      {/* (Directly matching the 4 uploaded SuperProfile screenshots)    */}
      {/* ============================================================== */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[94vh]">
            
            {/* Modal Header (Screenshot 3 & 4) */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-neutral-900 sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Edit Automation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6">

              {/* -------------------------------------------------------- */}
              {/* TOP INTERACTIVE PREVIEW CARD (SCREENSHOT 3)              */}
              {/* -------------------------------------------------------- */}
              <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-5 space-y-4 shadow-inner">
                {/* Header label */}
                <div className="text-xs font-semibold text-neutral-400 text-center border-b border-white/5 pb-2">
                  Comments on this post
                </div>

                {/* Post row */}
                <div className="flex items-start gap-3">
                  <img
                    src={formData.thumbnailUrl || '/assets/superprofile-sample-thumb.jpg'}
                    alt="Post Thumbnail"
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                    onError={(e) => {
                      e.target.src = '/apple-touch-icon.png';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-white block">pranvith_dop</span>
                    <p className="text-[11px] text-neutral-300 line-clamp-2 mt-0.5 font-sans">
                      {formData.videoCaption || 'Under 1 lakhs best camera for beginners #photography #sony #nikon #cam...'}
                    </p>
                  </div>
                </div>

                {/* Comment thread preview */}
                <div className="space-y-2 pt-1 pl-1">
                  {/* Priya comment */}
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                      P
                    </div>
                    <div>
                      <span className="font-semibold text-white mr-1.5">priya.sharma</span>
                      <span className="text-neutral-200">Interested!</span>
                    </div>
                  </div>

                  {/* Replies rotate: 1 of 3 */}
                  <div className="ml-8 space-y-1 border-l-2 border-white/10 pl-3">
                    <div className="text-[10px] text-neutral-500">
                      Replies rotate: 1 of {(formData.replyVariations || []).length || 3}
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                        P
                      </div>
                      <div>
                        <span className="font-semibold text-purple-300 mr-1.5">pranvith_dop</span>
                        <span className="text-neutral-200">
                          {formData.replyVariations?.[0] || formData.replyMessage || '@priya.sharma Thanks! Please see DMs.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider line: Message to @priya.sharma */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] text-neutral-400 bg-neutral-950 px-3 font-mono">
                    Message to @priya.sharma
                  </div>
                </div>

                {/* DM mockup */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      P
                    </div>
                    <span className="text-xs font-semibold text-white">pranvith_dop</span>
                  </div>

                  {/* Follow gate bubble */}
                  {formData.requireFollow && (
                    <div className="space-y-2 max-w-[90%]">
                      <div className="p-3.5 rounded-2xl rounded-tl-sm bg-neutral-800/90 border border-white/10 text-xs text-neutral-100 whitespace-pre-line leading-relaxed">
                        {formData.followMessage}
                      </div>
                      <div className="w-full py-2 px-3 rounded-2xl bg-white/10 text-white text-xs font-semibold text-center border border-white/10">
                        {formData.followButtonLabel || 'Visit Profile'}
                      </div>
                    </div>
                  )}

                  {/* Primary DM bubble */}
                  <div className="space-y-2 max-w-[90%] pt-1">
                    <div className="p-3.5 rounded-2xl rounded-tl-sm bg-neutral-800/90 border border-white/10 text-xs text-neutral-100 whitespace-pre-line leading-relaxed">
                      {formData.primaryDmMessage}
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalDmButtonTapped(!modalDmButtonTapped)}
                      className="w-full py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold text-center border border-white/15 transition-colors shadow-sm"
                    >
                      {formData.primaryDmButtonLabel || 'Click me for link'}
                    </button>
                  </div>

                  {/* Delivered Resource (revealed on button tap) */}
                  {modalDmButtonTapped && (
                    <div className="max-w-[90%] p-3.5 rounded-2xl rounded-tl-sm bg-neutral-800/90 border border-purple-500/30 text-xs text-neutral-100 whitespace-pre-line font-mono leading-relaxed animate-in fade-in duration-200">
                      {formData.resourceMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Automation Name & Platforms Quick Config */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Automation Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                      Target Platforms
                    </label>
                    <div className="flex items-center gap-1.5">
                      {['youtube', 'facebook', 'instagram'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePlatform(p)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold capitalize transition-all ${
                            formData.platforms?.includes(p)
                              ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                              : 'bg-neutral-900 text-neutral-400 border-white/10 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* VERTICALLY CONNECTED STEPS (SCREENSHOTS 4, 1, 2)         */}
              {/* -------------------------------------------------------- */}
              <div className="space-y-6 pt-2">
                <div className="text-base font-bold text-white tracking-tight">
                  When someone...
                </div>

                {/* ------------------------------------------------------ */}
                {/* STEP 1: SELECT VIDEO (SCREENSHOT 4)                    */}
                {/* ------------------------------------------------------ */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">
                    comments on this specific post
                  </div>

                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>

                    <div className="flex-1 p-4 rounded-3xl bg-neutral-950 border border-white/10 hover:border-white/20 transition-all space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <img
                            src={formData.thumbnailUrl || '/assets/superprofile-sample-thumb.jpg'}
                            alt="Post Thumbnail"
                            className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-white/10 shadow-md"
                            onError={(e) => {
                              e.target.src = '/apple-touch-icon.png';
                            }}
                          />
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                              CAPTION
                            </span>
                            <p className="text-xs text-white font-sans line-clamp-2 mt-0.5 leading-relaxed">
                              {formData.videoCaption || 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon'}
                            </p>
                          </div>
                        </div>

                        {/* Circular Pencil Button (matching screenshot) */}
                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step1')}
                          className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm"
                          title="Edit Video Selection"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline Edit Panel */}
                      {expandedSteps.step1 && (
                        <div className="pt-3 border-t border-white/10 space-y-3 text-xs animate-in fade-in duration-200">
                          <div>
                            <label className="block text-neutral-400 mb-1">Video Caption / Title</label>
                            <textarea
                              rows={2}
                              value={formData.videoCaption}
                              onChange={(e) => setFormData({ ...formData, videoCaption: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-neutral-400 mb-1">Instagram Post/Reel URL</label>
                              <input
                                type="text"
                                value={formData.videoUrl}
                                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                                placeholder="https://www.instagram.com/reel/DfTekPtNTe5/"
                                className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-neutral-400 mb-1">Thumbnail URL</label>
                              <input
                                type="text"
                                value={formData.thumbnailUrl}
                                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                                placeholder="/assets/superprofile-sample-thumb.jpg"
                                className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------ */}
                {/* STEP 2: COMMENT TRIGGER & DELAY (SCREENSHOT 4)         */}
                {/* ------------------------------------------------------ */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">
                    and comments...
                  </div>

                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>

                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center gap-2">
                        {/* Trigger pill */}
                        <div className="px-4 py-2 rounded-2xl bg-neutral-950 border border-white/15 text-xs font-medium text-white shadow-sm flex items-center gap-2">
                          {formData.triggerType === 'keyword'
                            ? `Specific Keywords: ${(formData.keywords || []).join(', ') || 'SETTINGS, LINK, PRICE'}`
                            : 'Any comment'}
                        </div>

                        {/* Circular Pencil Button */}
                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step2')}
                          className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm"
                          title="Edit Trigger"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Delay caption in italics with clock icon */}
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 italic pl-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        then wait {formData.triggerDelaySeconds || 30} seconds after the trigger
                      </div>

                      {/* Inline Edit Panel */}
                      {expandedSteps.step2 && (
                        <div className="p-4 rounded-3xl bg-neutral-950 border border-white/10 space-y-3 text-xs animate-in fade-in duration-200">
                          <div>
                            <label className="block text-neutral-400 mb-1">Trigger Mode</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, triggerType: 'any_comment' })}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                                  formData.triggerType === 'any_comment'
                                    ? 'bg-purple-600 text-white border-purple-500'
                                    : 'bg-neutral-900 text-neutral-400 border-white/10'
                                }`}
                              >
                                Any comment
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, triggerType: 'keyword' })}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                                  formData.triggerType === 'keyword'
                                    ? 'bg-purple-600 text-white border-purple-500'
                                    : 'bg-neutral-900 text-neutral-400 border-white/10'
                                }`}
                              >
                                Specific Keywords
                              </button>
                            </div>
                          </div>

                          {formData.triggerType === 'keyword' && (
                            <div>
                              <label className="block text-neutral-400 mb-1">Keywords</label>
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
                                  className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => addKeyword()}
                                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
                                >
                                  Add
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {(formData.keywords || []).map((kw) => (
                                  <span
                                    key={kw}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono"
                                  >
                                    {kw}
                                    <button
                                      type="button"
                                      onClick={() => removeKeyword(kw)}
                                      className="hover:text-red-400 ml-0.5"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-neutral-400 mb-1">Delay After Trigger (seconds)</label>
                            <input
                              type="number"
                              min={0}
                              max={300}
                              value={formData.triggerDelaySeconds || 30}
                              onChange={(e) => setFormData({ ...formData, triggerDelaySeconds: parseInt(e.target.value) || 0 })}
                              className="w-32 px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------ */}
                {/* STEP 3: FOLLOW REQUEST GATE (SCREENSHOT 4 & 1)         */}
                {/* (In SuperProfile, this comes right after Step 2!)      */}
                {/* ------------------------------------------------------ */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-300">
                    <span>then ask them to follow you</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-purple-300 text-[11px]">
                      <input
                        type="checkbox"
                        checked={formData.requireFollow}
                        onChange={(e) => setFormData({ ...formData, requireFollow: e.target.checked })}
                        className="rounded border-purple-500/40 text-purple-600 focus:ring-0"
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 max-w-md">
                          {/* Chat bubble */}
                          <div className="p-4 rounded-3xl rounded-tl-sm bg-neutral-950 border border-white/10 text-xs text-neutral-100 font-sans leading-relaxed whitespace-pre-line shadow-sm">
                            {formData.followMessage}
                          </div>

                          {/* Action pill buttons */}
                          <div className="space-y-2">
                            <div className="py-2.5 px-4 rounded-2xl bg-neutral-950 hover:bg-white/5 border border-white/10 text-white text-xs font-semibold text-center transition-colors">
                              {formData.followButtonLabel || 'Visit Profile'}
                            </div>
                            <div className="py-2.5 px-4 rounded-2xl bg-neutral-950 hover:bg-white/5 border border-white/10 text-white text-xs font-semibold text-center transition-colors">
                              {formData.followConfirmLabel || "I'm following ✅"}
                            </div>
                          </div>
                        </div>

                        {/* Circular Pencil Button */}
                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step3')}
                          className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm mt-1"
                          title="Edit Follow Request"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline Edit Panel */}
                      {expandedSteps.step3 && (
                        <div className="p-4 rounded-3xl bg-neutral-950 border border-white/10 space-y-3 text-xs animate-in fade-in duration-200">
                          <div>
                            <label className="block text-neutral-400 mb-1">Follow Message</label>
                            <textarea
                              rows={3}
                              value={formData.followMessage}
                              onChange={(e) => setFormData({ ...formData, followMessage: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-neutral-400 mb-1">Button 1 Label</label>
                              <input
                                type="text"
                                value={formData.followButtonLabel}
                                onChange={(e) => setFormData({ ...formData, followButtonLabel: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-neutral-400 mb-1">Button 2 Label</label>
                              <input
                                type="text"
                                value={formData.followConfirmLabel}
                                onChange={(e) => setFormData({ ...formData, followConfirmLabel: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------ */}
                {/* STEP 4: PUBLIC COMMENT REPLY (SCREENSHOT 1)            */}
                {/* ------------------------------------------------------ */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">
                    leave a reply to their comment on the post · Replies rotate: 1 of {(formData.replyVariations || []).length || 3}
                  </div>

                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 max-w-md">
                          {/* Comment mock */}
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-[10px] font-bold">
                              P
                            </div>
                            <span className="font-semibold text-white">priya.sharma</span>
                            <span className="text-neutral-300">This is a comment</span>
                          </div>

                          {/* Reply mock */}
                          <div className="ml-5 flex items-start gap-2 text-xs">
                            <img
                              src="/apple-touch-icon.png"
                              alt="You"
                              className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5 border border-purple-500/40"
                            />
                            <div>
                              <span className="font-semibold text-purple-300 mr-1.5">You</span>
                              <span className="text-neutral-200">
                                {formData.replyVariations?.[0] || formData.replyMessage || '@priya.sharma Thanks! Please see DMs.'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Circular Pencil Button */}
                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step4')}
                          className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm mt-1"
                          title="Edit Public Reply"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline Edit Panel */}
                      {expandedSteps.step4 && (
                        <div className="p-4 rounded-3xl bg-neutral-950 border border-white/10 space-y-3 text-xs animate-in fade-in duration-200">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-neutral-400">Primary Public Reply</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = formData.replyMessage || '';
                                  setFormData({ ...formData, replyMessage: `${current} @{username}` });
                                }}
                                className="text-[11px] text-purple-400 font-mono"
                              >
                                + Add &#123;username&#125;
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={formData.replyMessage}
                              onChange={(e) => setFormData({ ...formData, replyMessage: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                            />
                          </div>

                          {/* Variations */}
                          <div>
                            <label className="block text-neutral-400 mb-1">
                              Rotating Reply Variations (Anti-Spam)
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={newVariationInput}
                                onChange={(e) => setNewVariationInput(e.target.value)}
                                placeholder="Add another variation (e.g. @{username} Please see DMs!)"
                                className="flex-1 px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                              />
                              <button
                                type="button"
                                onClick={addVariation}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
                              >
                                Add
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {(formData.replyVariations || []).map((v, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-neutral-300"
                                >
                                  <span>{v}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeVariation(i)}
                                    className="text-neutral-500 hover:text-red-400 ml-2"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------ */}
                {/* STEP 5: PRIMARY INSTAGRAM DM (SCREENSHOT 1)            */}
                {/* ------------------------------------------------------ */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">
                    Once they follow, send them the following DM
                  </div>

                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 max-w-md">
                          {/* Chat bubble */}
                          <div className="p-4 rounded-3xl rounded-tl-sm bg-neutral-950 border border-white/10 text-xs text-neutral-100 font-sans leading-relaxed whitespace-pre-line shadow-sm">
                            {formData.primaryDmMessage}
                          </div>

                          {/* Action button */}
                          <div className="py-2.5 px-4 rounded-2xl bg-neutral-950 hover:bg-white/5 border border-white/10 text-white text-xs font-semibold text-center transition-colors">
                            {formData.primaryDmButtonLabel || 'Click me for link'}
                          </div>
                        </div>

                        {/* Circular Pencil Button */}
                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step5')}
                          className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm mt-1"
                          title="Edit Primary DM"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline Edit Panel */}
                      {expandedSteps.step5 && (
                        <div className="p-4 rounded-3xl bg-neutral-950 border border-white/10 space-y-3 text-xs animate-in fade-in duration-200">
                          <div>
                            <label className="block text-neutral-400 mb-1">Primary DM Text</label>
                            <textarea
                              rows={2}
                              value={formData.primaryDmMessage}
                              onChange={(e) => setFormData({ ...formData, primaryDmMessage: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-neutral-400 mb-1">Button Label</label>
                            <input
                              type="text"
                              value={formData.primaryDmButtonLabel}
                              onChange={(e) => setFormData({ ...formData, primaryDmButtonLabel: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------ */}
                {/* STEP 6: FINAL RESOURCE MESSAGE (SCREENSHOT 1 & 2)      */}
                {/* ------------------------------------------------------ */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">
                    On the Primary DM, if they tap on the button '{formData.primaryDmButtonLabel || 'Click me for link'}', we send them the following DM
                  </div>

                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        {/* Chat bubble with affiliate camera links */}
                        <div className="p-4 rounded-3xl rounded-tl-sm bg-neutral-950 border border-white/10 text-xs text-neutral-100 font-mono leading-relaxed whitespace-pre-line flex-1 max-w-md shadow-sm">
                          {formData.resourceMessage}
                        </div>

                        {/* Circular Pencil Button */}
                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step6')}
                          className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm mt-1"
                          title="Edit Resource DM"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline Edit Panel */}
                      {expandedSteps.step6 && (
                        <div className="p-4 rounded-3xl bg-neutral-950 border border-white/10 space-y-3 text-xs animate-in fade-in duration-200">
                          <div>
                            <label className="block text-neutral-400 mb-1">
                              Resource Links / Delivery Message
                            </label>
                            <textarea
                              rows={6}
                              value={formData.resourceMessage}
                              onChange={(e) => setFormData({ ...formData, resourceMessage: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-neutral-400 mb-1">Optional Direct URL</label>
                            <input
                              type="text"
                              value={formData.resourceUrl}
                              onChange={(e) => setFormData({ ...formData, resourceUrl: e.target.value })}
                              placeholder="https://pranvithdop.com/assets"
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------ */}
                {/* STEP 7: AI FALLBACK INTELLIGENCE                       */}
                {/* ------------------------------------------------------ */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">
                    If comment doesn't match: Contextual AI Fallback
                  </div>

                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>

                    <div className="flex-1 p-4 rounded-3xl bg-neutral-950 border border-white/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <div>
                          <p className="text-xs font-bold text-white">Multilingual AI Creator Reply</p>
                          <p className="text-[11px] text-neutral-400">
                            Answers camera settings & Telugu/English pricing if keywords miss
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, aiFallback: !formData.aiFallback })}
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          formData.aiFallback ? 'bg-purple-600' : 'bg-neutral-800'
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                            formData.aiFallback ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* -------------------------------------------------------- */}
              {/* BOTTOM ACTION BUTTON: DISABLE AUTOMATION (SCREENSHOT 1-4)*/}
              {/* -------------------------------------------------------- */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !formData.enabled;
                    setFormData({ ...formData, enabled: nextState });
                    toast.info(
                      nextState
                        ? 'Automation Draft Enabled (Safe Testing Mode: Preview Only).'
                        : 'Automation Disabled (Draft Status).'
                    );
                  }}
                  className="w-full py-3.5 px-6 rounded-full border border-white/20 bg-neutral-950 hover:bg-white/5 text-white text-sm font-semibold text-center transition-all shadow-md"
                >
                  {formData.enabled ? 'Disable Automation' : 'Disable Automation (Currently Inactive)'}
                </button>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 px-2">
                  <span>Safe Testing Mode: <strong className="text-emerald-400">Active</strong></span>
                  <span>Draft only · No live actions executed</span>
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-white/10 bg-neutral-950 flex items-center justify-between gap-3 sticky bottom-0 z-20">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSaveAutomation}
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Draft Automation'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
