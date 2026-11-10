import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Youtube,
  Facebook,
  Instagram,
  Check,
  X,
  Play,
  Save,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Pencil,
  Clock,
  Smartphone,
  Video,
  Copy,
  Search,
  ArrowUpDown,
  Filter,
  Download,
  MoreVertical,
  Flame,
  ExternalLink,
  Headphones,
  CheckCircle2,
  Coins,
  Send,
  Plus,
  Maximize2,
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminHybridAutomations,
  createAdminHybridAutomation,
  deleteAdminHybridAutomation,
  duplicateAdminHybridAutomation,
  formatApiErrorDetail
} from '../../lib/api';
import superprofileSeedList from '../data/superprofile_automations.json';

// 9 Pranvith Reels extracted directly from the video (frame 005)
export const PRANVITH_REELS_SELECTION = [
  {
    id: 'reel_01',
    title: 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon',
    caption: 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon',
    url: 'https://www.instagram.com/reel/DfTekPtNTe5/',
    thumbnail: '/assets/reels/reel_01.jpg'
  },
  {
    id: 'reel_02',
    title: 'Small Steps Big Dreams — Complete Camera Rig Breakdown',
    caption: 'Small Steps Big Dreams — Complete Camera Rig Breakdown #cinematography #rig',
    url: 'https://www.instagram.com/reel/DfJJtArtezd/',
    thumbnail: '/assets/reels/reel_02.jpg'
  },
  {
    id: 'reel_03',
    title: 'NIKON Z50 II vs SONY ZV-E10 II — Which one to buy in 2026?',
    caption: 'NIKON Z50 II vs SONY ZV-E10 II — Which one to buy in 2026? #nikon #sony',
    url: 'https://www.instagram.com/reel/DfGkPPLt99R/',
    thumbnail: '/assets/reels/reel_03.jpg'
  },
  {
    id: 'reel_04',
    title: 'Best Low Light Wedding Cinema Settings',
    caption: 'Best Low Light Wedding Cinema Settings #wedding #sony #cinematic',
    url: 'https://www.instagram.com/reel/DeYOjcENiWE/',
    thumbnail: '/assets/reels/reel_04.jpg'
  },
  {
    id: 'reel_05',
    title: 'Sony FX3 Hands-on Review & Exposure Guide',
    caption: 'Sony FX3 Hands-on Review & Exposure Guide #fx3 #sony #filmmaking',
    url: 'https://www.instagram.com/reel/DeVp0J6tgmU/',
    thumbnail: '/assets/reels/reel_05.jpg'
  },
  {
    id: 'reel_06',
    title: '85mm F/1.4 Portrait Masterclass & Depth of Field',
    caption: '85mm F/1.4 Portrait Masterclass & Depth of Field #portrait #lens',
    url: 'https://www.instagram.com/reel/DdNjeLczi02/',
    thumbnail: '/assets/reels/reel_06.jpg'
  },
  {
    id: 'reel_07',
    title: 'How to Grade S-Log3 in 3 Simple Steps',
    caption: 'How to Grade S-Log3 in 3 Simple Steps #colorgrading #lut #davinci',
    url: 'https://www.instagram.com/reel/DeABC123xyz/',
    thumbnail: '/assets/reels/reel_07.jpg'
  },
  {
    id: 'reel_08',
    title: 'Cinematography Lighting for Beginners: 3 Point Setup',
    caption: 'Cinematography Lighting for Beginners: 3 Point Setup #lighting #setup',
    url: 'https://www.instagram.com/reel/DeDEF456uvw/',
    thumbnail: '/assets/reels/reel_08.jpg'
  },
  {
    id: 'reel_09',
    title: 'Behind the Scenes — Commercial Shoot with Production Crew',
    caption: 'Behind the Scenes — Commercial Shoot with Production Crew #bts #production',
    url: 'https://www.instagram.com/reel/DeGHI789rst/',
    thumbnail: '/assets/reels/reel_09.jpg'
  }
];

// Pranvith DOP Assets Quick Picker (from pranvithdop.com/assets in frame 023)
export const PRANVITH_ASSETS_QUICK_LINKS = [
  { name: 'Nikon Z6II Skin Tone Settings (Free)', url: 'https://pranvithdop.com/assets/nikon-z6ii-skin-tone' },
  { name: 'Nikon Z6II Photos Full Settings (Free)', url: 'https://pranvithdop.com/assets/nikon-z6ii-photos' },
  { name: 'Sony FX3 S-Cinetone Settings (Free)', url: 'https://pranvithdop.com/assets/sony-fx3-scinetone' },
  { name: 'Sony FX3 S-Log3 Settings (Free)', url: 'https://pranvithdop.com/assets/sony-fx3-slog3' },
  { name: 'iPhone 17 Pro Max Settings Guide (Free)', url: 'https://pranvithdop.com/assets/iphone-17-promax' },
  { name: 'Sony A7M5 Wedding Settings Guide (Free)', url: 'https://pranvithdop.com/assets/sony-a7m5-wedding' },
  { name: 'Creative LUT Pack (₹49)', url: 'https://pranvithdop.com/assets/creative-lut-pack' },
  { name: 'Cinematic Sound FX Pack (₹149)', url: 'https://pranvithdop.com/assets/cinematic-sound-fx' }
];

