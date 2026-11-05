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
  ChevronRight,
  Headphones,
  CheckCircle2,
  Coins,
  Send,
  MessageSquare,
  Plus
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
import superprofileSeedList from '../data/superprofile_automations.json';

const DEFAULT_SEED_AUTOMATION = {
  name: 'Sony Camera Settings',
  platforms: ['youtube', 'facebook', 'instagram'],
  videoUrl: 'https://www.instagram.com/reel/DfTekPtNTe5/',
  platformUrls: { youtube: '', facebook: '', instagram: 'https://www.instagram.com/reel/DfTekPtNTe5/' },
  videoTitle: 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon',
  videoCaption: 'Under 1 lakhs best camera for beginners #photography #sony #nikon #camera #canon',
  thumbnailUrl: '/assets/superprofile-sample-thumb.jpg',
  triggerType: 'any_comment',
  targetPostType: 'any_post', // 'specific_post', 'any_post', 'next_post'
  keywords: ['SETTINGS', 'LINK', 'PRICE'],
  triggerDelayMinutes: 1,
  triggerDelaySeconds: 30,
  autoReplyToComments: true,
  replyMessage: 'Thanks! Please see DMs.',
  replyVariations: [
    'Thanks! Please see DMs.',
    'Sent you a message! Check it out!',
    'Nice! Check your DMs!'
  ],
  requireFollow: true,
  askEmail: false,
  followMessage: "Oops! Looks like you haven't followed me yet 👀\nIt would mean a lot if you could visit my profile and hit that follow button 😊.",
  followButtonLabel: 'Visit Profile',
  followConfirmLabel: "I'm following ✅",
  primaryDmType: 'Text + Button',
  primaryDmMessage: "Hi there!\nAppreciate your comment 🙌 As promised, here's the link for you ⬇️",
  primaryDmButtonLabel: 'Click me',
  buttonTapAction: 'send_dm', // 'send_dm', 'open_url'
  resourceDmType: 'Text',
  resourceMessage: "1. Nikon z50ii\nhttps://link.amazon/B08V0k2KI\n2. Sony zv-e10ii\nhttps://link.amazon/B07ZQ5bfd\n3. Sony a6400\nhttps://link.amazon/B04SfYq6K\n4. Canon Eos r10\nhttps://link.amazon/B03DhzQmC\n5. Canon r50v\nhttps://link.amazon/B06J4al3o",
  resourceUrl: '',
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
  const [activeTab, setActiveTab] = useState('automations'); // 'automations', 'must_haves', 'settings'
  const [sortBy, setSortBy] = useState('runs'); // 'runs', 'followers', 'clicks', 'date'
  const [sortAsc, setSortAsc] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Creation Wizard Modal State (Steps 1, 2, 3, Launch Review)
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1, 2, 3, 4 (Review)

  // Edit Modal State (Direct SuperProfile Flow)
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [activeRowMenu, setActiveRowMenu] = useState(null);

  // Form Data for Current Automation
  const [formData, setFormData] = useState({ ...DEFAULT_SEED_AUTOMATION });
  const [keywordInput, setKeywordInput] = useState('');

  // Expandable steps inside the Edit modal
  const [expandedSteps, setExpandedSteps] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
    step6: false,
    step7: false
  });

  // Load Automations (Merge DB automations with SuperProfile 30 imported list)
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
              thumbnail: dbItem.thumbnailUrl || '/assets/superprofile-sample-thumb.jpg'
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

  const toggleStepExpand = (stepKey) => {
    setExpandedSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

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
      name: `Hi! Appreciate the interaction 🙌 Here's the... (New Draft)`
    });
    setWizardStep(1);
    setShowCreateWizard(true);
  };

  const handleOpenEditModal = (auto) => {
    setFormData({
      ...DEFAULT_SEED_AUTOMATION,
      ...auto,
      name: auto.name || 'Sony Camera Settings',
      videoCaption: auto.videoCaption || auto.name || DEFAULT_SEED_AUTOMATION.videoCaption,
      thumbnailUrl: auto.thumbnail || auto.thumbnailUrl || '/assets/superprofile-sample-thumb.jpg'
    });
    setActiveRowMenu(null);
    setShowEditorModal(true);
  };

  const handleSaveAutomation = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        safeTestingMode: true,
        status: 'draft',
        enabled: false // Safety requirement: keep draft / preview
      };
      await createAdminHybridAutomation(payload);
      toast.success('AutoDM draft saved successfully.');
      await loadAutomations();
      setShowCreateWizard(false);
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
      {/* 1. TOP HEADER (MATCHING VIDEO FRAME 001)                       */}
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

          {/* + Create Automation Button (Blue, matching video) */}
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
      {/* 2. REFERRAL BANNER (MATCHING VIDEO FRAME 001 / 025)            */}
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
                  onClick={() => toast.info('SuperProfile Referral Program (Preview).')}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1"
                >
                  Learn more →
                </button>
              </div>
            </div>

            {/* Right Graphic: 3D Coins + ₹52,921+ Payouts Card */}
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
      {/* 3. NAVIGATION TABS (MATCHING VIDEO FRAME 001)                   */}
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
          onClick={() => toast.info('SuperProfile Help Center & Direct Support.')}
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5"
        >
          <Headphones className="w-3.5 h-3.5" />
          Support
        </button>
      </div>

      {/* ============================================================== */}
      {/* 4. THREE METRIC KPI CARDS (MATCHING VIDEO FRAME 001)           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: DM's SENT */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
              DM's SENT ⓘ
            </span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">2.31K</div>
          {/* Wave chart graphic (green) */}
          <div className="h-10 w-full pt-1">
            <svg viewBox="0 0 100 25" className="w-full h-full preserve-3d" preserveAspectRatio="none">
              <path
                d="M0,20 Q20,18 35,12 T70,8 T100,15 L100,25 L0,25 Z"
                fill="rgba(16, 185, 129, 0.15)"
              />
              <path
                d="M0,20 Q20,18 35,12 T70,8 T100,15"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: EMAILS COLLECTED */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
              EMAILS COLLECTED ⓘ
            </span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1.5">
            0 <span className="text-sm font-normal text-neutral-500">↗</span>
          </div>
          {/* Flat line graphic */}
          <div className="h-10 w-full pt-1">
            <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,20 L100,20" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
          </div>
        </div>

        {/* Card 3: FOLLOWERS GAINED */}
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
              FOLLOWERS GAINED ⓘ
            </span>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">1.72K</div>
          {/* Wave chart graphic (green) */}
          <div className="h-10 w-full pt-1">
            <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
              <path
                d="M0,22 Q30,20 50,10 T85,14 T100,18 L100,25 L0,25 Z"
                fill="rgba(16, 185, 129, 0.15)"
              />
              <path
                d="M0,22 Q30,20 50,10 T85,14 T100,18"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. SEARCH & TABLE CONTROLS BAR (MATCHING VIDEO FRAME 001)       */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        {/* Search input with magnifying glass */}
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

        {/* Right Action Buttons: Sort, Filter, Export */}
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
      {/* 6. AUTOMATIONS TABLE (MATCHING VIDEO FRAME 001 & 025)          */}
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
                    No automations found. Click "+ Create Automation" to get started.
                  </td>
                </tr>
              ) : (
                filteredList.map((row, index) => (
                  <tr
                    key={row.id || index}
                    onClick={() => handleOpenEditModal(row)}
                    className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                  >
                    {/* Automation column (Thumbnail + Name + Subtitle) */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={row.thumbnail || '/assets/superprofile-sample-thumb.jpg'}
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

                    {/* Followers Gained */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-200">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        {row.followers_gained || 0}
                      </div>
                    </td>

                    {/* Runs */}
                    <td className="py-3.5 px-4 text-center font-semibold text-white">
                      {row.run_count || 0}
                    </td>

                    {/* Button Clicks */}
                    <td className="py-3.5 px-4 text-center text-neutral-300">
                      {row.click_count || 0}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {row.status || 'Enabled'}
                      </span>
                    </td>

                    {/* Actions Menu */}
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
      {/* 7. STEP-BY-STEP "+ CREATE AUTOMATION" WIZARD (FRAMES 003-024)   */}
      {/* ============================================================== */}
      {showCreateWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-neutral-900 sticky top-0 z-10">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {wizardStep === 4 ? 'Launch AutoDM' : 'When someone comments on your Post/Reel'}
              </div>
              <button
                type="button"
                onClick={() => setShowCreateWizard(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Wizard Body */}
            <div className="p-6 overflow-y-auto space-y-6">

              {/* Creator Instagram Profile Header (Steps 1, 2, 3) */}
              {wizardStep <= 3 && (
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-500 p-0.5 mx-auto">
                    <img
                      src="/assets/superprofile-sample-thumb.jpg"
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover border-2 border-neutral-900"
                    />
                  </div>
                  <h3 className="text-xs font-bold text-white">pranvith_dop</h3>
                  <button type="button" className="text-[11px] text-blue-400 hover:underline">
                    Add another account
                  </button>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* WIZARD STEP 1: TARGET POST SELECTION (FRAMES 003, 004)   */}
              {/* -------------------------------------------------------- */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
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
                          className={`py-2 px-2.5 rounded-2xl border text-xs font-semibold transition-all text-center ${
                            formData.targetPostType === item.id
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                              : 'bg-neutral-950 text-neutral-300 border-white/10 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Informational Blue Card */}
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-200 leading-relaxed">
                      {formData.targetPostType === 'any_post'
                        ? 'The automation will trigger when a comment is posted on any of your Posts & Reels'
                        : formData.targetPostType === 'specific_post'
                        ? 'The automation will trigger only on the specific post or reel chosen.'
                        : 'The automation will trigger automatically on your very next uploaded reel/post.'}
                    </p>
                  </div>

                  {formData.targetPostType === 'specific_post' && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs text-neutral-400">Post / Reel URL</label>
                      <input
                        type="text"
                        value={formData.videoUrl}
                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                        placeholder="https://www.instagram.com/reel/DfTekPtNTe5/"
                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* WIZARD STEP 2: TRIGGER & COMMENT REPLIES (FRAMES 006-008) */}
              {/* -------------------------------------------------------- */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      What kind of comment should trigger this automation?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, triggerType: 'keyword' })}
                        className={`py-2 px-3 rounded-2xl border text-xs font-semibold transition-all ${
                          formData.triggerType === 'keyword'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                            : 'bg-neutral-950 text-neutral-300 border-white/10 hover:text-white'
                        }`}
                      >
                        Specific keyword
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, triggerType: 'any_comment' })}
                        className={`py-2 px-3 rounded-2xl border text-xs font-semibold transition-all ${
                          formData.triggerType === 'any_comment'
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                            : 'bg-neutral-950 text-neutral-300 border-white/10 hover:text-white'
                        }`}
                      >
                        Any comment
                      </button>
                    </div>
                  </div>

                  {formData.triggerType === 'keyword' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Should include any of these:</label>
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
                            placeholder="Type a keyword (min. 1 characters)"
                            className="flex-1 px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={addKeyword}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(formData.keywords || []).map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono"
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

                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        Keywords are not case-sensitive. Automations trigger only on exact matches.
                      </p>

                      {/* Also reply without keywords (AI Semantic check) */}
                      <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/10 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            Also reply without your keywords <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            AI checks comment meaning and replies when relevant to camera & settings.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.aiFallback}
                          onChange={(e) => setFormData({ ...formData, aiFallback: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-200">The automation will trigger for all comments</p>
                    </div>
                  )}

                  {/* Auto-Reply to comments on the post (Frame 008) */}
                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Auto-Reply to comments on the post</span>
                      <input
                        type="checkbox"
                        checked={formData.autoReplyToComments}
                        onChange={(e) => setFormData({ ...formData, autoReplyToComments: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                    </div>

                    {formData.autoReplyToComments && (
                      <div className="space-y-3 pt-1">
                        <p className="text-[11px] text-neutral-400">
                          Write 3 replies which will be sent in a random order so that your replies don't look like a bot.
                        </p>

                        <div className="space-y-2.5">
                          {[0, 1, 2].map((idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                                <span>Comment response {idx + 1} *</span>
                                <span>{formData.replyVariations?.[idx]?.length || 0}/140</span>
                              </div>
                              <input
                                type="text"
                                value={formData.replyVariations?.[idx] || ''}
                                onChange={(e) => {
                                  const updated = [...(formData.replyVariations || [])];
                                  updated[idx] = e.target.value;
                                  setFormData({ ...formData, replyVariations: updated });
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* WIZARD STEP 3: TIME DELAY & PRIMARY DM (FRAMES 010-023)  */}
              {/* -------------------------------------------------------- */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  {/* Time Delay */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Set a time delay *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={formData.triggerDelayMinutes}
                        onChange={(e) => setFormData({ ...formData, triggerDelayMinutes: parseInt(e.target.value) || 1 })}
                        className="w-20 px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white font-mono"
                      />
                      <select className="px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white">
                        <option>Minute</option>
                        <option>Seconds</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      We'll wait 1 minute after someone triggers this automation before sending the first DM.
                    </p>
                  </div>

                  {/* Follow & Email Gate Toggles */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-xs font-semibold text-neutral-400 block mb-1">
                      Before you send your primary DM, send them...
                    </span>

                    <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/10 flex items-center justify-between">
                      <span className="text-xs text-white">a DM asking to follow you</span>
                      <input
                        type="checkbox"
                        checked={formData.requireFollow}
                        onChange={(e) => setFormData({ ...formData, requireFollow: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/10 flex items-center justify-between">
                      <span className="text-xs text-white">a DM asking to share their email</span>
                      <input
                        type="checkbox"
                        checked={formData.askEmail}
                        onChange={(e) => setFormData({ ...formData, askEmail: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Primary DM Configuration */}
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <span className="text-xs font-semibold text-white block">
                      Then send the primary DM...
                    </span>

                    <div>
                      <label className="text-[11px] text-neutral-400 mb-1 block">DM type</label>
                      <select
                        value={formData.primaryDmType}
                        onChange={(e) => setFormData({ ...formData, primaryDmType: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white"
                      >
                        <option>Text + Button</option>
                        <option>Text</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 mb-1 block">DM content</label>
                      <textarea
                        rows={3}
                        value={formData.primaryDmMessage}
                        onChange={(e) => setFormData({ ...formData, primaryDmMessage: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-xs text-white"
                      />
                    </div>

                    {/* Button #1 Configuration */}
                    <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>^ Button #1</span>
                        <span className="text-neutral-500 font-normal">8/60</span>
                      </div>

                      <input
                        type="text"
                        value={formData.primaryDmButtonLabel}
                        onChange={(e) => setFormData({ ...formData, primaryDmButtonLabel: e.target.value })}
                        placeholder="Click me for link"
                        className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white font-semibold"
                      />

                      <div>
                        <label className="text-[11px] text-neutral-400 mb-1 block">
                          When someone taps on this button,
                        </label>
                        <select className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white">
                          <option>Send a DM</option>
                          <option>Open Link in Browser</option>
                        </select>
                      </div>

                      {/* Resource Message Box */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-neutral-400 block">
                          Follow-up Message (Camera affiliate links):
                        </label>
                        <textarea
                          rows={4}
                          value={formData.resourceMessage}
                          onChange={(e) => setFormData({ ...formData, resourceMessage: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* WIZARD STEP 4: LAUNCH AUTODM SUMMARY (FRAMES 014, 024)   */}
              {/* -------------------------------------------------------- */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div className="text-sm font-bold text-white">When someone...</div>

                  {/* Summary Tree Steps with ↳ */}
                  <div className="space-y-4 text-xs">
                    <div>
                      <p className="text-neutral-400 font-medium">comments on your next Posts or Reels</p>
                    </div>

                    <div className="space-y-1.5 pl-2">
                      <p className="text-neutral-400 font-medium">and comments...</p>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 font-mono">↳</span>
                        <span className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-white/10 text-white font-semibold">
                          {formData.triggerType === 'keyword' ? 'Specific Keywords' : 'Any comment'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 italic pl-5">
                        🕒 then wait 30 seconds after the trigger
                      </p>
                    </div>

                    {formData.requireFollow && (
                      <div className="space-y-2 pl-2">
                        <p className="text-neutral-400 font-medium">then ask them to follow you</p>
                        <div className="flex items-start gap-2">
                          <span className="text-neutral-500 font-mono mt-1">↳</span>
                          <div className="space-y-2 flex-1 max-w-sm">
                            <div className="p-3.5 rounded-2xl rounded-tl-sm bg-neutral-950 border border-white/10 text-white whitespace-pre-line leading-relaxed">
                              {formData.followMessage}
                            </div>
                            <div className="py-2 px-3 rounded-xl bg-neutral-950 border border-white/10 text-white font-semibold text-center">
                              Visit Profile
                            </div>
                            <div className="py-2 px-3 rounded-xl bg-neutral-950 border border-white/10 text-white font-semibold text-center">
                              I'm following ✅
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 pl-2">
                      <p className="text-neutral-400 font-medium">Once they follow, send them the following DM</p>
                      <div className="flex items-start gap-2">
                        <span className="text-neutral-500 font-mono mt-1">↳</span>
                        <div className="space-y-2 flex-1 max-w-sm">
                          <div className="p-3.5 rounded-2xl rounded-tl-sm bg-neutral-950 border border-white/10 text-white whitespace-pre-line leading-relaxed">
                            {formData.primaryDmMessage}
                          </div>
                          <div className="py-2 px-3 rounded-xl bg-neutral-950 border border-white/10 text-white font-semibold text-center">
                            {formData.primaryDmButtonLabel || 'Click me'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pl-2">
                      <p className="text-neutral-400 font-medium">
                        On the Primary DM, if they tap on the button '{formData.primaryDmButtonLabel || 'Click me'}', we send them the following DM
                      </p>
                      <div className="flex items-start gap-2">
                        <span className="text-neutral-500 font-mono mt-1">↳</span>
                        <div className="p-3.5 rounded-2xl rounded-tl-sm bg-neutral-950 border border-white/10 text-white font-mono whitespace-pre-line flex-1 max-w-sm">
                          {formData.resourceMessage}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Wizard Footer Controls */}
            <div className="p-4 border-t border-white/10 bg-neutral-950 flex items-center justify-between sticky bottom-0 z-10">
              <span className="text-xs text-neutral-500">
                {wizardStep <= 3 ? `Step ${wizardStep} of 3` : 'Review Mode'}
              </span>

              <div className="flex items-center gap-2">
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
                  >
                    Back
                  </button>
                )}

                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="px-6 py-2 rounded-2xl bg-black hover:bg-neutral-800 text-white border border-white/20 text-xs font-bold shadow-md"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveAutomation}
                    disabled={saving}
                    className="px-6 py-2 rounded-2xl bg-black hover:bg-neutral-800 text-white border border-white/20 text-xs font-bold shadow-md flex items-center gap-1.5"
                  >
                    {saving ? 'Saving...' : 'Confirm & launch'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. EDIT AUTOMATION MODAL (MATCHING VIDEO SCREENSHOTS 1, 2, 3, 4)*/}
      {/* ============================================================== */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[94vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-neutral-900 sticky top-0 z-20">
              <h3 className="text-lg font-bold text-white tracking-tight">Edit Automation</h3>
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">

              {/* In-Modal Live Preview (Comments on this post) */}
              <div className="rounded-3xl border border-white/10 bg-neutral-950/70 p-5 space-y-4 shadow-inner">
                <div className="text-xs font-semibold text-neutral-400 text-center border-b border-white/5 pb-2">
                  Comments on this post
                </div>

                {/* Post snippet */}
                <div className="flex items-start gap-3">
                  <img
                    src={formData.thumbnailUrl || '/assets/superprofile-sample-thumb.jpg'}
                    alt="Post"
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block">pranvith_dop</span>
                    <p className="text-[11px] text-neutral-300 line-clamp-2 mt-0.5">
                      {formData.videoCaption}
                    </p>
                  </div>
                </div>

                {/* Comment row */}
                <div className="space-y-2 pt-1 pl-1">
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-[10px] font-bold">
                      P
                    </div>
                    <div>
                      <span className="font-semibold text-white mr-1.5">priya.sharma</span>
                      <span className="text-neutral-200">Interested!</span>
                    </div>
                  </div>

                  {/* Replies rotate */}
                  <div className="ml-8 space-y-1 border-l-2 border-white/10 pl-3">
                    <div className="text-[10px] text-neutral-500">
                      Replies rotate: 1 of {(formData.replyVariations || []).length || 3}
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-[9px] font-bold">
                        P
                      </div>
                      <div>
                        <span className="font-semibold text-purple-300 mr-1.5">pranvith_dop</span>
                        <span className="text-neutral-200">
                          {formData.replyVariations?.[0] || 'Thanks! Please see DMs.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] text-neutral-400 bg-neutral-950 px-3 font-mono">
                    Message to @priya.sharma
                  </div>
                </div>

                {/* Follow Gate & Primary DM */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                      P
                    </div>
                    <span className="text-xs font-semibold text-white">pranvith_dop</span>
                  </div>

                  <div className="space-y-2 max-w-[90%]">
                    <div className="p-3.5 rounded-2xl rounded-tl-sm bg-neutral-800/90 border border-white/10 text-xs text-neutral-100 whitespace-pre-line leading-relaxed">
                      {formData.followMessage}
                    </div>
                    <div className="w-full py-2 px-3 rounded-2xl bg-white/10 text-white text-xs font-semibold text-center border border-white/10">
                      Visit Profile
                    </div>
                  </div>

                  <div className="space-y-2 max-w-[90%] pt-1">
                    <div className="p-3.5 rounded-2xl rounded-tl-sm bg-neutral-800/90 border border-white/10 text-xs text-neutral-100 whitespace-pre-line leading-relaxed">
                      {formData.primaryDmMessage}
                    </div>
                    <div className="w-full py-2.5 px-3 rounded-2xl bg-white/10 text-white text-xs font-bold text-center border border-white/15">
                      {formData.primaryDmButtonLabel || 'Click me for link'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertically Connected Steps Flow with ↳ */}
              <div className="space-y-6 pt-2">
                <div className="text-base font-bold text-white tracking-tight">When someone...</div>

                {/* Step 1: Video */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">comments on this specific post</div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 p-4 rounded-3xl bg-neutral-950 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <img
                            src={formData.thumbnailUrl || '/assets/superprofile-sample-thumb.jpg'}
                            alt="Post Thumbnail"
                            className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-white/10 shadow-md"
                          />
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                              CAPTION
                            </span>
                            <p className="text-xs text-white font-sans line-clamp-2 mt-0.5 leading-relaxed">
                              {formData.videoCaption}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step1')}
                          className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {expandedSteps.step1 && (
                        <div className="pt-3 border-t border-white/10 space-y-3 text-xs animate-in fade-in duration-200">
                          <div>
                            <label className="text-neutral-400 block mb-1">Caption</label>
                            <textarea
                              rows={2}
                              value={formData.videoCaption}
                              onChange={(e) => setFormData({ ...formData, videoCaption: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-neutral-400 block mb-1">Reel URL</label>
                            <input
                              type="text"
                              value={formData.videoUrl}
                              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 2: Trigger & Delay */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">and comments...</div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="px-4 py-2 rounded-2xl bg-neutral-950 border border-white/15 text-xs font-medium text-white shadow-sm">
                          {formData.triggerType === 'keyword'
                            ? `Specific Keywords: ${(formData.keywords || []).join(', ')}`
                            : 'Any comment'}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step2')}
                          className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 italic pl-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        then wait {formData.triggerDelaySeconds || 30} seconds after the trigger
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Follow Request Gate */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">then ask them to follow you</div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 max-w-md">
                          <div className="p-4 rounded-3xl rounded-tl-sm bg-neutral-950 border border-white/10 text-xs text-neutral-100 whitespace-pre-line leading-relaxed shadow-sm">
                            {formData.followMessage}
                          </div>
                          <div className="py-2.5 px-4 rounded-2xl bg-neutral-950 border border-white/10 text-white text-xs font-semibold text-center">
                            Visit Profile
                          </div>
                          <div className="py-2.5 px-4 rounded-2xl bg-neutral-950 border border-white/10 text-white text-xs font-semibold text-center">
                            I'm following ✅
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step3')}
                          className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm mt-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4: Public Reply */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">
                    leave a reply to their comment on the post · Replies rotate: 1 of {(formData.replyVariations || []).length || 3}
                  </div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 max-w-md">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center text-[10px] font-bold">
                              P
                            </div>
                            <span className="font-semibold text-white">priya.sharma</span>
                            <span className="text-neutral-300">This is a comment</span>
                          </div>
                          <div className="ml-5 flex items-start gap-2 text-xs">
                            <img
                              src="/apple-touch-icon.png"
                              alt="You"
                              className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5 border border-purple-500/40"
                            />
                            <div>
                              <span className="font-semibold text-purple-300 mr-1.5">You</span>
                              <span className="text-neutral-200">
                                {formData.replyVariations?.[0] || '@priya.sharma Thanks! Please see DMs.'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step4')}
                          className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm mt-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 5: Primary DM */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">
                    Once they follow, send them the following DM
                  </div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 max-w-md">
                          <div className="p-4 rounded-3xl rounded-tl-sm bg-neutral-950 border border-white/10 text-xs text-neutral-100 whitespace-pre-line leading-relaxed shadow-sm">
                            {formData.primaryDmMessage}
                          </div>
                          <div className="py-2.5 px-4 rounded-2xl bg-neutral-950 border border-white/10 text-white text-xs font-semibold text-center">
                            {formData.primaryDmButtonLabel || 'Click me'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step5')}
                          className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm mt-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 6: Final Resource Delivery */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-300">
                    On the Primary DM, if they tap on the button '{formData.primaryDmButtonLabel || 'Click me'}', we send them the following DM
                  </div>
                  <div className="flex items-start gap-3 pl-1">
                    <span className="text-neutral-400 text-sm font-mono mt-2">↳</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="p-4 rounded-3xl rounded-tl-sm bg-neutral-950 border border-white/10 text-xs text-neutral-100 font-mono whitespace-pre-line flex-1 max-w-md shadow-sm">
                          {formData.resourceMessage}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleStepExpand('step6')}
                          className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors shrink-0 shadow-sm mt-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Action: Disable Automation (Matching Video Screenshot) */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = !formData.enabled;
                    setFormData({ ...formData, enabled: next });
                    toast.info(next ? 'Automation Enabled (Preview Only)' : 'Automation Disabled');
                  }}
                  className="w-full py-3.5 px-6 rounded-full border border-white/20 bg-neutral-950 hover:bg-white/5 text-white text-sm font-semibold text-center transition-all shadow-md"
                >
                  {formData.enabled ? 'Disable Automation' : 'Disable Automation (Currently Inactive)'}
                </button>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-white/10 bg-neutral-950 flex items-center justify-between sticky bottom-0 z-20">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveAutomation}
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
