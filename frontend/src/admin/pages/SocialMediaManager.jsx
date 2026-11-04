import React, { useState, useEffect } from 'react';
import {
  Share2,
  Instagram,
  Youtube,
  Facebook,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Key,
  Sliders,
  Send,
  Trash2,
  MessageSquare,
  Sparkles,
  Info,
  Check,
  X,
  FileText,
  Video,
  ListOrdered,
  Layers,
  ChevronRight,
  Database,
  CheckCheck,
  Eye,
  Power,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminSocialAccounts,
  connectAdminInstagram,
  disconnectAdminSocial,
  testAdminSocialConnection,
  fetchAdminSocialOAuthUrl,
  callbackAdminYouTubeOAuth,
  fetchAdminSocialComments,
  approveAdminSocialComment,
  manualReplyAdminSocialComment,
  dismissAdminSocialComment,
  fetchAdminSocialRules,
  simulateAdminSocialComment,
  fetchAdminYouTubeSettings,
  saveAdminYouTubeSettings,
  syncAdminYouTubeComments,
  fetchAdminYouTubeComments,
  previewAdminYouTubeReply,
  fetchAdminFacebookSettings,
  saveAdminFacebookSettings,
  connectAdminFacebook,
  syncAdminFacebookComments,
  fetchAdminFacebookComments,
  previewAdminFacebookReply,
  formatApiErrorDetail
} from '../../lib/api';

const TABS = [
  { id: 'connected_accounts', label: 'Connected Accounts', icon: Key, badge: 'Phase 1' },
  { id: 'video_publishing', label: 'Video Publishing', icon: Video, badge: 'Phase 2' },
  { id: 'scheduled_posts', label: 'Scheduled Posts', icon: Clock, badge: 'Upcoming' },
  { id: 'instagram_comments', label: 'Instagram Comments', icon: Instagram, badge: 'Phase 3' },
  { id: 'youtube_comments', label: 'YouTube Comments', icon: Youtube, badge: 'Active AI' },
  { id: 'facebook_comments', label: 'Facebook Comments', icon: Facebook, badge: 'Active AI' },
  { id: 'keyword_automation', label: 'Keyword Automation', icon: Sliders, badge: 'Phase 6' },
  { id: 'ai_reply_manager', label: 'AI Reply Manager', icon: Sparkles, badge: 'Interactive AI' },
  { id: 'digital_resources', label: 'Digital Resources', icon: FileText, badge: 'Assets' },
  { id: 'pending_approvals', label: 'Pending Approvals', icon: AlertCircle, badge: 'Security' },
  { id: 'activity_logs', label: 'Activity Logs', icon: ListOrdered, badge: 'Audit' },
];