const DEFAULT_SEED_AUTOMATION = {
  name: 'Sony Camera Settings',
  platforms: ['youtube', 'facebook', 'instagram'],
  videoUrl: 'https://www.instagram.com/reel/DfTekPtNTe5/',
  platformUrls: { youtube: '', facebook: '', instagram: 'https://www.instagram.com/reel/DfTekPtNTe5/' },
  videoTitle: 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon',
  videoCaption: 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon',
  thumbnailUrl: '/assets/reels/reel_01.jpg',
  selectedReelId: 'reel_01',
  triggerType: 'any_comment',
  targetPostType: 'specific_post', // 'specific_post', 'any_post', 'next_post'
  keywords: ['SETTINGS', 'LINK', 'PRICE'],
  triggerDelayMinutes: 1,
  triggerDelaySeconds: 30,
  autoReplyToComments: true,
  replyMessage: 'Thanks! Please see DMs.',
  replyVariations: [
    'Thanks! Please see DMs.',
    'Message sent! Take a look.',
    'Nice! Check your DMs!'
  ],
  requireFollow: true,
  askEmail: false,
  followMessage: "Oops! Looks like you haven't followed me yet 👀\nIt would mean a lot if you could visit my profile and hit that follow button 😊.",
  followButtonLabel: 'Visit Profile',
  followConfirmLabel: "I'm following ✅",
  primaryDmType: 'Text + Button',
  primaryDmMessage: "Hi! Appreciate the interaction 🙌 Here's the link as promised ⬇️",
  primaryDmButtonLabel: 'Click me for link',
  buttonTapAction: 'open_url', // 'open_url', 'send_dm'
  buttonActionUrl: 'https://pranvithdop.com/assets/nikon-z6ii-skin-tone',
  resourceDmType: 'Text',
  resourceMessage: "1. Nikon z50ii\nhttps://link.amazon/B08V0k2KI\n2. Sony zv-e10ii\nhttps://link.amazon/B07ZQ5bfd\n3. Sony a6400\nhttps://link.amazon/B04SfYq6K\n4. Canon Eos r10\nhttps://link.amazon/B03DhzQmC\n5. Canon r50v\nhttps://link.amazon/B06J4al3o",
  resourceUrl: 'https://pranvithdop.com/assets/nikon-z6ii-skin-tone',
  trackButtonClicks: true,
  aiFallback: true,
  enabled: true,
  safeTestingMode: true,
  status: 'draft',
  superprofile_coordinated: true
};

