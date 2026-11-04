import React, { useState, useEffect } from 'react';
import {
  Share2,
  Instagram,
  Youtube,
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
  Database
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
  formatApiErrorDetail
} from '../../lib/api';

const TABS = [
  { id: 'connected_accounts', label: 'Connected Accounts', icon: Key, badge: 'Phase 1' },
  { id: 'video_publishing', label: 'Video Publishing', icon: Video, badge: 'Phase 2' },
  { id: 'scheduled_posts', label: 'Scheduled Posts', icon: Clock, badge: 'Upcoming' },
  { id: 'instagram_comments', label: 'Instagram Comments', icon: Instagram, badge: 'Phase 3' },
  { id: 'youtube_comments', label: 'YouTube Comments', icon: Youtube, badge: 'Phase 3' },
  { id: 'keyword_automation', label: 'Keyword Automation', icon: Sliders, badge: 'Phase 6' },
  { id: 'ai_reply_manager', label: 'AI Reply Manager', icon: Sparkles, badge: 'Phase 4' },
  { id: 'digital_resources', label: 'Digital Resources', icon: FileText, badge: 'Assets' },
  { id: 'pending_approvals', label: 'Pending Approvals', icon: AlertCircle, badge: 'Security' },
  { id: 'activity_logs', label: 'Activity Logs', icon: ListOrdered, badge: 'Audit' },
];

export default function SocialMediaManager() {
  const [activeTab, setActiveTab] = useState('connected_accounts');
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState({ instagram: null, youtube: null });
  const [comments, setComments] = useState([]);
  const [rules, setRules] = useState(null);

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
      const [accData, commData, ruleData] = await Promise.all([
        fetchAdminSocialAccounts().catch(() => ({ instagram: null, youtube: null })),
        fetchAdminSocialComments().catch(() => []),
        fetchAdminSocialRules().catch(() => null)
      ]);
      setAccounts(accData || {});
      setComments(commData || []);
      setRules(ruleData || null);
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

  const ig = accounts.instagram || {};
  const yt = accounts.youtube || {};

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

        <div className="flex items-center gap-3">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      {/* OTHER TABS: ROADMAP / COMING PHASES                           */}
      {/* ============================================================== */}
      {activeTab !== 'connected_accounts' && (
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
    </div>
  );
}