export default function SocialMediaManager() {
  const [activeTab, setActiveTab] = useState('connected_accounts');
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState({ instagram: null, youtube: null, facebook: null });
  const [comments, setComments] = useState([]);
  const [rules, setRules] = useState(null);

  // YouTube Auto-Reply & Comments state
  const [ytSettings, setYtSettings] = useState({
    auto_reply_enabled: false,
    safe_testing_mode: true,
    emergency_kill_switch: false,
    sync_interval_minutes: 15
  });
  const [ytComments, setYtComments] = useState([]);
  const [ytFilter, setYtFilter] = useState('all');
  const [syncingYt, setSyncingYt] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editedReplyText, setEditedReplyText] = useState({});

  // Facebook Auto-Reply & Comments state
  const [fbSettings, setFbSettings] = useState({
    auto_reply_enabled: false,
    safe_testing_mode: true,
    emergency_kill_switch: false,
    sync_interval_minutes: 15
  });
  const [fbComments, setFbComments] = useState([]);
  const [fbFilter, setFbFilter] = useState('all');
  const [syncingFb, setSyncingFb] = useState(false);
  const [savingFbSettings, setSavingFbSettings] = useState(false);
  const [showFbModal, setShowFbModal] = useState(false);
  const [fbPageId, setFbPageId] = useState('');
  const [fbPageToken, setFbPageToken] = useState('');
  const [fbPageName, setFbPageName] = useState('');
  const [savingFb, setSavingFb] = useState(false);

  // Master Emergency Kill Switch loading
  const [togglingKillSwitch, setTogglingKillSwitch] = useState(false);

  // Playground state
  const [playgroundPlatform, setPlaygroundPlatform] = useState('youtube');
  const [ytPlaygroundText, setYtPlaygroundText] = useState('Sony A7 IV best settings?');
  const [ytPlaygroundAuthor, setYtPlaygroundAuthor] = useState('creator_arjun');
  const [ytPlaygroundResult, setYtPlaygroundResult] = useState(null);
  const [testingPlayground, setTestingPlayground] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Instagram Connect Modal
  const [showIgModal, setShowIgModal] = useState(false);
  const [igToken, setIgToken] = useState('');
  const [igAccountId, setIgAccountId] = useState('');
  const [igAppId, setIgAppId] = useState('');
  const [igAppSecret, setIgAppSecret] = useState('');
  const [exchangeLongLived, setExchangeLongLived] = useState(true);
  const [savingIg, setSavingIg] = useState(false);

  // Simulator state
  const [simText, setSimText] = useState('Nikon Z6III camera settings pdf kavali anna');
  const [simUsername, setSimUsername] = useState('vijay_creator');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Testing connection spinner
  const [testingPlatform, setTestingPlatform] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accData, commData, ruleData, ytSetData, ytCommData, fbSetData, fbCommData] = await Promise.all([
        fetchAdminSocialAccounts().catch(() => ({ instagram: null, youtube: null, facebook: null })),
        fetchAdminSocialComments().catch(() => []),
        fetchAdminSocialRules().catch(() => null),
        fetchAdminYouTubeSettings().catch(() => ({ auto_reply_enabled: false, safe_testing_mode: true })),
        fetchAdminYouTubeComments('all').catch(() => []),
        fetchAdminFacebookSettings().catch(() => ({ auto_reply_enabled: false, safe_testing_mode: true })),
        fetchAdminFacebookComments('all').catch(() => [])
      ]);
      setAccounts(accData || {});
      setComments(commData || []);
      setRules(ruleData || null);
      if (ytSetData) setYtSettings(ytSetData);
      if (ytCommData) setYtComments(ytCommData);
      if (fbSetData) setFbSettings(fbSetData);
      if (fbCommData) setFbComments(fbCommData);
    } catch (err) {
      toast.error('Failed to load social automation data: ' + formatApiErrorDetail(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check for Google OAuth callback params (?code=...&state=pranvith_yt)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && (state === 'pranvith_yt' || state?.startsWith('pranvith'))) {
      const cleanUrl = window.location.origin + window.location.pathname;
      // Immediately clean the URL to prevent double execution on reload
      window.history.replaceState({}, document.title, cleanUrl);

      const completeYouTubeAuth = async () => {
        const toastId = toast.loading('Connecting YouTube channel via Google OAuth 2.0...');
        try {
          const res = await callbackAdminYouTubeOAuth({
            code,
            redirect_uri: cleanUrl
          });
          toast.success(res.message || 'YouTube channel connected successfully!', { id: toastId });
          loadData();
        } catch (err) {
          toast.error(`YouTube connection failed: ${formatApiErrorDetail(err)}`, { id: toastId });
        }
      };
      completeYouTubeAuth();
    }
  }, []);

  const handleTestConnection = async (platform) => {
    setTestingPlatform(platform);
    try {
      const res = await testAdminSocialConnection(platform);
      if (res.success) {
        toast.success(`${platform.toUpperCase()}: ${res.status_message || 'Connection successful!'}`);
      } else {
        toast.warning(`${platform.toUpperCase()}: ${res.status_message || 'Connection test returned a warning.'}`);
      }
      loadData();
    } catch (err) {
      toast.error(`Connection test failed: ${formatApiErrorDetail(err)}`);
    } finally {
      setTestingPlatform(null);
    }
  };

  const handleDisconnect = async (platform) => {
    if (!window.confirm(`Are you sure you want to disconnect your ${platform.toUpperCase()} account? Tokens will be revoked.`)) {
      return;
    }
    try {
      await disconnectAdminSocial(platform);
      toast.success(`${platform.toUpperCase()} disconnected.`);
      loadData();
    } catch (err) {
      toast.error(`Disconnect failed: ${formatApiErrorDetail(err)}`);
    }
  };

  const handleSaveInstagram = async (e) => {
    e.preventDefault();
    if (!igToken.trim() || !igAccountId.trim()) {
      toast.error('Access Token and Instagram Account ID are required.');
      return;
    }
    setSavingIg(true);
    try {
      const res = await connectAdminInstagram({
        access_token: igToken.trim(),
        account_id: igAccountId.trim(),
        meta_app_id: igAppId.trim() || undefined,
        meta_app_secret: igAppSecret.trim() || undefined,
        exchange_for_long_lived: exchangeLongLived
      });
      toast.success(res.message || 'Instagram connected successfully!');
      setShowIgModal(false);
      setIgToken('');
      setIgAccountId('');
      loadData();
    } catch (err) {
      toast.error(`Instagram connection error: ${formatApiErrorDetail(err)}`);
    } finally {
      setSavingIg(false);
    }
  };

  const handleSimulateComment = async (e) => {
    e.preventDefault();
    if (!simText.trim()) return;
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await simulateAdminSocialComment({
        comment_text: simText.trim(),
        username: simUsername.trim() || 'creator'
      });
      setSimResult(res);
      toast.success('Comment simulated and analyzed!');
      loadData();
    } catch (err) {
      toast.error('Simulation error: ' + formatApiErrorDetail(err));
    } finally {
      setSimulating(false);
    }
  };

  const handleApproveReply = async (commentId, replyText) => {
    try {
      await approveAdminSocialComment(commentId, replyText);
      toast.success('Reply approved and published to comment thread!');
      loadData();
    } catch (err) {
      toast.error('Approval failed: ' + formatApiErrorDetail(err));
    }
  };

  const handleDismiss = async (commentId) => {
    try {
      await dismissAdminSocialComment(commentId);
      toast.success('Comment dismissed.');
      loadData();
    } catch (err) {
      toast.error('Dismiss failed: ' + formatApiErrorDetail(err));
    }
  };

  // YouTube specific actions
  const handleToggleAutoReply = async () => {
    const nextVal = !ytSettings.auto_reply_enabled;
    setSavingSettings(true);
    try {
      const res = await saveAdminYouTubeSettings({ auto_reply_enabled: nextVal });
      setYtSettings(res);
      if (nextVal) {
        toast.success('YouTube Auto-Reply ENABLED. (Safe Testing Mode determines if replies preview or publish)');
      } else {
        toast.info('YouTube Auto-Reply DISABLED. Incoming comments will wait for approval.');
      }
    } catch (err) {
      toast.error('Failed to toggle Auto-Reply: ' + formatApiErrorDetail(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleSafeMode = async () => {
    const nextVal = !ytSettings.safe_testing_mode;
    setSavingSettings(true);
    try {
      const res = await saveAdminYouTubeSettings({ safe_testing_mode: nextVal });
      setYtSettings(res);
      if (nextVal) {
        toast.success('Safe Testing Mode ACTIVATED! Live publishing to YouTube is disabled for safety.');
      } else {
        toast.warning('Safe Testing Mode turned OFF. Approved and auto-replied comments will publish live to YouTube!');
      }
    } catch (err) {
      toast.error('Failed to update Safe Mode: ' + formatApiErrorDetail(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSyncYouTube = async () => {
    setSyncingYt(true);
    const toastId = toast.loading('Syncing latest comments from connected YouTube channel...');
    try {
      const res = await syncAdminYouTubeComments({ max_results: 25 });
      if (res?.success) {
        toast.success(`Synced ${res.total_fetched} comments (${res.new_evaluated} analyzed with AI)`, { id: toastId });
        const fresh = await fetchAdminYouTubeComments('all');
        setYtComments(fresh || []);
      } else {
        toast.error(`Sync failed: ${res?.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (err) {
      toast.error('Failed to sync YouTube comments: ' + formatApiErrorDetail(err), { id: toastId });
    } finally {
      setSyncingYt(false);
    }
  };

  const handleApproveYouTubeComment = async (commentId, defaultReply) => {
    const text = editedReplyText[commentId] !== undefined ? editedReplyText[commentId] : defaultReply;
    if (!text || !text.trim()) {
      toast.error('Reply text cannot be empty');
      return;
    }
    setActionLoadingId(commentId);
    try {
      const res = await approveAdminSocialComment(commentId, text.trim());
      toast.success(res?.message || 'Reply approved successfully!');
      const fresh = await fetchAdminYouTubeComments('all');
      setYtComments(fresh || []);
      setEditingReplyId(null);
    } catch (err) {
      toast.error('Approval failed: ' + formatApiErrorDetail(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDismissYouTubeComment = async (commentId) => {
    setActionLoadingId(commentId);
    try {
      await dismissAdminSocialComment(commentId);
      toast.success('Comment dismissed.');
      const fresh = await fetchAdminYouTubeComments('all');
      setYtComments(fresh || []);
    } catch (err) {
      toast.error('Failed to dismiss comment: ' + formatApiErrorDetail(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Facebook specific actions
  const handleToggleFbAutoReply = async () => {
    const nextVal = !fbSettings.auto_reply_enabled;
    setSavingFbSettings(true);
    try {
      const res = await saveAdminFacebookSettings({ auto_reply_enabled: nextVal });
      setFbSettings(res);
      if (nextVal) {
        toast.success('Facebook Auto-Reply ENABLED. (Safe Testing Mode determines if replies preview or publish)');
      } else {
        toast.info('Facebook Auto-Reply DISABLED. Incoming comments will wait for approval.');
      }
    } catch (err) {
      toast.error('Failed to toggle Facebook Auto-Reply: ' + formatApiErrorDetail(err));
    } finally {
      setSavingFbSettings(false);
    }
  };

  const handleToggleFbSafeMode = async () => {
    const nextVal = !fbSettings.safe_testing_mode;
    setSavingFbSettings(true);
    try {
      const res = await saveAdminFacebookSettings({ safe_testing_mode: nextVal });
      setFbSettings(res);
      if (nextVal) {
        toast.success('Safe Testing Mode ACTIVATED for Facebook! Live publishing is disabled for safety.');
      } else {
        toast.warning('Safe Testing Mode turned OFF for Facebook. Approved and auto-replied comments will publish live to Facebook Page!');
      }
    } catch (err) {
      toast.error('Failed to update Facebook Safe Mode: ' + formatApiErrorDetail(err));
    } finally {
      setSavingFbSettings(false);
    }
  };

  const handleSyncFacebook = async () => {
    setSyncingFb(true);
    const toastId = toast.loading('Syncing latest comments from connected Facebook Page...');
    try {
      const res = await syncAdminFacebookComments({ max_results: 25 });
      if (res?.success) {
        toast.success(`Synced ${res.total_fetched} Facebook comments (${res.new_evaluated} analyzed with AI)`, { id: toastId });
        const fresh = await fetchAdminFacebookComments('all');
        setFbComments(fresh || []);
      } else {
        toast.error(`Facebook sync failed: ${res?.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (err) {
      toast.error('Failed to sync Facebook comments: ' + formatApiErrorDetail(err), { id: toastId });
    } finally {
      setSyncingFb(false);
    }
  };

  const handleApproveFacebookComment = async (commentId, defaultReply) => {
    const text = editedReplyText[commentId] !== undefined ? editedReplyText[commentId] : defaultReply;
    if (!text || !text.trim()) {
      toast.error('Reply text cannot be empty');
      return;
    }
    setActionLoadingId(commentId);
    try {
      const res = await approveAdminSocialComment(commentId, text.trim());
      toast.success(res?.message || 'Facebook reply approved successfully!');
      const fresh = await fetchAdminFacebookComments('all');
      setFbComments(fresh || []);
      setEditingReplyId(null);
    } catch (err) {
      toast.error('Facebook approval failed: ' + formatApiErrorDetail(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDismissFacebookComment = async (commentId) => {
    setActionLoadingId(commentId);
    try {
      await dismissAdminSocialComment(commentId);
      toast.success('Facebook comment dismissed.');
      const fresh = await fetchAdminFacebookComments('all');
      setFbComments(fresh || []);
    } catch (err) {
      toast.error('Failed to dismiss Facebook comment: ' + formatApiErrorDetail(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveFacebook = async (e) => {
    e.preventDefault();
    if (!fbPageId.trim() || !fbPageToken.trim()) {
      toast.error('Page ID and Page Access Token are required.');
      return;
    }
    setSavingFb(true);
    try {
      const res = await connectAdminFacebook({
        page_id: fbPageId.trim(),
        access_token: fbPageToken.trim(),
        page_name: fbPageName.trim() || undefined
      });
      toast.success(res.message || 'Facebook Page connected successfully!');
      setShowFbModal(false);
      setFbPageId('');
      setFbPageToken('');
      setFbPageName('');
      loadData();
    } catch (err) {
      toast.error(`Facebook connection error: ${formatApiErrorDetail(err)}`);
    } finally {
      setSavingFb(false);
    }
  };

  // Master Emergency Kill Switch
  const isEmergencyKilled = Boolean(ytSettings.emergency_kill_switch || fbSettings.emergency_kill_switch);

  const handleToggleEmergencyKillSwitch = async () => {
    const nextVal = !isEmergencyKilled;
    const confirmMsg = nextVal
      ? "EMERGENCY ACTION: Immediately halt ALL automatic replies across YouTube and Facebook?"
      : "Deactivate Emergency Kill Switch and restore normal automation settings?";
    if (!window.confirm(confirmMsg)) return;

    setTogglingKillSwitch(true);
    try {
      const [resYt, resFb] = await Promise.all([
        saveAdminYouTubeSettings({ emergency_kill_switch: nextVal }).catch(() => ytSettings),
        saveAdminFacebookSettings({ emergency_kill_switch: nextVal }).catch(() => fbSettings)
      ]);
      setYtSettings(resYt);
      setFbSettings(resFb);
      if (nextVal) {
        toast.error("EMERGENCY KILL SWITCH ACTIVATED: All automated replies stopped across all platforms!");
      } else {
        toast.success("Emergency Kill Switch deactivated. Normal settings restored.");
      }
    } catch (err) {
      toast.error("Failed to toggle Emergency Kill Switch: " + formatApiErrorDetail(err));
    } finally {
      setTogglingKillSwitch(false);
    }
  };

  const handleTestPlayground = async (e) => {
    if (e) e.preventDefault();
    if (!ytPlaygroundText.trim()) return;
    setTestingPlayground(true);
    setYtPlaygroundResult(null);
    try {
      let res;
      if (playgroundPlatform === 'facebook') {
        res = await previewAdminFacebookReply({
          comment_text: ytPlaygroundText.trim(),
          author_name: ytPlaygroundAuthor.trim() || 'follower'
        });
      } else {
        res = await previewAdminYouTubeReply({
          comment_text: ytPlaygroundText.trim(),
          author_name: ytPlaygroundAuthor.trim() || 'creator'
        });
      }
      setYtPlaygroundResult(res?.evaluation || null);
      toast.success(`${playgroundPlatform === 'facebook' ? 'Facebook' : 'YouTube'} AI reply generated and evaluated!`);
    } catch (err) {
      toast.error('AI Preview error: ' + formatApiErrorDetail(err));
    } finally {
      setTestingPlayground(false);
    }
  };

  const ig = accounts.instagram || {};
  const yt = accounts.youtube || {};
  const fb = accounts.facebook || {};

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-orange-500/20 via-pink-500/20 to-purple-500/20 border border-orange-500/30 text-orange-400">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Social Media Manager
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Official Meta & YouTube APIs
                </span>
              </h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                Multi-platform video publishing, AI comment intelligence & automated Telugu/English response engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Emergency Kill Switch Button */}
          <button
            onClick={handleToggleEmergencyKillSwitch}
            disabled={togglingKillSwitch}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isEmergencyKilled
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-600/30'
                : 'bg-white/5 hover:bg-rose-500/10 text-neutral-300 hover:text-rose-400 border border-white/10 hover:border-rose-500/30'
            }`}
            title="Emergency Kill Switch forcefully halts all automated responses across all connected channels"
          >
            <Power className={`w-3.5 h-3.5 ${isEmergencyKilled ? 'text-white' : 'text-rose-400'}`} />
            {isEmergencyKilled ? 'EMERGENCY KILL SWITCH ACTIVE (OFF)' : 'Emergency Kill Switch'}
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-neutral-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>
      </div>

      {/* Global Status Bar */}
      <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-neutral-900/60 border border-white/5 text-xs">
        <span className="text-neutral-500 font-semibold px-1">Engine Status:</span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
          ytSettings.auto_reply_enabled
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-neutral-800 text-neutral-400 border-white/5'
        }`}>
          <Youtube className="w-3.5 h-3.5" />
          YouTube: {ytSettings.auto_reply_enabled ? 'Auto-Reply ON' : 'OFF'}
          <span className="text-[10px] opacity-75">({ytSettings.safe_testing_mode ? 'Safe Mode' : 'Live'})</span>
        </span>

        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
          fbSettings.auto_reply_enabled
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            : 'bg-neutral-800 text-neutral-400 border-white/5'
        }`}>
          <Facebook className="w-3.5 h-3.5" />
          Facebook: {fbSettings.auto_reply_enabled ? 'Auto-Reply ON' : 'OFF'}
          <span className="text-[10px] opacity-75">({fbSettings.safe_testing_mode ? 'Safe Mode' : 'Live'})</span>
        </span>

        {isEmergencyKilled && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Master Kill Switch Engaged
          </span>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-white/10 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex gap-2 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm shadow-orange-500/5'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-white/5 text-neutral-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: CONNECTED ACCOUNTS (PHASE 1 CORE)                       */}
      {/* ============================================================== */}
      {activeTab === 'connected_accounts' && (
        <div className="space-y-8">
          {/* Status Banner */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-neutral-900/90 via-neutral-900/60 to-neutral-950 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Platform Credentials & Security Architecture</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
                  All Meta Graph API and YouTube OAuth tokens are encrypted and retained solely in your backend serverless environment and MongoDB database. Raw tokens are never exposed to browser clients or public code.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-neutral-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                MongoDB Atlas Backed
              </span>
            </div>
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* INSTAGRAM BUSINESS CARD */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-pink-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 p-0.5 shadow-md shadow-pink-500/20">
                      <div className="w-full h-full bg-neutral-900 rounded-[10px] flex items-center justify-center text-pink-400">
                        <Instagram className="w-5 h-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Instagram
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-400 border border-pink-500/20">
                          Meta Graph API v21.0
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-400">Instagram Professional / Business Account</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        ig.is_connected
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-white/10'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          ig.is_connected ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                        }`}
                      />
                      {ig.is_connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                {/* Profile & Metadata */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <img
                      src={ig.profile_picture_url || '/apple-touch-icon.png'}
                      alt="Profile"
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-neutral-800"
                      onError={(e) => {
                        e.target.src = '/apple-touch-icon.png';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {ig.name || 'Pranvith DOP'}
                      </h4>
                      <p className="text-xs text-orange-400 font-mono truncate">
                        @{ig.username || 'pranvithdop'}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate">
                        ID: {ig.account_id || 'Not configured'}
                      </p>
                    </div>
                  </div>

                  {/* Token Expiry Status */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-neutral-500" />
                        Token Status:
                      </span>
                      <span
                        className={`font-semibold ${
                          ig.token_status?.severity === 'success'
                            ? 'text-emerald-400'
                            : ig.token_status?.severity === 'warning'
                            ? 'text-amber-400'
                            : ig.token_status?.severity === 'danger'
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {ig.token_status?.status_text || 'No token active'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-500 font-mono">
                      <span>Masked Token:</span>
                      <span>{ig.token_masked || 'None'}</span>
                    </div>
                  </div>

                  {/* Granted Permissions / Scopes */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-neutral-400">Granted Scopes & Permissions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(ig.scopes || ['instagram_basic', 'instagram_manage_comments', 'instagram_content_publish', 'pages_show_list']).map(
                        (scope) => (
                          <span
                            key={scope}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300 font-mono"
                          >
                            {scope}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 mt-6 border-t border-white/10 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowIgModal(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-pink-500/10 transition-all"
                >
                  <Key className="w-3.5 h-3.5" />
                  {ig.is_connected ? 'Update / Refresh Token' : 'Connect Instagram'}
                </button>

                <button
                  onClick={() => handleTestConnection('instagram')}
                  disabled={testingPlatform === 'instagram'}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-300 transition-colors"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${testingPlatform === 'instagram' ? 'animate-spin text-orange-400' : ''}`}
                  />
                  Test API
                </button>

                {ig.is_connected && (
                  <button
                    onClick={() => handleDisconnect('instagram')}
                    className="inline-flex items-center justify-center px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-medium transition-colors"
                    title="Disconnect Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* YOUTUBE DATA API CARD */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-red-500/10 via-orange-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-md shadow-red-500/10">
                      <Youtube className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        YouTube
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                          YouTube Data API v3
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-400">Creator Channel & Shorts Automation</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        yt.is_connected
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-white/10'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          yt.is_connected ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                        }`}
                      />
                      {yt.is_connected ? 'Connected' : 'Ready to Connect'}
                    </span>
                  </div>
                </div>

                {/* Channel & Metadata */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <img
                      src={yt.profile_picture_url || '/apple-touch-icon.png'}
                      alt="Channel Profile"
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-neutral-800"
                      onError={(e) => {
                        e.target.src = '/apple-touch-icon.png';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {yt.name || 'Pranvith DOP'}
                      </h4>
                      <p className="text-xs text-red-400 font-mono truncate">
                        {yt.username || '@pranvithdop'}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate">
                        Channel ID: {yt.account_id || 'Configured via Google OAuth'}
                      </p>
                      {yt.statistics?.subscriber_count && (
                        <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-neutral-400">
                          <span className="text-white font-medium">{Number(yt.statistics.subscriber_count).toLocaleString()} subscribers</span>
                          <span>•</span>
                          <span>{yt.statistics.video_count || '0'} videos</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Token Status */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-neutral-500" />
                        Token Status:
                      </span>
                      <span
                        className={`font-semibold ${
                          yt.token_status?.severity === 'success'
                            ? 'text-emerald-400'
                            : yt.token_status?.severity === 'warning'
                            ? 'text-amber-400'
                            : yt.token_status?.severity === 'danger'
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {yt.token_status?.status_text || (yt.is_connected ? 'Connected' : 'Ready for OAuth activation')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-500 font-mono">
                      <span>Masked Token:</span>
                      <span>{yt.token_masked || 'None'}</span>
                    </div>
                  </div>

                  {/* Granted Scopes */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-neutral-400">Configured Scopes:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['youtube.upload (Shorts)', 'youtube.force-ssl (Comments)', 'youtube.readonly'].map((scope) => (
                        <span
                          key={scope}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300 font-mono"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 mt-6 border-t border-white/10 flex flex-wrap items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetchAdminSocialOAuthUrl('youtube');
                      if (res?.url) {
                        window.location.href = res.url;
                      } else {
                        toast.error(res?.message || 'Google OAuth client configuration required. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
                      }
                    } catch (err) {
                      toast.error('Failed to initiate Google OAuth: ' + formatApiErrorDetail(err));
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs font-semibold transition-all"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  {yt.is_connected ? 'Reconnect / Re-authorize' : 'Connect YouTube Channel'}
                </button>

                <button
                  onClick={() => handleTestConnection('youtube')}
                  disabled={testingPlatform === 'youtube'}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-300 transition-colors"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${testingPlatform === 'youtube' ? 'animate-spin text-red-400' : ''}`}
                  />
                  Test API
                </button>

                {yt.is_connected && (
                  <button
                    onClick={() => handleDisconnect('youtube')}
                    className="inline-flex items-center justify-center px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-medium transition-colors"
                    title="Disconnect YouTube Channel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* FACEBOOK PAGES CARD */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

              <div>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md shadow-blue-500/10">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Facebook Pages
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Meta Graph API v21.0
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-400">Creator Page & Feed Comments Automation</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        fb.is_connected
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-white/10'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          fb.is_connected ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                        }`}
                      />
                      {fb.is_connected ? 'Connected' : 'Ready to Connect'}
                    </span>
                  </div>
                </div>

                {/* Profile & Metadata */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <img
                      src={fb.profile_picture_url || '/apple-touch-icon.png'}
                      alt="Facebook Page Profile"
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-neutral-800"
                      onError={(e) => {
                        e.target.src = '/apple-touch-icon.png';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {fb.name || 'Pranvith DOP Page'}
                      </h4>
                      <p className="text-xs text-blue-400 font-mono truncate">
                        @{fb.username || 'pranvithdop'}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate">
                        Page ID: {fb.account_id || 'Not configured'}
                      </p>
                    </div>
                  </div>

                  {/* Token Status */}
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-neutral-500" />
                        Token Status:
                      </span>
                      <span
                        className={`font-semibold ${
                          fb.token_status?.severity === 'success'
                            ? 'text-emerald-400'
                            : fb.token_status?.severity === 'warning'
                            ? 'text-amber-400'
                            : fb.token_status?.severity === 'danger'
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {fb.token_status?.status_text || (fb.is_connected ? 'Connected' : 'Ready for Page Token')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-500 font-mono">
                      <span>Masked Token:</span>
                      <span>{fb.token_masked || 'None'}</span>
                    </div>
                  </div>

                  {/* Granted Permissions */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-neutral-400">Required Page Permissions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_engagement'].map((scope) => (
                        <span
                          key={scope}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300 font-mono"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-500 leading-relaxed bg-white/[0.01] p-2.5 rounded-lg border border-white/5">
                    <span className="text-neutral-400 font-semibold">Note:</span> Supports Facebook Pages only (not personal profiles). In Meta Development Mode, app admins/testers connect without review. Production use requires Meta App Review.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-6 mt-6 border-t border-white/10 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowFbModal(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-semibold transition-all"
                >
                  <Facebook className="w-3.5 h-3.5" />
                  {fb.is_connected ? 'Update Page Token' : 'Connect Facebook Page'}
                </button>

                <button
                  onClick={() => handleTestConnection('facebook')}
                  disabled={testingPlatform === 'facebook'}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-300 transition-colors"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${testingPlatform === 'facebook' ? 'animate-spin text-blue-400' : ''}`}
                  />
                  Test API
                </button>

                {fb.is_connected && (
                  <button
                    onClick={() => handleDisconnect('facebook')}
                    className="inline-flex items-center justify-center px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-medium transition-colors"
                    title="Disconnect Facebook Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Comment Simulator / Phase Verification Tool */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Interactive Comment AI & Language Detector</h3>
                  <p className="text-xs text-neutral-400">
                    Test live detection of Telugu (native script & Romanized Teluglish) vs. English, keyword mapping & admin approval logic
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                Live Test Console
              </span>
            </div>

            <form onSubmit={handleSimulateComment} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Username</label>
                <input
                  type="text"
                  value={simUsername}
                  onChange={(e) => setSimUsername(e.target.value)}
                  placeholder="e.g. kiran_visuals"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Comment Text</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    placeholder="e.g. Nikon Z6III wedding settings pdf kavali anna"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={simulating}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-md shadow-orange-500/20 transition-all"
                  >
                    <Send className={`w-3.5 h-3.5 ${simulating ? 'animate-pulse' : ''}`} />
                    Analyze
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-neutral-500">Quick Test Samples:</span>
              {[
                { label: 'Telugu Settings Request', text: 'Nikon Z6III settings kavali anna' },
                { label: 'Telugu Script LUT', text: 'బ్రో కలర్ గ్రేడింగ్ LUT ప్యాక్ లింక్ పంపండి' },
                { label: 'Sensitive: Course Price', text: 'What is the price of the cinematography master course?' },
                { label: 'Sensitive: Wedding Shoot', text: 'We want to book you for a wedding shoot next month' },
                { label: 'English Sound FX', text: 'Send sound fx pack link please' }
              ].map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setSimText(sample.text);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-300 transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {/* Simulation Result Display */}
            {simResult && simResult.evaluation && (
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Language Detected:</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase font-mono">
                      {simResult.evaluation.detected_language}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Status:</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        simResult.evaluation.status === 'auto_replied'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {simResult.evaluation.status === 'auto_replied'
                        ? 'AUTO-REPLIED (Public/DM)'
                        : 'PENDING ADMIN APPROVAL'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="text-neutral-400">
                    <span className="text-neutral-500 font-semibold">Matched Rule: </span>
                    {simResult.evaluation.matched_rule_name || 'None'}
                  </p>
                  <p className="text-neutral-400">
                    <span className="text-neutral-500 font-semibold">Matched Keywords: </span>
                    {(simResult.evaluation.matched_keywords || []).join(', ') || 'None'}
                  </p>
                  <p className="text-neutral-400">
                    <span className="text-neutral-500 font-semibold">Evaluation Reason: </span>
                    {simResult.evaluation.reason}
                  </p>
                  <div className="mt-2 p-3 rounded-lg bg-neutral-950 border border-white/10">
                    <span className="text-neutral-400 block font-semibold mb-1">
                      {simResult.evaluation.status === 'auto_replied' ? 'Generated Response:' : 'Suggested Reply for Admin Approval:'}
                    </span>
                    <span className="text-neutral-200 font-sans leading-relaxed">
                      {simResult.evaluation.reply_text || simResult.evaluation.suggested_reply}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* YOUTUBE COMMENTS AI AUTO-REPLY AUTOMATION (PHASE 3)          */}
      {/* ============================================================== */}
      {activeTab === 'youtube_comments' && (
        <div className="space-y-6">
          {/* Header Controls Bar */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-white/10 pb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={yt.profile_picture_url || '/assets/brand-profile.png'}
                    alt="YouTube Channel"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-red-500/30 shadow-lg shadow-red-500/10"
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-red-600 text-white shadow">
                    <Youtube className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-white">{yt.name || 'Pranvith DOP'}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      {yt.username || '@pranvithdop'}
                    </span>
                    {yt.is_connected && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3" /> OAuth Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    YouTube Data API v3 Multi-Lingual Comment Monitor & Dynamic Creator AI Reply Engine
                  </p>
                </div>
              </div>

              {/* Sync Action */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSyncYouTube}
                  disabled={syncingYt}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingYt ? 'animate-spin' : ''}`} />
                  {syncingYt ? 'Syncing...' : 'Fetch Channel Comments'}
                </button>

                <button
                  onClick={() => loadData()}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs transition-colors"
                  title="Reload Data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Automation Mode Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggle 1: Auto-Reply Switch */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Auto-Reply Engine:
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        ytSettings.auto_reply_enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {ytSettings.auto_reply_enabled ? 'ENABLED (ON)' : 'PAUSED (OFF)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Automatically processes new comments. Sensitive inquiries (pricing/bookings) always pause for approval.
                  </p>
                </div>

                <button
                  onClick={handleToggleAutoReply}
                  disabled={savingSettings}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    ytSettings.auto_reply_enabled ? 'bg-emerald-600' : 'bg-neutral-800'
                  }`}
                  role="switch"
                  aria-checked={ytSettings.auto_reply_enabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      ytSettings.auto_reply_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Safe Testing Mode */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Safe Testing Mode:
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        ytSettings.safe_testing_mode
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {ytSettings.safe_testing_mode ? 'ACTIVE (Previews Only)' : 'LIVE PUBLISHING ACTIVE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {ytSettings.safe_testing_mode
                      ? 'AI generates natural replies safely in preview mode. Zero live responses posted to YouTube.'
                      : 'Live Mode: Approved replies will be published publicly to your YouTube comment threads.'}
                  </p>
                </div>

                <button
                  onClick={handleToggleSafeMode}
                  disabled={savingSettings}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    ytSettings.safe_testing_mode ? 'bg-blue-600' : 'bg-neutral-800'
                  }`}
                  role="switch"
                  aria-checked={ytSettings.safe_testing_mode}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      ytSettings.safe_testing_mode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Metrics ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-neutral-400 block font-medium">Comments Detected</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {ytComments.length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-amber-400/90 block font-medium">Pending Approval</span>
                <span className="text-xl font-bold text-amber-400 mt-1 block">
                  {ytComments.filter((c) => c.status === 'pending_approval').length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-blue-400/90 block font-medium">Safe Previews</span>
                <span className="text-xl font-bold text-blue-400 mt-1 block">
                  {ytComments.filter((c) => c.status === 'preview_ready').length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-emerald-400/90 block font-medium">AI Replies Sent</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block">
                  {ytComments.filter((c) => c.status === 'approved' || c.status === 'auto_replied' || c.status === 'manual_replied').length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-neutral-400 block font-medium">Historical</span>
                <span className="text-xl font-bold text-neutral-400 mt-1 block">
                  {ytComments.filter((c) => c.status === 'historical').length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-rose-400/90 block font-medium">Failed Replies</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">
                  {ytSettings.failed_replies || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-neutral-400 block font-medium">Last Reply</span>
                <span className="text-xs font-semibold text-neutral-300 mt-2 block truncate" title={ytSettings.last_reply_at ? new Date(ytSettings.last_reply_at).toLocaleString() : 'None yet'}>
                  {ytSettings.last_reply_at ? new Date(ytSettings.last_reply_at).toLocaleTimeString() : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Safe AI Comment Tester Playground */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Multilingual AI Reply Playground</h3>
                  <p className="text-xs text-neutral-400">
                    Test how the AI understands Telugu, Romanized Teluglish & English, classifies intent, and crafts varied creator responses
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Safe Sandbox
              </span>
            </div>

            <form onSubmit={handleTestPlayground} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Viewer Username</label>
                <input
                  type="text"
                  value={ytPlaygroundAuthor}
                  onChange={(e) => setYtPlaygroundAuthor(e.target.value)}
                  placeholder="e.g. rambabududdu1714"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Comment Text</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ytPlaygroundText}
                    onChange={(e) => setYtPlaygroundText(e.target.value)}
                    placeholder="e.g. Z6ii. Setting kavali plz or Short films theeyocha bro price entha"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="submit"
                    disabled={testingPlayground}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${testingPlayground ? 'animate-pulse' : ''}`} />
                    Test Reply
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Test Samples */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-neutral-500 font-medium">Quick Test Presets:</span>
              {[
                { label: 'Sony A7 IV Settings', text: 'Sony A7 IV best settings?', author: 'creator_arjun' },
                { label: 'Sony A73 Settings', text: 'Sony A73 settings', author: 'sanjay_visuals' },
                { label: 'Nikon Z6III Settings', text: 'Nikon Z6III best settings?', author: 'arun_cinematics' },
                { label: 'Nikon Z6II Settings (Teluglish)', text: 'Z6ii. Setting kavali plz', author: 'rambabududdu1714' },
                { label: 'Canon R5 / R5 II Settings', text: 'Canon R5 best settings for video?', author: 'raj_lens' },
                { label: 'Canon R6 II Settings', text: 'Canon R6 II wedding settings?', author: 'manoj_canon' },
                { label: 'Camera Price', text: 'Camera price?', author: 'rahul_photo' },
                { label: 'Camera Links', text: 'Send camera links', author: 'nikhil_films' },
                { label: 'Instagram ID', text: 'Instagram ID?', author: 'sneha_visuals' },
                { label: 'Thank You', text: 'Thank you', author: 'manoj_dop' },
                { label: 'Telugu Settings', text: 'Sony A7 IV video settings cheppandi bro', author: 'kiran_visuals' },
                { label: 'Hindi Price', text: 'Bhai camera price kitna hai batao', author: 'amit_cinematics' },
                { label: 'Mixed Telugu Script', text: 'Short films theeyocha బ్రో దీనితో ప్రైస్ ఎంత ఉంటుంది', author: 'agentx0073' }
              ].map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setYtPlaygroundText(sample.text);
                    setYtPlaygroundAuthor(sample.author);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-300 transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {/* Playground Result Display */}
            {ytPlaygroundResult && (
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Detected Language:</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase font-mono">
                      {ytPlaygroundResult.detected_language}
                    </span>
                    <span className="text-xs font-semibold text-white ml-2">Intent:</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase font-mono">
                      {ytPlaygroundResult.intent}
                    </span>
                  </div>

                  <div>
                    {ytPlaygroundResult.is_sensitive ? (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Requires Admin Approval
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Safe for Auto-Reply
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="text-neutral-400">
                    <span className="text-neutral-500 font-semibold">Evaluation Reason: </span>
                    {ytPlaygroundResult.reason}
                  </p>
                  <div className="mt-2 p-3.5 rounded-lg bg-neutral-950 border border-white/10">
                    <span className="text-neutral-400 block font-semibold mb-1 text-[11px] uppercase tracking-wider">
                      Generated Dynamic Response:
                    </span>
                    <span className="text-neutral-100 font-sans leading-relaxed text-sm">
                      {ytPlaygroundResult.reply_text}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* YouTube Comments Feed & Management Table */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-red-400" />
                  Channel Comments & AI Suggestions
                </h3>
                <p className="text-xs text-neutral-400">
                  Review incoming comments from your connected YouTube channel, edit AI suggestions, or approve responses.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                {[
                  { id: 'all', label: 'All', count: ytComments.length },
                  { id: 'pending_approval', label: 'Pending Approval', count: ytComments.filter((c) => c.status === 'pending_approval').length },
                  { id: 'preview_ready', label: 'Previews Ready', count: ytComments.filter((c) => c.status === 'preview_ready').length },
                  { id: 'approved', label: 'Approved / Replied', count: ytComments.filter((c) => c.status === 'approved' || c.status === 'auto_replied' || c.status === 'manual_replied').length },
                  { id: 'historical', label: 'Historical (Archived)', count: ytComments.filter((c) => c.status === 'historical').length },
                  { id: 'dismissed', label: 'Dismissed', count: ytComments.filter((c) => c.status === 'dismissed').length }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setYtFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      ytFilter === f.id
                        ? 'bg-red-600 text-white font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Comments List */}
            {ytComments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Youtube className="w-10 h-10 text-neutral-600 mx-auto" />
                <h4 className="text-sm font-semibold text-neutral-300">No YouTube Comments Loaded</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Click the "Fetch Channel Comments" button above to import recent comments from your connected YouTube channel.
                </p>
                <button
                  onClick={handleSyncYouTube}
                  disabled={syncingYt}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingYt ? 'animate-spin' : ''}`} />
                  Sync Channel Comments
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {ytComments
                  .filter((c) => {
                    if (ytFilter === 'all') return true;
                    if (ytFilter === 'approved') {
                      return c.status === 'approved' || c.status === 'auto_replied' || c.status === 'manual_replied';
                    }
                    return c.status === ytFilter;
                  })
                  .map((c) => {
                    const isPending = c.status === 'pending_approval';
                    const isPreview = c.status === 'preview_ready';
                    const isDone = c.status === 'approved' || c.status === 'auto_replied' || c.status === 'manual_replied';
                    const isHistorical = c.status === 'historical';
                    const isEditing = editingReplyId === c.id;
                    const replyVal = editedReplyText[c.id] !== undefined ? editedReplyText[c.id] : (c.reply_text || c.suggested_reply || '');

                    return (
                      <div
                        key={c.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isPending
                            ? 'bg-amber-500/[0.03] border-amber-500/30'
                            : isDone
                            ? 'bg-emerald-500/[0.02] border-emerald-500/20'
                            : isHistorical
                            ? 'bg-neutral-900/40 border-white/5 opacity-80'
                            : 'bg-white/[0.02] border-white/10'
                        } space-y-4`}
                      >
                        {/* Top row: Author & Metadata */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={c.author_profile_image || '/assets/brand-profile.png'}
                              alt={c.author_name}
                              className="w-9 h-9 rounded-full object-cover border border-white/10"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {c.author_name || 'Viewer'}
                                </span>
                                {c.video_id && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">
                                    Video: {c.video_id}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-neutral-500">
                                {c.published_at ? new Date(c.published_at).toLocaleString() : 'Recent'}
                              </span>
                            </div>
                          </div>

                          {/* Status and language badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {c.detected_language && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">
                                {c.detected_language}
                              </span>
                            )}

                            {c.intent && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase">
                                {c.intent.replace('SENSITIVE_', '')}
                              </span>
                            )}

                            {isHistorical && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-white/10">
                                Historical Archive
                              </span>
                            )}

                            {isPending && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Pending Approval
                              </span>
                            )}

                            {isPreview && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Preview Ready (Safe Mode)
                              </span>
                            )}

                            {isDone && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                {c.status === 'auto_replied' ? 'Auto-Replied' : 'Approved'}
                              </span>
                            )}

                            {c.status === 'dismissed' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                                Dismissed
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Comment text */}
                        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-white/5">
                          <p className="text-sm text-neutral-200 leading-relaxed font-sans">
                            {c.comment_text}
                          </p>
                        </div>

                        {/* AI Suggested Response Box */}
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-neutral-400 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-red-400" />
                              {isHistorical ? 'Historical Archive Notice:' : isDone ? 'Published Response:' : 'AI Suggested Response:'}
                            </span>
                            {!isDone && !isHistorical && (
                              <button
                                type="button"
                                onClick={() => setEditingReplyId(isEditing ? null : c.id)}
                                className="text-[11px] text-neutral-400 hover:text-white underline"
                              >
                                {isEditing ? 'Cancel Edit' : 'Edit Response'}
                              </button>
                            )}
                          </div>

                          {isHistorical ? (
                            <p className="text-xs text-neutral-400 italic font-sans leading-relaxed">
                              Historical comment detected prior to active automation window. Preserved safely in history with zero auto-reply.
                            </p>
                          ) : isEditing ? (
                            <textarea
                              rows={3}
                              value={replyVal}
                              onChange={(e) =>
                                setEditedReplyText({ ...editedReplyText, [c.id]: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-red-500/40 text-xs text-white focus:outline-none"
                            />
                          ) : (
                            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                              {replyVal || 'No response draft generated.'}
                            </p>
                          )}
                        </div>

                        {/* Actions row */}
                        {!isDone && !isHistorical && c.status !== 'dismissed' && (
                          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleDismissYouTubeComment(c.id)}
                              disabled={actionLoadingId === c.id}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-neutral-400 transition-colors"
                            >
                              Dismiss
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApproveYouTubeComment(c.id, c.suggested_reply)}
                              disabled={actionLoadingId === c.id}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {ytSettings.safe_testing_mode
                                ? 'Approve (Safe Preview Mode)'
                                : 'Approve & Publish to YouTube'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FACEBOOK COMMENTS AI AUTO-REPLY AUTOMATION                     */}
      {/* ============================================================== */}
      {activeTab === 'facebook_comments' && (
        <div className="space-y-6">
          {/* Header Controls Bar */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-white/10 pb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={fb.profile_picture_url || '/apple-touch-icon.png'}
                    alt="Facebook Page"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500/30 shadow-lg shadow-blue-500/10"
                    onError={(e) => {
                      e.target.src = '/apple-touch-icon.png';
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-blue-600 text-white shadow">
                    <Facebook className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-white">{fb.name || 'Pranvith DOP Page'}</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      @{fb.username || 'pranvithdop'}
                    </span>
                    {fb.is_connected && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Page Token Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Meta Graph API v21.0 Page Feed & Post Comments Monitor with Multilingual AI Auto-Reply
                  </p>
                </div>
              </div>

              {/* Sync Action */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleSyncFacebook}
                  disabled={syncingFb}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingFb ? 'animate-spin' : ''}`} />
                  {syncingFb ? 'Syncing...' : 'Fetch Page Comments'}
                </button>

                <button
                  onClick={() => setShowFbModal(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  Configure Page
                </button>
              </div>
            </div>

            {/* Automation Mode Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggle 1: Auto-Reply Switch */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Auto-Reply Engine:
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        fbSettings.auto_reply_enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {fbSettings.auto_reply_enabled ? 'ENABLED (ON)' : 'PAUSED (OFF)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Automatically processes new Page comments. Sensitive inquiries (pricing/booking) always pause for approval.
                  </p>
                </div>

                <button
                  onClick={handleToggleFbAutoReply}
                  disabled={savingFbSettings}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    fbSettings.auto_reply_enabled ? 'bg-emerald-600' : 'bg-neutral-800'
                  }`}
                  role="switch"
                  aria-checked={fbSettings.auto_reply_enabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      fbSettings.auto_reply_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Safe Testing Mode */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Safe Testing Mode:
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        fbSettings.safe_testing_mode
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {fbSettings.safe_testing_mode ? 'ACTIVE (Previews Only)' : 'LIVE PUBLISHING ACTIVE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {fbSettings.safe_testing_mode
                      ? 'AI generates replies safely in preview mode. Zero live responses posted to your Facebook Page.'
                      : 'Live Mode: Approved replies will be published publicly to your Facebook Page comment threads.'}
                  </p>
                </div>

                <button
                  onClick={handleToggleFbSafeMode}
                  disabled={savingFbSettings}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    fbSettings.safe_testing_mode ? 'bg-blue-600' : 'bg-neutral-800'
                  }`}
                  role="switch"
                  aria-checked={fbSettings.safe_testing_mode}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      fbSettings.safe_testing_mode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Metrics ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-neutral-400 block font-medium">Comments Detected</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {fbComments.length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-amber-400/90 block font-medium">Pending Approval</span>
                <span className="text-xl font-bold text-amber-400 mt-1 block">
                  {fbComments.filter((c) => c.status === 'pending_approval').length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-blue-400/90 block font-medium">Safe Previews</span>
                <span className="text-xl font-bold text-blue-400 mt-1 block">
                  {fbComments.filter((c) => c.status === 'preview_ready').length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-emerald-400/90 block font-medium">AI Replies Sent</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block">
                  {fbComments.filter((c) => c.status === 'approved' || c.status === 'auto_replied' || c.status === 'manual_replied').length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-rose-400/90 block font-medium">Failed Replies</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">
                  {fbSettings.failed_replies || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] text-neutral-400 block font-medium">Last Reply</span>
                <span className="text-xs font-semibold text-neutral-300 mt-2 block truncate" title={fbSettings.last_reply_at ? new Date(fbSettings.last_reply_at).toLocaleString() : 'None yet'}>
                  {fbSettings.last_reply_at ? new Date(fbSettings.last_reply_at).toLocaleTimeString() : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Facebook Comments Feed & Management Table */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Page Comments & AI Suggestions
                </h3>
                <p className="text-xs text-neutral-400">
                  Review comments from your connected Facebook Page, edit suggested responses, or approve replies.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                {[
                  { id: 'all', label: 'All', count: fbComments.length },
                  { id: 'pending_approval', label: 'Pending Approval', count: fbComments.filter((c) => c.status === 'pending_approval').length },
                  { id: 'preview_ready', label: 'Previews Ready', count: fbComments.filter((c) => c.status === 'preview_ready').length },
                  { id: 'approved', label: 'Approved / Replied', count: fbComments.filter((c) => c.status === 'approved' || c.status === 'auto_replied' || c.status === 'manual_replied').length },
                  { id: 'dismissed', label: 'Dismissed', count: fbComments.filter((c) => c.status === 'dismissed').length }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFbFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      fbFilter === f.id
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {f.label} ({f.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Comments List */}
            {fbComments.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Facebook className="w-10 h-10 text-neutral-600 mx-auto" />
                <h4 className="text-sm font-semibold text-neutral-300">No Facebook Comments Loaded</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Click the "Fetch Page Comments" button above or connect your Facebook Page to import recent post and video comments.
                </p>
                <button
                  onClick={handleSyncFacebook}
                  disabled={syncingFb}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingFb ? 'animate-spin' : ''}`} />
                  Sync Page Comments
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {fbComments
                  .filter((c) => {
                    if (fbFilter === 'all') return true;
                    if (fbFilter === 'approved') {
                      return c.status === 'approved' || c.status === 'auto_replied' || c.status === 'manual_replied';
                    }
                    return c.status === fbFilter;
                  })
                  .map((c) => {
                    const isPending = c.status === 'pending_approval';
                    const isPreview = c.status === 'preview_ready';
                    const isDone = c.status === 'approved' || c.status === 'auto_replied' || c.status === 'manual_replied';
                    const isEditing = editingReplyId === c.id;
                    const replyVal = editedReplyText[c.id] !== undefined ? editedReplyText[c.id] : (c.reply_text || c.suggested_reply || '');

                    return (
                      <div
                        key={c.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isPending
                            ? 'bg-amber-500/[0.03] border-amber-500/30'
                            : isDone
                            ? 'bg-emerald-500/[0.02] border-emerald-500/20'
                            : 'bg-white/[0.02] border-white/10'
                        } space-y-4`}
                      >
                        {/* Top row: Author & Metadata */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                              {(c.author_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {c.author_name || 'Facebook User'}
                                </span>
                                {c.post_id && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400">
                                    Post: {c.post_id.slice(-8)}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-neutral-500">
                                {c.published_at ? new Date(c.published_at).toLocaleString() : 'Recent'}
                              </span>
                            </div>
                          </div>

                          {/* Status and language badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {c.detected_language && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">
                                {c.detected_language}
                              </span>
                            )}

                            {c.intent && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase">
                                {c.intent.replace('SENSITIVE_', '')}
                              </span>
                            )}

                            {isPending && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Pending Approval
                              </span>
                            )}

                            {isPreview && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Preview Ready (Safe Mode)
                              </span>
                            )}

                            {isDone && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                {c.status === 'auto_replied' ? 'Auto-Replied' : 'Approved'}
                              </span>
                            )}

                            {c.status === 'dismissed' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                                Dismissed
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Comment text */}
                        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-white/5">
                          <p className="text-sm text-neutral-200 leading-relaxed font-sans">
                            {c.comment_text}
                          </p>
                        </div>

                        {/* AI Suggested Response Box */}
                        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-neutral-400 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                              {isDone ? 'Published Response:' : 'AI Suggested Response:'}
                            </span>
                            {!isDone && (
                              <button
                                type="button"
                                onClick={() => setEditingReplyId(isEditing ? null : c.id)}
                                className="text-[11px] text-neutral-400 hover:text-white underline"
                              >
                                {isEditing ? 'Cancel Edit' : 'Edit Response'}
                              </button>
                            )}
                          </div>

                          {isEditing ? (
                            <textarea
                              rows={3}
                              value={replyVal}
                              onChange={(e) =>
                                setEditedReplyText({ ...editedReplyText, [c.id]: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-blue-500/40 text-xs text-white focus:outline-none"
                            />
                          ) : (
                            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                              {replyVal || 'No response draft generated.'}
                            </p>
                          )}
                        </div>

                        {/* Actions row */}
                        {!isDone && c.status !== 'dismissed' && (
                          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleDismissFacebookComment(c.id)}
                              disabled={actionLoadingId === c.id}
                              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-neutral-400 transition-colors"
                            >
                              Dismiss
                            </button>

                            <button
                              type="button"
                              onClick={() => handleApproveFacebookComment(c.id, c.suggested_reply)}
                              disabled={actionLoadingId === c.id}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              {fbSettings.safe_testing_mode
                                ? 'Approve (Safe Preview Mode)'
                                : 'Approve & Publish to Facebook'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* OTHER TABS: ROADMAP / COMING PHASES                           */}
      {/* ============================================================== */}
      {activeTab !== 'connected_accounts' && activeTab !== 'youtube_comments' && activeTab !== 'facebook_comments' && (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
            {React.createElement(TABS.find((t) => t.id === activeTab)?.icon || Share2, { className: 'w-6 h-6' })}
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white capitalize">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              This module is part of the Social Media Automation System architecture. Currently focused on Phase 1 Account Connection. Once confirmed, this section will activate seamlessly.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('connected_accounts')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 transition-colors"
          >
            Return to Connected Accounts (Phase 1)
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* INSTAGRAM CONNECT MODAL (META GRAPH API)                      */}
      {/* ============================================================== */}
      {showIgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/10 p-5 bg-neutral-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect Instagram Business Account</h3>
                  <p className="text-xs text-neutral-400">Official Meta Graph API (v21.0) Integration</p>
                </div>
              </div>
              <button
                onClick={() => setShowIgModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInstagram} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Step by step info */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs text-neutral-300">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-orange-400" />
                  How to generate your official Meta Access Token:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-400 pl-1">
                  <li>Visit <strong className="text-white">developers.facebook.com</strong> and open your Meta App.</li>
                  <li>In the App Dashboard, ensure <strong className="text-white">Instagram Graph API</strong> is added.</li>
                  <li>In Graph API Explorer, grant: <code className="text-orange-400">instagram_basic, instagram_manage_comments, instagram_content_publish, pages_show_list</code>.</li>
                  <li>Generate a User Token and copy your <strong className="text-white">Instagram Business Account ID</strong>.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Meta Access Token <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={igToken}
                  onChange={(e) => setIgToken(e.target.value)}
                  placeholder="Paste your EAAG... User or Page Access Token"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Instagram Business Account ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={igAccountId}
                  onChange={(e) => setIgAccountId(e.target.value)}
                  placeholder="e.g. 17841400000000000"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Long-lived token exchange toggle */}
              <div className="pt-2 border-t border-white/5 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exchangeLongLived}
                    onChange={(e) => setExchangeLongLived(e.target.checked)}
                    className="rounded bg-neutral-800 border-white/20 text-orange-500 focus:ring-0"
                  />
                  <span className="text-xs text-neutral-300 font-medium">
                    Auto-Exchange for 60-Day Long-Lived Token (Recommended)
                  </span>
                </label>

                {exchangeLongLived && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                        Meta App ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={igAppId}
                        onChange={(e) => setIgAppId(e.target.value)}
                        placeholder="App ID from Meta Portal"
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                        Meta App Secret (Optional)
                      </label>
                      <input
                        type="password"
                        value={igAppSecret}
                        onChange={(e) => setIgAppSecret(e.target.value)}
                        placeholder="App Secret from Meta Portal"
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowIgModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingIg}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-pink-500/20 transition-all"
                >
                  {savingIg && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Verify & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FACEBOOK PAGE CONNECT MODAL (META GRAPH API)                 */}
      {/* ============================================================== */}
      {showFbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-white/10 p-5 bg-neutral-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Facebook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect Facebook Page</h3>
                  <p className="text-xs text-neutral-400">Meta Graph API (v21.0) Integration for Pages</p>
                </div>
              </div>
              <button
                onClick={() => setShowFbModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFacebook} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs text-neutral-300">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-400" />
                  How to obtain your Facebook Page Access Token:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-neutral-400 pl-1">
                  <li>Go to <strong className="text-white">developers.facebook.com/tools/explorer</strong>.</li>
                  <li>Select your Meta App and choose your Facebook Page in the "User or Page" dropdown.</li>
                  <li>Ensure permissions are selected: <code className="text-blue-400">pages_show_list, pages_read_engagement, pages_manage_posts, pages_manage_engagement</code>.</li>
                  <li>Click <strong className="text-white">Generate Access Token</strong> and copy the Page ID and Page Access Token below.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Facebook Page ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={fbPageId}
                  onChange={(e) => setFbPageId(e.target.value)}
                  placeholder="e.g. 109283746501928"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Page Access Token <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={fbPageToken}
                  onChange={(e) => setFbPageToken(e.target.value)}
                  placeholder="Paste your EAAG... Page Access Token"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Page Name (Optional)
                </label>
                <input
                  type="text"
                  value={fbPageName}
                  onChange={(e) => setFbPageName(e.target.value)}
                  placeholder="e.g. Pranvith DOP"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-sans text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFbModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFb}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {savingFb && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Verify & Connect Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