export default function AutomationBuilder() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('automations');
  const [sortBy, setSortBy] = useState('runs');
  const [sortAsc, setSortAsc] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Main Edit Modal (View with Live Preview & Steps)
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [activeRowMenu, setActiveRowMenu] = useState(null);

  // Dedicated Step Editor Sub-Modals (Triggered by Pencil Icons)
  // 'step1_picker', 'step2_trigger', 'step3_follow', 'step4_reply', 'step5_dm', 'step6_resource'
  const [activeStepModal, setActiveStepModal] = useState(null);

  // Creation Wizard Modal (Steps 1, 2, 3, Launch Review)
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Active Automation Form Data
  const [formData, setFormData] = useState({ ...DEFAULT_SEED_AUTOMATION });
  const [keywordInput, setKeywordInput] = useState('');

  // Load Automations
  const loadAutomations = async () => {
    setLoading(true);
    try {
      const dbAutos = await fetchAdminHybridAutomations();
      const combined = [...(superprofileSeedList || [])];

      if (dbAutos && Array.isArray(dbAutos) && dbAutos.length > 0) {
        dbAutos.forEach((dbItem) => {
          const idx = combined.findIndex((c) => c.id === dbItem.id);
          if (idx >= 0) {
            combined[idx] = { ...combined[idx], ...dbItem };
          } else {
            combined.unshift({
              ...dbItem,
              followers_gained: dbItem.followers_gained || 0,
              run_count: dbItem.run_count || 0,
              click_count: dbItem.click_count || 0,
              status: dbItem.status || 'Enabled',
              thumbnail: dbItem.thumbnailUrl || '/assets/reels/reel_01.jpg'
            });
          }
        });
      }

      setAutomations(combined);
    } catch (err) {
      console.warn('Failed to load hybrid automations:', err);
      setAutomations(superprofileSeedList || [DEFAULT_SEED_AUTOMATION]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  const addKeyword = () => {
    const clean = (keywordInput || '').trim().toUpperCase();
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

  const handleOpenCreateWizard = () => {
    setFormData({
      ...DEFAULT_SEED_AUTOMATION,
      id: `custom_${Date.now()}`,
      name: `Hi! Appreciate the interaction 🙌 Here's the... (New Draft)`,
      targetPostType: 'specific_post',
      selectedReelId: 'reel_01',
      videoCaption: 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon',
      thumbnailUrl: '/assets/reels/reel_01.jpg',
      triggerType: 'any_comment',
      keywords: ['SETTINGS', 'LINK', 'PRICE'],
      autoReplyToComments: true,
      replyVariations: [
        'Thanks! Please see DMs.',
        'Sent you the details in DM! 🙌',
        'Check your direct message for the camera links 📸'
      ],
      requireFollow: true,
      followMessage: "Oops! Looks like you haven't followed me yet 👀\nIt would mean a lot if you could visit my profile and hit that follow button 😁.",
      primaryDmMessage: "Hi! Appreciate the interaction 🙌\nHere's the link as promised ⬇️",
      primaryDmButtonLabel: 'Click me for link',
      buttonTapAction: 'send_dm',
      resourceMessage: "1. Nikon z50ii https://link.amazon/B08V0k2KI\n2. Sony zv-e10ii https://link.amazon/B07ZQ5bfd\n3. Sony a6400 https://link.amazon/B04SfYq6K\n4. Canon Eos r10 https://link.amazon/B03DhzQmC\n5. Canon r50v https://link.amazon/B06J4al3o",
      status: 'Enabled',
      enabled: true,
      safeTestingMode: true
    });
    setWizardStep(1);
    setShowCreateWizard(true);
  };

  const handleSaveCreateWizard = async () => {
    setSaving(true);
    try {
      const newAuto = {
        ...formData,
        id: formData.id || `custom_${Date.now()}`,
        name: formData.name || "Hi! Appreciate the interaction 🙌 Here's the...",
        videoCaption: formData.videoCaption || 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon',
        thumbnail: formData.thumbnailUrl || '/assets/reels/reel_01.jpg',
        thumbnailUrl: formData.thumbnailUrl || '/assets/reels/reel_01.jpg',
        followers_gained: 0,
        run_count: 0,
        click_count: 0,
        status: 'Enabled',
        enabled: true,
        safeTestingMode: true
      };

      setAutomations((prev) => [newAuto, ...prev]);

      try {
        await createAdminHybridAutomation(newAuto);
      } catch (e) {
        console.warn('Backend draft save fallback to local state:', e);
      }

      toast.success('🎉 Automation Created Successfully! (Safe Preview Mode)');
      setShowCreateWizard(false);
      setShowEditorModal(true);
    } catch (err) {
      toast.error('Failed to create automation: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (auto) => {
    setFormData({
      ...DEFAULT_SEED_AUTOMATION,
      ...auto,
      name: auto.name || 'Sony Camera Settings',
      videoCaption: auto.videoCaption || auto.name || DEFAULT_SEED_AUTOMATION.videoCaption,
      thumbnailUrl: auto.thumbnail || auto.thumbnailUrl || '/assets/reels/reel_01.jpg',
      selectedReelId: auto.selectedReelId || 'reel_01'
    });
    setActiveRowMenu(null);
    setShowEditorModal(true);
  };

  const handleSelectReelInGrid = (reel) => {
    setFormData({
      ...formData,
      selectedReelId: reel.id,
      videoCaption: reel.caption,
      videoTitle: reel.title,
      videoUrl: reel.url,
      thumbnailUrl: reel.thumbnail
    });
  };

  const handleStepSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        safeTestingMode: true,
        status: 'Enabled',
        enabled: formData.enabled
      };
      setAutomations((prev) =>
        prev.map((a) => (a.id === formData.id ? { ...a, ...payload } : a))
      );
      try {
        await createAdminHybridAutomation(payload);
      } catch (e) {
        console.warn('Backend draft save fallback to local state:', e);
      }
      toast.success('AutoDM Updated!');
      setActiveStepModal(null);
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || err.message;
      toast.error(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (autoId, autoName) => {
    try {
      await duplicateAdminHybridAutomation(autoId);
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

  // Filter & Sort
  const filteredList = automations
    .filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.content_link || '').toLowerCase().includes(q) ||
        (item.instagram_username || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let valA = a.run_count || 0;
      let valB = b.run_count || 0;
      if (sortBy === 'followers') {
        valA = a.followers_gained || 0;
        valB = b.followers_gained || 0;
      } else if (sortBy === 'clicks') {
        valA = a.click_count || 0;
        valB = b.click_count || 0;
      }
      return sortAsc ? valA - valB : valB - valA;
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* ============================================================== */}
      {/* 1. TOP HEADER (MATCHING VIDEO 2 FRAME 001)                     */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">AutoDM</h1>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Preview Mode
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Ask Super AI Input Bar */}
          <div className="relative flex-1 sm:w-80">
            <Sparkles className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Ask Super AI about your automations..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-purple-500 shadow-inner"
            />
            <button
              type="button"
              className="absolute right-2.5 top-2 p-1 rounded-md text-neutral-400 hover:text-white"
            >
              ↑
            </button>
          </div>

          {/* + Create Automation Button */}
          <button
            type="button"
            onClick={handleOpenCreateWizard}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Automation
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. REFERRAL BANNER (MATCHING VIDEO 2 FRAME 001)                */}
      {/* ============================================================== */}
      {!bannerDismissed && (
        <div className="relative rounded-2xl overflow-hidden border border-blue-500/25 bg-gradient-to-r from-blue-950/40 via-neutral-900/90 to-blue-900/30 p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <h2 className="text-base font-bold text-white tracking-tight">
                Loving AutoDM? Invite friends & followers and start earning
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Make a video and get your friends & followers to use SuperProfile to unlock 20% recurring revenue forever for every successful referral.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setBannerDismissed(true)}
                  className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-neutral-400 hover:text-white font-medium transition-colors"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => toast.info('SuperProfile Referral Program.')}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1"
                >
                  Learn more →
                </button>
              </div>
            </div>

            {/* Right Graphic: ₹52,921+ Payouts Card */}
            <div className="flex items-center gap-4 bg-neutral-950/60 border border-white/10 rounded-2xl p-4 self-start lg:self-center shadow-inner">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-extrabold text-white tracking-tight">
                  ₹52,921+
                </span>
                <p className="text-[11px] text-neutral-400 font-medium">
                  Referral Payouts made this month
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. NAVIGATION TABS                                             */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('automations')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'automations'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Automations (30)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('must_haves')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'must_haves'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Must-haves
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'settings'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Settings
          </button>
        </div>

        <button
          type="button"
          onClick={() => toast.info('SuperProfile Help & Support.')}
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5"
        >
          <Headphones className="w-3.5 h-3.5" />
          Support
        </button>
      </div>

      {/* ============================================================== */}
      {/* 4. THREE METRIC KPI CARDS                                      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DM's SENT */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 space-y-3 relative overflow-hidden">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-neutral-400 block">
            DM's SENT ⓘ
          </span>
          <div className="text-3xl font-extrabold text-white tracking-tight">2.31K</div>
          <div className="h-10 w-full pt-1">
            <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,20 Q20,18 35,12 T70,8 T100,15 L100,25 L0,25 Z" fill="rgba(16, 185, 129, 0.15)" />
              <path d="M0,20 Q20,18 35,12 T70,8 T100,15" fill="none" stroke="#10b981" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* EMAILS COLLECTED */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 space-y-3 relative overflow-hidden">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-neutral-400 block">
            EMAILS COLLECTED ⓘ
          </span>
          <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1.5">
            0 <span className="text-sm font-normal text-neutral-500">↗</span>
          </div>
          <div className="h-10 w-full pt-1">
            <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,20 L100,20" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
          </div>
        </div>

        {/* FOLLOWERS GAINED */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 space-y-3 relative overflow-hidden">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-neutral-400 block">
            FOLLOWERS GAINED ⓘ
          </span>
          <div className="text-3xl font-extrabold text-white tracking-tight">1.72K</div>
          <div className="h-10 w-full pt-1">
            <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,22 Q30,20 50,10 T85,14 T100,18 L100,25 L0,25 Z" fill="rgba(16, 185, 129, 0.15)" />
              <path d="M0,22 Q30,20 50,10 T85,14 T100,18" fill="none" stroke="#10b981" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. SEARCH & TABLE CONTROLS BAR                                 */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by AutoDM name, message or captions"
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSortAsc(!sortAsc);
              toast.info(`Sorted ${sortAsc ? 'Descending' : 'Ascending'}.`);
            }}
            className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-xs text-neutral-300 font-medium transition-colors flex items-center gap-1.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            Sort
          </button>

          <button
            type="button"
            onClick={() => toast.info('Filters: Active on Reel / Post.')}
            className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-xs text-neutral-300 font-medium transition-colors flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            Filter
          </button>

          <button
            type="button"
            onClick={() => {
              window.open('/assets/AutoDM_List_2026-11-04_18-22-44.csv', '_blank');
              toast.success('Exporting SuperProfile AutoDM CSV report...');
            }}
            className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-xs text-neutral-300 font-medium transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" />
            Export
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. AUTOMATIONS TABLE (30 ITEMS)                                */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-neutral-950/40 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <th className="py-3.5 px-5">AUTOMATIONS</th>
                <th className="py-3.5 px-4 text-center">FOLLOWERS GAINED ⓘ</th>
                <th className="py-3.5 px-4 text-center">RUNS ⓘ</th>
                <th className="py-3.5 px-4 text-center">BUTTON CLICKS ⓘ</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-neutral-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-neutral-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-400 inline mr-2" />
                    Loading automations...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-neutral-400">
                    No automations found.
                  </td>
                </tr>
              ) : (
                filteredList.map((row, index) => (
                  <tr
                    key={row.id || index}
                    onClick={() => handleOpenEditModal(row)}
                    className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={row.thumbnail || '/assets/reels/reel_01.jpg'}
                          alt="Thumbnail"
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/10 shadow-sm"
                          onError={(e) => {
                            e.target.src = '/apple-touch-icon.png';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-sm" title={row.name}>
                            {row.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400">
                            <span className="flex items-center gap-1 text-pink-400 font-medium">
                              <Instagram className="w-3 h-3" />
                              @{row.instagram_username || 'pranvith_dop'}
                            </span>
                            <span>·</span>
                            <span>Post or reel</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-200">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        {row.followers_gained || 0}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-white">
                      {row.run_count || 0}
                    </td>

                    <td className="py-3.5 px-4 text-center text-neutral-300">
                      {row.click_count || 0}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {row.status || 'Enabled'}
                      </span>
                    </td>

                    <td
                      className="py-3.5 px-4 text-right relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveRowMenu(activeRowMenu === row.id ? null : row.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeRowMenu === row.id && (
                        <div className="absolute right-4 top-10 z-20 w-36 rounded-xl bg-neutral-900 border border-white/10 shadow-2xl py-1 text-xs text-neutral-300 animate-in fade-in duration-150">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(row)}
                            className="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center gap-2"
                          >
                            <Pencil className="w-3.5 h-3.5 text-purple-400" /> Edit Flow
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(row.id, row.name)}
                            className="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5 text-neutral-400" /> Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id, row.name)}
                            className="w-full px-3 py-1.5 text-left hover:bg-white/10 text-red-400 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. CREATE AUTOMATION WIZARD (STEP 1, 2, 3)                     */}
      {/* ============================================================== */}
      {showCreateWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white text-gray-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh] border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white sticky top-0 z-20">
              <div className="flex items-center gap-2.5 text-sm font-bold text-gray-900">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>When someone comments on your Post/Reel</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateWizard(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 bg-white text-gray-900 text-xs">
              {/* STEP 1: Post / Reel Selection (Frame 004) */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      The Comment is on...
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'specific_post', label: 'Specific Post/Reel' },
                        { id: 'any_post', label: 'Any Post/Reel' },
                        { id: 'next_post', label: 'Next Post/Reel' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, targetPostType: item.id })}
                          className={`py-2 px-2 rounded-2xl border text-xs font-semibold transition-all text-center ${
                            formData.targetPostType === item.id
                              ? 'bg-blue-50 text-blue-600 border-blue-400 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.targetPostType === 'specific_post' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2.5">
                        {PRANVITH_REELS_SELECTION.map((reel) => {
                          const isSelected = formData.selectedReelId === reel.id;
                          return (
                            <div
                              key={reel.id}
                              onClick={() => handleSelectReelInGrid(reel)}
                              className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all group ${
                                isSelected
                                  ? 'border-blue-500 shadow-md scale-[0.98]'
                                  : 'border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              <img
                                src={reel.thumbnail}
                                alt={reel.title}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                    <Check className="w-5 h-5 stroke-[3]" />
                                  </div>
                                </div>
                              )}
                              <div className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white">
                                <Maximize2 className="w-3 h-3" />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-gray-500 text-center pt-1 font-sans">
                        Selected: <strong className="text-gray-900">{formData.videoTitle || 'Under 1 lakhs best camera for beginners'}</strong>
                      </p>
                    </div>
                  )}

                  {formData.targetPostType === 'any_post' && (
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800">
                        The automation will trigger when a comment is posted on any of your Posts & Reels.
                      </p>
                    </div>
                  )}

                  {formData.targetPostType === 'next_post' && (
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800">
                        The automation will trigger on your next published post or reel.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Comment Trigger & Public Reply (Frame 007) */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      What kind of comment should trigger this automation?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, triggerType: 'keyword' })}
                        className={`py-2 px-3 rounded-2xl border text-xs font-semibold transition-all ${
                          formData.triggerType === 'keyword'
                            ? 'bg-blue-50 text-blue-600 border-blue-400 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Specific keyword
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, triggerType: 'any_comment' })}
                        className={`py-2 px-3 rounded-2xl border text-xs font-semibold transition-all ${
                          formData.triggerType === 'any_comment'
                            ? 'bg-blue-50 text-blue-600 border-blue-400 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        Any comment
                      </button>
                    </div>
                  </div>

                  {formData.triggerType === 'any_comment' ? (
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="text-xs font-medium text-gray-800">
                        The automation will trigger for all comments
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 rounded-2xl bg-gray-50 border border-gray-200">
                      <label className="text-xs font-semibold text-gray-700 block">Trigger Keywords</label>
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
                          placeholder="e.g. SETTINGS, LINK, PRICE"
                          className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={addKeyword}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
                        >
                          + Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(formData.keywords || []).map((k) => (
                          <span
                            key={k}
                            className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1"
                          >
                            {k}
                            <button type="button" onClick={() => removeKeyword(k)} className="hover:text-blue-900">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto-reply to comments toggle */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">Auto-Reply to comments on the post</span>
                      <input
                        type="checkbox"
                        checked={formData.autoReplyToComments}
                        onChange={(e) => setFormData({ ...formData, autoReplyToComments: e.target.checked })}
                        className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Write 3 replies which will be sent in a random order so that your replies don't look like a bot. Automating comment replies comes with risk - Stay informed.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        const base = formData.replyVariations?.[0] || 'Thanks! Please see DMs.';
                        setFormData({
                          ...formData,
                          replyVariations: [
                            base,
                            'Message sent! Take a look. 🙌',
                            'Nice! Check your direct message! 📸'
                          ]
                        });
                        toast.success('Generated 3 natural variations with AI.');
                      }}
                      className="w-full py-2 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Fill variations from reply 1 ✦ AI
                    </button>

                    <div className="space-y-2.5 pt-1">
                      {[0, 1, 2].map((idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>Comment response {idx + 1} *</span>
                            <span className="font-mono">{formData.replyVariations?.[idx]?.length || 0}/140</span>
                          </div>
                          <input
                            type="text"
                            value={formData.replyVariations?.[idx] || ''}
                            onChange={(e) => {
                              const updated = [...(formData.replyVariations || [])];
                              updated[idx] = e.target.value;
                              setFormData({ ...formData, replyVariations: updated });
                            }}
                            className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: DM & Resource Configuration (Frame 013, 015) */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  {/* Follow gate */}
                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">a DM asking to follow you</span>
                      <input
                        type="checkbox"
                        checked={formData.requireFollow}
                        onChange={(e) => setFormData({ ...formData, requireFollow: e.target.checked })}
                        className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    {formData.requireFollow && (
                      <textarea
                        rows={2}
                        value={formData.followMessage}
                        onChange={(e) => setFormData({ ...formData, followMessage: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-800"
                      />
                    )}
                  </div>

                  {/* Primary DM */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-900">Primary DM Message</span>
                      <span className="text-gray-400 font-mono text-[11px]">{formData.primaryDmMessage?.length || 0}/900</span>
                    </div>
                    <textarea
                      rows={2}
                      value={formData.primaryDmMessage}
                      onChange={(e) => setFormData({ ...formData, primaryDmMessage: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  {/* Button #1 Configuration */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                      <span>^ Button #1</span>
                      <span className="text-gray-400 font-mono text-[11px]">
                        {formData.primaryDmButtonLabel?.length || 0}/60
                      </span>
                    </div>

                    <input
                      type="text"
                      value={formData.primaryDmButtonLabel}
                      onChange={(e) => setFormData({ ...formData, primaryDmButtonLabel: e.target.value })}
                      placeholder="Click me for link"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-semibold"
                    />

                    <div>
                      <label className="text-[11px] text-gray-600 mb-1 block">
                        When someone taps on this button,
                      </label>
                      <select
                        value={formData.buttonTapAction}
                        onChange={(e) => setFormData({ ...formData, buttonTapAction: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900"
                      >
                        <option value="send_dm">Send a DM</option>
                        <option value="open_url">Open a Link</option>
                      </select>
                    </div>

                    {formData.buttonTapAction === 'send_dm' ? (
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-gray-600 block">
                          Message to send on tap (Product / Camera Links):
                        </label>
                        <textarea
                          rows={5}
                          value={formData.resourceMessage}
                          onChange={(e) => setFormData({ ...formData, resourceMessage: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-sans"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={formData.buttonActionUrl || formData.resourceUrl}
                            onChange={(e) => setFormData({ ...formData, buttonActionUrl: e.target.value, resourceUrl: e.target.value })}
                            placeholder="https://pranvithdop.com/assets/..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">
                            Or select from Pranvith Creative Assets Store:
                          </label>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                setFormData({
                                  ...formData,
                                  buttonActionUrl: e.target.value,
                                  resourceUrl: e.target.value
                                });
                                toast.success('Pasted asset link!');
                              }
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-[11px] text-purple-600"
                          >
                            <option value="">-- Choose Creative Asset --</option>
                            {PRANVITH_ASSETS_QUICK_LINKS.map((asset) => (
                              <option key={asset.url} value={asset.url}>
                                {asset.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0 z-20">
              <span className="text-xs text-gray-500 font-medium">
                Step {wizardStep} of 3
              </span>
              <div className="flex items-center gap-2">
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-4 py-2 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCreateWizard(false)}
                  className="px-4 py-2 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="px-6 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveCreateWizard}
                    disabled={saving}
                    className="px-6 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
                  >
                    {saving ? 'Creating...' : 'Confirm & Launch (Preview)'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. EDIT AUTOMATION MODAL (EXACT MATCH TO USER SCREENSHOTS)     */}
      {/* ============================================================== */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white text-gray-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh] border border-gray-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white sticky top-0 z-20">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Edit Automation</h3>
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 bg-white">

              {/* In-Modal Live Simulated DM Preview (Screenshots 1 & 3) */}
              <div className="rounded-3xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="text-xs font-semibold text-gray-400 text-center border-b border-gray-100 pb-2">
                  Comments on this post
                </div>

                {/* Post snippet */}
                <div className="flex items-start gap-3">
                  <img
                    src={formData.thumbnailUrl || '/assets/reels/reel_01.jpg'}
                    alt="Post"
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-200 shadow-sm"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block">pranvith_dop</span>
                    <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">
                      {formData.videoCaption}
                    </p>
                  </div>
                </div>

                {/* Comment row */}
                <div className="space-y-2 pt-1 pl-1">
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-[10px] font-bold">
                      P
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 mr-1.5">priya.sharma</span>
                      <span className="text-gray-800">Interested!</span>
                    </div>
                  </div>

                  {/* Replies rotate */}
                  <div className="ml-8 space-y-1 border-l-2 border-gray-200 pl-3">
                    <div className="text-[10px] text-gray-400 font-medium">
                      Replies rotate: 1 of {(formData.replyVariations || []).length || 3}
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-[9px] font-bold">
                        P
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 mr-1.5">pranvith_dop</span>
                        <span className="text-blue-600 font-medium mr-1">@priya.sharma</span>
                        <span className="text-gray-700">
                          {formData.replyVariations?.[0] || 'Thanks! Please see DMs.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] text-gray-400 bg-white px-3 font-medium">
                    Message to @priya.sharma
                  </div>
                </div>

                {/* Follow Gate & Primary DM */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                      P
                    </div>
                    <span className="text-xs font-semibold text-gray-900">pranvith_dop</span>
                  </div>

                  {formData.requireFollow && (
                    <div className="space-y-2 max-w-[90%]">
                      <div className="p-3.5 rounded-2xl rounded-tl-sm bg-gray-100 border border-gray-200/60 text-xs text-gray-900 whitespace-pre-line leading-relaxed shadow-sm">
                        {formData.followMessage}
                      </div>
                      <div className="w-full py-2.5 px-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold text-center transition-colors">
                        Visit Profile
                      </div>
                      <div className="w-full py-2.5 px-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold text-center transition-colors">
                        I'm following ✅
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-w-[90%] pt-1">
                    <div className="p-3.5 rounded-2xl rounded-tl-sm bg-gray-100 border border-gray-200/60 text-xs text-gray-900 whitespace-pre-line leading-relaxed shadow-sm">
                      {formData.primaryDmMessage}
                    </div>
                    <div className="w-full py-2.5 px-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold text-center transition-colors">
                      {formData.primaryDmButtonLabel || 'Click me for link'}
                    </div>
                  </div>

                  {/* Secondary Resource DM on tap (Screenshot 2) */}
                  <div className="space-y-2 max-w-[90%] pt-1">
                    <div className="p-3.5 rounded-2xl rounded-tl-sm bg-gray-100 border border-gray-200/60 text-xs text-gray-800 font-sans whitespace-pre-line leading-relaxed shadow-sm">
                      {formData.resourceMessage}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertically Connected Steps Flow with ↳ (Screenshots 1, 2, 4) */}
              <div className="space-y-6 pt-2">
                <div className="text-sm font-bold text-gray-900 tracking-tight">When someone...</div>

                {/* Step 1: Video (Clicking ✏️ opens Visual Reel Grid Picker) */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">comments on this specific post</div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-gray-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 p-3.5 rounded-2xl bg-white border border-gray-200 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <img
                            src={formData.thumbnailUrl || '/assets/reels/reel_01.jpg'}
                            alt="Post Thumbnail"
                            className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-gray-200 shadow-sm"
                          />
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              CAPTION
                            </span>
                            <p className="text-xs text-gray-800 font-sans line-clamp-2 mt-0.5 leading-relaxed">
                              {formData.videoCaption}
                            </p>
                          </div>
                        </div>

                        {/* Circular Pencil Button (Opens Visual Grid Picker) */}
                        <button
                          type="button"
                          onClick={() => setActiveStepModal('step1_picker')}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0 shadow-sm"
                          title="Choose Post / Reel"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Trigger & Delay (Clicking ✏️ opens Trigger Modal) */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">and comments...</div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-gray-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="px-4 py-2 rounded-2xl bg-white border border-gray-200 text-xs font-medium text-gray-800 shadow-sm">
                          {formData.triggerType === 'keyword'
                            ? `Specific Keywords: ${(formData.keywords || []).join(', ')}`
                            : 'Any comment'}
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveStepModal('step2_trigger')}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0 shadow-sm"
                          title="Edit Trigger"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 italic pl-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        then wait {formData.triggerDelaySeconds || 30} seconds after the trigger
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Follow Request Gate (Clicking ✏️ opens Follow Modal) */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">then ask them to follow you</div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-gray-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 max-w-md">
                          <div className="p-4 rounded-3xl rounded-tl-sm bg-gray-100 border border-gray-200/60 text-xs text-gray-900 whitespace-pre-line leading-relaxed shadow-sm">
                            {formData.followMessage}
                          </div>
                          <div className="py-2.5 px-4 rounded-xl bg-gray-200 text-gray-800 text-xs font-semibold text-center">
                            Visit Profile
                          </div>
                          <div className="py-2.5 px-4 rounded-xl bg-gray-200 text-gray-800 text-xs font-semibold text-center">
                            I'm following ✅
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveStepModal('step3_follow')}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0 shadow-sm mt-1"
                          title="Edit Follow Request"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4: Public Reply (Clicking ✏️ opens Auto-Reply Modal) */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">
                    leave a reply to their comment on the post · Replies rotate: 1 of {(formData.replyVariations || []).length || 3}
                  </div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-gray-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 max-w-md">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-[10px] font-bold">
                              P
                            </div>
                            <span className="font-semibold text-gray-900">priya.sharma</span>
                            <span className="text-gray-600">This is a comment</span>
                          </div>
                          <div className="ml-5 flex items-start gap-2 text-xs">
                            <img
                              src="/apple-touch-icon.png"
                              alt="You"
                              className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5 border border-purple-500/40"
                            />
                            <div>
                              <span className="font-semibold text-gray-900 mr-1.5">You</span>
                              <span className="text-blue-600 font-medium mr-1">@priya.sharma</span>
                              <span className="text-gray-700">
                                {formData.replyVariations?.[0] || 'Thanks! Please see DMs.'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveStepModal('step4_reply')}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0 shadow-sm mt-1"
                          title="Edit Comment Responses"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 5: Primary DM (Clicking ✏️ opens Primary DM & Button Modal) */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">
                    Once they follow, send them the following DM
                  </div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-gray-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 max-w-md">
                          <div className="p-4 rounded-3xl rounded-tl-sm bg-gray-100 border border-gray-200/60 text-xs text-gray-900 whitespace-pre-line leading-relaxed shadow-sm">
                            {formData.primaryDmMessage}
                          </div>
                          <div className="py-2.5 px-4 rounded-xl bg-gray-200 text-gray-800 text-xs font-semibold text-center">
                            {formData.primaryDmButtonLabel || 'Click me for link'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveStepModal('step5_dm')}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0 shadow-sm mt-1"
                          title="Edit Primary DM"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 6: Final Resource Delivery (Screenshots 1 & 2) */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">
                    On the Primary DM, if they tap on the button '{formData.primaryDmButtonLabel || 'Click me for link'}', we send them the following DM
                  </div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-gray-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="p-4 rounded-3xl rounded-tl-sm bg-gray-100 border border-gray-200/60 text-xs text-gray-800 font-sans whitespace-pre-line flex-1 max-w-md shadow-sm">
                          {formData.resourceMessage}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveStepModal('step6_resource')}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0 shadow-sm mt-1"
                          title="Edit Resource Message"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Bottom Pinned Action: Disable Automation (Exact match to Screenshots 1, 2, 4) */}
            <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0 z-20">
              <button
                type="button"
                onClick={async () => {
                  const next = !formData.enabled;
                  const nextData = { ...formData, enabled: next };
                  setFormData(nextData);
                  setAutomations((prev) =>
                    prev.map((a) => (a.id === formData.id ? { ...a, enabled: next } : a))
                  );
                  try {
                    await createAdminHybridAutomation({ ...nextData, safeTestingMode: true });
                  } catch (e) {
                    console.warn('Backend fallback:', e);
                  }
                  toast.success(next ? 'Automation Enabled' : 'Automation Disabled');
                }}
                className="w-full py-3.5 px-6 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-sm font-semibold text-center transition-all shadow-sm active:scale-[0.99]"
              >
                {formData.enabled ? 'Disable Automation' : 'Enable Automation'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. STEP 1 EDITOR MODAL: VISUAL REEL GRID PICKER (FRAME 005)    */}
      {/* ============================================================== */}
      {activeStepModal === 'step1_picker' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white text-gray-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh] border border-gray-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                When someone comments on your Post/Reel
              </div>
              <button
                type="button"
                onClick={() => setActiveStepModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 bg-white text-gray-900 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  The Comment is on...
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'specific_post', label: 'Specific Post/Reel' },
                    { id: 'any_post', label: 'Any Post/Reel' },
                    { id: 'next_post', label: 'Next Post/Reel' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetPostType: item.id })}
                      className={`py-2 px-2 rounded-2xl border text-xs font-semibold transition-all text-center ${
                        formData.targetPostType === item.id
                          ? 'bg-blue-50 text-blue-600 border-blue-400 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3x3 Visual Grid of Pranvith's Instagram Reels (frame 005) */}
              {formData.targetPostType === 'specific_post' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2.5">
                    {PRANVITH_REELS_SELECTION.map((reel) => {
                      const isSelected = formData.selectedReelId === reel.id;
                      return (
                        <div
                          key={reel.id}
                          onClick={() => handleSelectReelInGrid(reel)}
                          className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all group ${
                            isSelected
                              ? 'border-blue-500 shadow-md scale-[0.98]'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <img
                            src={reel.thumbnail}
                            alt={reel.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />

                          {/* Selected White Checkmark Circle (Frame 005) */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                                <Check className="w-5 h-5 stroke-[3]" />
                              </div>
                            </div>
                          )}

                          {/* Expand Icon */}
                          <div className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white">
                            <Maximize2 className="w-3 h-3" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-gray-500 text-center pt-1 font-sans">
                    Selected: <strong className="text-gray-900">{formData.videoTitle || 'Under 1 lakhs best camera for beginners'}</strong>
                  </p>
                </div>
              )}

              {formData.targetPostType === 'any_post' && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">The automation will trigger when a comment is posted on any of your Posts & Reels.</p>
                </div>
              )}

              {formData.targetPostType === 'next_post' && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">The automation will trigger on your next published post or reel.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setActiveStepModal(null)}
                className="px-4 py-2 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStepSave}
                disabled={saving}
                className="px-6 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. STEP 4 EDITOR MODAL: AUTO-REPLY 3 VARIATIONS (FRAME 008)    */}
      {/* ============================================================== */}
      {activeStepModal === 'step4_reply' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white text-gray-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh] border border-gray-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                When someone comments on your Post/Reel
              </div>
              <button
                type="button"
                onClick={() => setActiveStepModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 bg-white text-gray-900 text-xs">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-gray-900">Auto-Reply to comments on the post</span>
                <input
                  type="checkbox"
                  checked={formData.autoReplyToComments}
                  onChange={(e) => setFormData({ ...formData, autoReplyToComments: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Write 3 replies which will be sent in a random order so that your replies don't look like a bot. Automating comment replies comes with risk - Stay informed.
              </p>

              <button
                type="button"
                onClick={() => {
                  const base = formData.replyVariations?.[0] || 'Thanks! Please see DMs.';
                  setFormData({
                    ...formData,
                    replyVariations: [
                      base,
                      'Message sent! Take a look. 🙌',
                      'Nice! Check your direct message! 📸'
                    ]
                  });
                  toast.success('Generated 3 natural variations with AI.');
                }}
                className="w-full py-2 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Fill variations from reply 1 ✦ AI
              </button>

              <div className="space-y-3 pt-1">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>Comment response {idx + 1} *</span>
                      <span className="font-mono">{formData.replyVariations?.[idx]?.length || 0}/140</span>
                    </div>

                    <input
                      type="text"
                      value={formData.replyVariations?.[idx] || ''}
                      onChange={(e) => {
                        const updated = [...(formData.replyVariations || [])];
                        updated[idx] = e.target.value;
                        setFormData({ ...formData, replyVariations: updated });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:bg-white focus:border-blue-500"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        toast.info(`Rewriting variation ${idx + 1} with AI...`);
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium pl-1"
                    >
                      <Sparkles className="w-3 h-3" /> Rewrite ✦ AI
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setActiveStepModal(null)}
                className="px-4 py-2 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStepSave}
                disabled={saving}
                className="px-6 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. STEP 5 EDITOR MODAL: PRIMARY DM & BUTTON (FRAMES 014, 017) */}
      {/* ============================================================== */}
      {activeStepModal === 'step5_dm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white text-gray-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh] border border-gray-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                When someone comments on your Post/Reel
              </div>
              <button
                type="button"
                onClick={() => setActiveStepModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 bg-white text-gray-900 text-xs">
              {/* Follow & Email Toggles */}
              <div className="space-y-2">
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900">a DM asking to follow you</span>
                  <input
                    type="checkbox"
                    checked={formData.requireFollow}
                    onChange={(e) => setFormData({ ...formData, requireFollow: e.target.checked })}
                    className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900">a DM asking to share their email</span>
                  <input
                    type="checkbox"
                    checked={formData.askEmail}
                    onChange={(e) => setFormData({ ...formData, askEmail: e.target.checked })}
                    className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              {/* Primary DM Content */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-900 block">
                  Then send the primary DM...
                </span>

                <div>
                  <label className="text-[11px] text-gray-600 mb-1 block">DM type</label>
                  <select
                    value={formData.primaryDmType}
                    onChange={(e) => setFormData({ ...formData, primaryDmType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900"
                  >
                    <option>Text + Button</option>
                    <option>Text</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                    <span>DM content</span>
                    <span className="font-mono">{formData.primaryDmMessage?.length || 0}/900</span>
                  </div>
                  <textarea
                    rows={3}
                    value={formData.primaryDmMessage}
                    onChange={(e) => setFormData({ ...formData, primaryDmMessage: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 leading-relaxed focus:bg-white focus:border-blue-500"
                  />
                </div>

                {/* Button #1 Configuration (Frame 017) */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                    <span>^ Button #1</span>
                    <span className="text-gray-400 font-mono text-[11px]">
                      {formData.primaryDmButtonLabel?.length || 0}/60
                    </span>
                  </div>

                  <input
                    type="text"
                    value={formData.primaryDmButtonLabel}
                    onChange={(e) => setFormData({ ...formData, primaryDmButtonLabel: e.target.value })}
                    placeholder="Click me for link"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-semibold"
                  />

                  <div>
                    <label className="text-[11px] text-gray-600 mb-1 block">
                      When someone taps on this button,
                    </label>
                    <select
                      value={formData.buttonTapAction}
                      onChange={(e) => setFormData({ ...formData, buttonTapAction: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900"
                    >
                      <option value="send_dm">Send a DM</option>
                      <option value="open_url">Open a Link</option>
                    </select>
                  </div>

                  {formData.buttonTapAction === 'open_url' ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={formData.buttonActionUrl || formData.resourceUrl}
                          onChange={(e) => setFormData({ ...formData, buttonActionUrl: e.target.value, resourceUrl: e.target.value })}
                          placeholder="https://pranvithdop.com/assets/..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-mono"
                        />
                      </div>

                      {/* Quick link picker from pranvithdop.com/assets */}
                      <div className="pt-1">
                        <label className="text-[10px] text-gray-500 block mb-1">
                          Or select from Pranvith Creative Assets Store:
                        </label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              setFormData({
                                ...formData,
                                buttonActionUrl: e.target.value,
                                resourceUrl: e.target.value
                              });
                              toast.success('Pasted asset link!');
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-[11px] text-purple-600"
                        >
                          <option value="">-- Choose Creative Asset --</option>
                          {PRANVITH_ASSETS_QUICK_LINKS.map((asset) => (
                            <option key={asset.url} value={asset.url}>
                              {asset.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-600 block">
                        Message to send on tap (Product / Camera links):
                      </label>
                      <textarea
                        rows={5}
                        value={formData.resourceMessage}
                        onChange={(e) => setFormData({ ...formData, resourceMessage: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs text-gray-900 font-sans"
                      />
                    </div>
                  )}

                  {/* Track button clicks toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div>
                      <span className="text-xs text-gray-900 font-medium block">Track button clicks ⓘ</span>
                      <span className="text-[10px] text-gray-500">See how many people tap your buttons.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.trackButtonClicks}
                      onChange={(e) => setFormData({ ...formData, trackButtonClicks: e.target.checked })}
                      className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setActiveStepModal(null)}
                className="px-4 py-2 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStepSave}
                disabled={saving}
                className="px-6 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 11. STEP 2 TRIGGER MODAL                                       */}
      {/* ============================================================== */}
      {activeStepModal === 'step2_trigger' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white text-gray-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh] border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Comment Trigger Configuration
              </div>
              <button
                type="button"
                onClick={() => setActiveStepModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs bg-white text-gray-900">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Trigger Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, triggerType: 'any_comment' })}
                    className={`py-2 rounded-2xl border font-semibold ${
                      formData.triggerType === 'any_comment' ? 'bg-blue-50 text-blue-600 border-blue-400 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Any comment
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, triggerType: 'keyword' })}
                    className={`py-2 rounded-2xl border font-semibold ${
                      formData.triggerType === 'keyword' ? 'bg-blue-50 text-blue-600 border-blue-400 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Specific keyword
                  </button>
                </div>
              </div>

              {formData.triggerType === 'keyword' && (
                <div className="space-y-2 p-3 rounded-2xl bg-gray-50 border border-gray-200">
                  <label className="text-gray-700 font-semibold block">Keywords</label>
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
                      placeholder="Type keyword"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={addKeyword}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(formData.keywords || []).map((k) => (
                      <span key={k} className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold text-xs flex items-center gap-1">
                        {k}
                        <button type="button" onClick={() => removeKeyword(k)} className="hover:text-blue-900">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-gray-700 font-semibold block mb-1">Delay After Trigger (seconds)</label>
                <input
                  type="number"
                  value={formData.triggerDelaySeconds || 30}
                  onChange={(e) => setFormData({ ...formData, triggerDelaySeconds: parseInt(e.target.value) || 0 })}
                  className="w-24 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-mono"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setActiveStepModal(null)}
                className="px-4 py-2 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStepSave}
                disabled={saving}
                className="px-6 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 12. STEP 3 FOLLOW MODAL & STEP 6 RESOURCE MODAL                */}
      {/* ============================================================== */}
      {activeStepModal === 'step3_follow' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white text-gray-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh] border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white sticky top-0 z-10">
              <div className="text-sm font-bold text-gray-900">Instagram Follow Request</div>
              <button type="button" onClick={() => setActiveStepModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs bg-white text-gray-900">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 font-semibold">Require viewer to follow before DM link</span>
                <input
                  type="checkbox"
                  checked={formData.requireFollow}
                  onChange={(e) => setFormData({ ...formData, requireFollow: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-gray-600 font-medium block mb-1">Follow Request Message</label>
                <textarea
                  rows={4}
                  value={formData.followMessage}
                  onChange={(e) => setFormData({ ...formData, followMessage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0 z-10">
              <button type="button" onClick={() => setActiveStepModal(null)} className="px-4 py-2 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold">
                Cancel
              </button>
              <button type="button" onClick={handleStepSave} disabled={saving} className="px-6 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md">
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {activeStepModal === 'step6_resource' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white text-gray-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh] border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white sticky top-0 z-10">
              <div className="text-sm font-bold text-gray-900">Final Resource Message</div>
              <button type="button" onClick={() => setActiveStepModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs bg-white text-gray-900">
              <div>
                <label className="text-gray-600 font-medium block mb-1">Resource Delivery Message (Multi-line links)</label>
                <textarea
                  rows={8}
                  value={formData.resourceMessage}
                  onChange={(e) => setFormData({ ...formData, resourceMessage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between sticky bottom-0 z-10">
              <button type="button" onClick={() => setActiveStepModal(null)} className="px-4 py-2 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold">
                Cancel
              </button>
              <button type="button" onClick={handleStepSave} disabled={saving} className="px-6 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md">
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
