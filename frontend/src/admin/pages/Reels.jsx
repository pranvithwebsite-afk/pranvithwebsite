import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Heart,
  Instagram,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Tv,
  Upload,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import MediaUrlInput from '../components/MediaUrlInput';
import {
  createAdminReel,
  deleteAdminReel,
  fetchAdminReels,
  fetchInstagramThumbnail,
  reorderAdminReels,
  toggleAdminReelStatus,
  updateAdminReel,
} from '../../lib/api';
import {
  getInstagramEmbedUrl,
  getInstagramShortcode,
  isInstagramUrl,
} from '../../components/SafeVideoEmbed';
import { FALLBACK_IMAGE, handleImageError, safeImageSrc } from '../../lib/utils';
import { useAdminConfirm } from '../components/AdminConfirmProvider';

const defaultAdSettings = {
  pre_roll_enabled: true,
  mid_roll_enabled: true,
  mid_roll_cue_seconds: 10.0,
  ad_tag_url: '',
  gam_ad_unit_path: '/21775744923/pranvith_reels_video',
};

const defaultForm = {
  title: '',
  description: '',
  video_url: '',
  thumbnail_url: '',
  aspect_ratio: '9:16',
  sound_title: 'Original Audio - Pranvith DOP',
  author_name: 'Pranvith DOP',
  duration: 15.0,
  sort_order: 0,
  is_active: true,
  ad_settings: { ...defaultAdSettings },
};

const Reels = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewReel, setPreviewReel] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [fetchingThumb, setFetchingThumb] = useState(false);
  const confirm = useAdminConfirm();

  const getAdminReelCover = (reel) => {
    if (!reel) return FALLBACK_IMAGE;
    if (reel.thumbnail_url) return reel.thumbnail_url;
    const sc = getInstagramShortcode(reel.video_url);
    if (sc) {
      return `https://www.instagram.com/p/${sc}/media/?size=l`;
    }
    return FALLBACK_IMAGE;
  };

  const handleVideoUrlChange = async (val) => {
    const rawVal = String(val || '').trim();
    const isIg = isInstagramUrl(rawVal);
    const shortcode = getInstagramShortcode(rawVal);

    setForm((prev) => ({
      ...prev,
      video_url: rawVal,
      title: prev.title || (isIg && shortcode ? `Instagram Reel · ${shortcode}` : prev.title),
      sound_title:
        isIg && (!prev.sound_title || prev.sound_title === 'Original Audio - Pranvith DOP')
          ? 'Instagram Audio'
          : prev.sound_title,
    }));

    if (isIg) {
      try {
        setFetchingThumb(true);
        const res = await fetchInstagramThumbnail(rawVal);
        if (res?.thumbnail_url) {
          setForm((prev) => ({
            ...prev,
            thumbnail_url: prev.thumbnail_url || res.thumbnail_url,
            title: prev.title || res.title || (shortcode ? `Instagram Reel · ${shortcode}` : 'Instagram Reel'),
          }));
          toast.success('Instagram Reel detected: cover thumbnail & embed ready!');
        }
      } catch (err) {
        if (shortcode) {
          setForm((prev) => ({
            ...prev,
            thumbnail_url: prev.thumbnail_url || `https://www.instagram.com/p/${shortcode}/media/?size=l`,
          }));
        }
      } finally {
        setFetchingThumb(false);
      }
    }
  };

  const handleAutoFetchInstagramThumb = async () => {
    if (!isInstagramUrl(form.video_url)) {
      toast.error('Enter a valid Instagram Reel URL in the video field first');
      return;
    }
    try {
      setFetchingThumb(true);
      const res = await fetchInstagramThumbnail(form.video_url);
      if (res?.thumbnail_url) {
        setForm((prev) => ({ ...prev, thumbnail_url: res.thumbnail_url }));
        toast.success('Instagram cover thumbnail fetched successfully!');
      } else {
        const sc = getInstagramShortcode(form.video_url);
        if (sc) {
          setForm((prev) => ({
            ...prev,
            thumbnail_url: `https://www.instagram.com/p/${sc}/media/?size=l`,
          }));
          toast.success('Using official Instagram cover fallback');
        }
      }
    } catch (err) {
      toast.error('Could not fetch Instagram thumbnail');
    } finally {
      setFetchingThumb(false);
    }
  };

  const sortedReels = useMemo(
    () => [...reels].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [reels]
  );

  const stats = useMemo(() => {
    const total = reels.length;
    const active = reels.filter((r) => r.is_active !== false).length;
    const totalViews = reels.reduce((acc, r) => acc + (r.views_count || 0), 0);
    const totalLikes = reels.reduce((acc, r) => acc + (r.likes_count || 0), 0);
    return { total, active, totalViews, totalLikes };
  }, [reels]);

  const loadReels = async ({ showToast = true } = {}) => {
    try {
      setLoading(true);
      const data = await fetchAdminReels();
      setReels(Array.isArray(data) ? data : []);
    } catch (error) {
      if (showToast) {
        toast.error(error?.response?.data?.detail || 'Reels could not be loaded');
      }
      setReels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReels({ showToast: false });
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...defaultForm,
      sort_order: reels.length,
      ad_settings: { ...defaultAdSettings },
    });
    setModalOpen(true);
  };

  const openEdit = (reel) => {
    setEditingId(reel.id);
    setForm({
      ...defaultForm,
      ...reel,
      ad_settings: {
        ...defaultAdSettings,
        ...(reel.ad_settings || {}),
      },
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const rawVideoUrl = form.video_url.trim();
    if (!rawVideoUrl) {
      toast.error('Reel video URL or Instagram Reel link is required');
      return;
    }

    const isIg = isInstagramUrl(rawVideoUrl);
    const resolvedTitle =
      form.title.trim() || (isIg ? `Instagram Reel · ${getInstagramShortcode(rawVideoUrl) || ''}` : '');
    if (!resolvedTitle) {
      toast.error('Reel title is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: resolvedTitle,
        description: form.description.trim(),
        video_url: rawVideoUrl,
        thumbnail_url: form.thumbnail_url.trim(),
        aspect_ratio: form.aspect_ratio || '9:16',
        sound_title:
          form.sound_title?.trim() || (isIg ? 'Instagram Audio' : 'Original Audio - Pranvith DOP'),
        author_name: form.author_name?.trim() || 'Pranvith DOP',
        duration: form.duration ? Number(form.duration) : 15.0,
        sort_order: Number(form.sort_order || 0),
        is_active: Boolean(form.is_active),
        ad_settings: {
          pre_roll_enabled: Boolean(form.ad_settings?.pre_roll_enabled),
          mid_roll_enabled: Boolean(form.ad_settings?.mid_roll_enabled),
          mid_roll_cue_seconds: Number(form.ad_settings?.mid_roll_cue_seconds || 10),
          ad_tag_url: form.ad_settings?.ad_tag_url?.trim() || '',
          gam_ad_unit_path: form.ad_settings?.gam_ad_unit_path?.trim() || '/21775744923/pranvith_reels_video',
        },
      };

      if (editingId) {
        await updateAdminReel(editingId, payload);
        toast.success('Reel updated successfully');
      } else {
        await createAdminReel(payload);
        toast.success('Reel added and published successfully');
      }
      closeModal();
      loadReels({ showToast: false });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save reel');
    } finally {
      setSaving(false);
    }
  };
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save reel');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (reel) => {
    try {
      await toggleAdminReelStatus(reel.id);
      setReels((prev) =>
        prev.map((r) => (r.id === reel.id ? { ...r, is_active: !r.is_active } : r))
      );
      toast.success(`Reel ${reel.is_active ? 'hidden' : 'published'}`);
    } catch (error) {
      toast.error('Failed to change status');
    }
  };

  const handleDelete = async (reel) => {
    const shouldDelete = await confirm({
      title: 'Delete Reel',
      message: `Are you sure you want to permanently delete "${reel.title}"?`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!shouldDelete) return;

    try {
      await deleteAdminReel(reel.id);
      setReels((prev) => prev.filter((r) => r.id !== reel.id));
      toast.success('Reel deleted');
    } catch (error) {
      toast.error('Failed to delete reel');
    }
  };

  const moveReel = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sortedReels.length) return;

    const reordered = [...sortedReels];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setReels(reordered);

    try {
      const reelIds = reordered.map((r) => r.id);
      await reorderAdminReels(reelIds);
      toast.success('Reels order saved');
    } catch (error) {
      toast.error('Failed to reorder reels');
      loadReels({ showToast: false });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header and stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
              <Film className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Reels Management</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Upload and arrange vertical 9:16 reels, configure Google Ad Manager pre-rolls & mid-rolls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/reels"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            View Public /reels
          </a>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" />
            Upload New Reel
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs font-medium text-slate-400">Total Reels</p>
          <p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs font-medium text-slate-400">Published Active</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs font-medium text-slate-400">Total Views</p>
          <p className="mt-2 text-2xl font-bold text-violet-400">{stats.totalViews.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs font-medium text-slate-400">Total Likes</p>
          <p className="mt-2 text-2xl font-bold text-pink-400">{stats.totalLikes.toLocaleString()}</p>
        </div>
      </div>

      {/* Reels List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Vertical 9:16 Video Feed</h2>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              {reels.length}
            </span>
          </div>
          <button
            onClick={() => loadReels()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-violet-500" />
            <p className="mt-3 text-sm text-slate-400">Loading reels...</p>
          </div>
        ) : sortedReels.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Film className="h-10 w-10 text-slate-600" />
            <p className="mt-3 text-base font-semibold text-white">No reels uploaded yet</p>
            <p className="mt-1 text-sm text-slate-400 max-w-sm">
              Upload your first vertical 9:16 video reel. You can configure Google Ad Manager pre-roll and mid-roll ad cue points.
            </p>
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              Upload First Reel
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {sortedReels.map((reel, index) => {
              const ad = reel.ad_settings || {};
              return (
                <div
                  key={reel.id}
                  className={`flex flex-col gap-4 p-5 transition sm:flex-row sm:items-center sm:justify-between ${
                    !reel.is_active ? 'bg-slate-950/40 opacity-70' : 'hover:bg-slate-800/20'
                  }`}
                >
                  {/* Left: Thumbnail & basic info */}
                  <div className="flex items-start gap-4">
                    {/* 9:16 Preview thumbnail or video */}
                    <div
                      onClick={() => {
                        setPreviewReel(reel);
                        setPreviewModalOpen(true);
                      }}
                      className="group relative h-28 w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-slate-950"
                    >
                      {isInstagramUrl(reel.video_url) ? (
                        <img
                          src={safeImageSrc(getAdminReelCover(reel))}
                          alt={reel.title}
                          onError={handleImageError}
                          className="h-full w-full object-cover"
                        />
                      ) : reel.video_url ? (
                        <video
                          src={reel.video_url}
                          poster={safeImageSrc(reel.thumbnail_url) || undefined}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-600">
                          <Film className="h-6 w-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <Play className="h-6 w-6 fill-white text-white" />
                      </div>
                      {isInstagramUrl(reel.video_url) && (
                        <span className="absolute top-1 left-1 rounded bg-gradient-to-r from-purple-600 to-pink-600 p-0.5 text-white shadow">
                          <Instagram className="h-3 w-3" />
                        </span>
                      )}
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-mono text-white">
                        9:16
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-white">{reel.title}</h3>
                        {isInstagramUrl(reel.video_url) && (
                          <span className="inline-flex items-center gap-1 rounded bg-pink-500/20 px-2 py-0.5 text-[11px] font-medium text-pink-300">
                            <Instagram className="h-3 w-3" />
                            Instagram Reel
                          </span>
                        )}
                        {!reel.is_active && (
                          <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-medium text-rose-400">
                            Hidden / Draft
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs text-slate-400 max-w-xl">
                        {reel.description || 'No caption provided.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          {(reel.views_count || 0).toLocaleString()} views
                        </span>
                        <span className="flex items-center gap-1 text-pink-400">
                          <Heart className="h-3.5 w-3.5 fill-pink-400/30" />
                          {(reel.likes_count || 0).toLocaleString()} likes
                        </span>
                        {reel.duration && (
                          <span className="text-slate-500 font-mono">
                            {reel.duration}s
                          </span>
                        )}
                      </div>

                      {/* Google Ad Manager Indicators */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                            ad.pre_roll_enabled
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-slate-700 bg-slate-800/40 text-slate-500'
                          }`}
                        >
                          <Tv className="h-3 w-3" />
                          Pre-roll: {ad.pre_roll_enabled ? 'Active' : 'Off'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                            ad.mid_roll_enabled
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                              : 'border-slate-700 bg-slate-800/40 text-slate-500'
                          }`}
                        >
                          <Sparkles className="h-3 w-3" />
                          Mid-roll: {ad.mid_roll_enabled ? `@ ${ad.mid_roll_cue_seconds || 10}s` : 'Off'}
                        </span>
                        {ad.ad_tag_url && (
                          <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300">
                            Custom GAM Tag
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {/* Reorder buttons */}
                    <button
                      disabled={index === 0}
                      onClick={() => moveReel(index, -1)}
                      title="Move Up"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      disabled={index === sortedReels.length - 1}
                      onClick={() => moveReel(index, 1)}
                      title="Move Down"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>

                    {/* Toggle Active status */}
                    <button
                      onClick={() => handleToggleStatus(reel)}
                      title={reel.is_active ? 'Hide Reel' : 'Publish Reel'}
                      className={`rounded-lg p-2 transition ${
                        reel.is_active
                          ? 'text-emerald-400 hover:bg-emerald-500/10'
                          : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {reel.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => openEdit(reel)}
                      title="Edit Reel"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-violet-400"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(reel)}
                      title="Delete Reel"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Reel */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
                <Film className="h-4 w-4" />
              </span>
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Edit Reel' : 'Upload New Vertical Reel (9:16)'}
              </h2>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Video Upload / URL */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
                <MediaUrlInput
                  label="Reel Video (9:16 Vertical MP4 / WebM or Instagram Reel)"
                  fieldName="video_url"
                  value={form.video_url}
                  onChange={handleVideoUrlChange}
                  accept="video/mp4,video/webm,video/quicktime"
                  placeholder="Upload 9:16 video or paste Instagram Reel link (https://www.instagram.com/reel/...)"
                  helperText="Upload vertical 9:16 MP4/WebM video or paste direct link / Instagram Reel. Instagram covers are auto-fetched automatically."
                  videoUploadPurpose="reel-video"
                  showPreview={false}
                />

                {/* Live Preview if video is set */}
                {form.video_url && (
                  <div className="mt-3 flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
                    <div className="h-24 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-black">
                      {isInstagramUrl(form.video_url) ? (
                        <img
                          src={safeImageSrc(getAdminReelCover(form))}
                          alt="Instagram Reel Cover"
                          onError={handleImageError}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video
                          src={form.video_url}
                          className="h-full w-full object-cover"
                          controls={false}
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      )}
                    </div>
                    <div className="space-y-1 text-xs">
                      {isInstagramUrl(form.video_url) ? (
                        <>
                          <p className="font-semibold text-pink-400 flex items-center gap-1.5">
                            <Instagram className="h-3.5 w-3.5" />
                            Instagram Reel Detected
                          </p>
                          <p className="line-clamp-1 text-slate-400 font-mono text-[11px]">{form.video_url}</p>
                          <p className="text-slate-400 text-[11px]">
                            Official embed ready &bull; Cover auto-resolved
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-emerald-400">✓ Video Source Connected</p>
                          <p className="line-clamp-1 text-slate-400 font-mono text-[11px]">{form.video_url}</p>
                          <p className="text-slate-500">9:16 vertical fullscreen ratio</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Reel Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Cinematic Teal & Orange Color Grade"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Caption / Description & Hashtags
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Shot on Sony FX3 in S-Log3. Graded using Pranvith LUTs. #cinematography #slog3 #reels"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Poster / Thumbnail image */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Poster / Thumbnail Image (Optional)
                  </label>
                  {isInstagramUrl(form.video_url) && (
                    <button
                      type="button"
                      disabled={fetchingThumb}
                      onClick={handleAutoFetchInstagramThumb}
                      className="inline-flex items-center gap-1 rounded-lg border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 text-[11px] font-semibold text-pink-300 hover:bg-pink-500/20 disabled:opacity-50"
                    >
                      <Instagram className="h-3 w-3" />
                      {fetchingThumb ? 'Fetching Cover...' : 'Re-fetch Instagram Cover'}
                    </button>
                  )}
                </div>
                <MediaUrlInput
                  label=""
                  fieldName="thumbnail_url"
                  value={form.thumbnail_url}
                  onChange={(val) => setForm((prev) => ({ ...prev, thumbnail_url: val }))}
                  accept="image/*"
                  placeholder="Upload or paste image thumbnail URL"
                  helperText="Poster image displayed while video is loading or paused. For Instagram Reels, this is auto-resolved from the official embed."
                />
              </div>

              {/* Audio & Metadata */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Sound / Audio Track Title</label>
                  <input
                    type="text"
                    value={form.sound_title}
                    onChange={(e) => setForm((prev) => ({ ...prev, sound_title: e.target.value }))}
                    placeholder="Original Audio - Pranvith DOP"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Author Name</label>
                  <input
                    type="text"
                    value={form.author_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, author_name: e.target.value }))}
                    placeholder="Pranvith DOP"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Estimated Duration (sec)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.duration || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                    placeholder="18"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Google Ad Manager Settings (GAM) */}
              <div className="rounded-2xl border border-violet-500/20 bg-violet-950/10 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Tv className="h-4 w-4 text-violet-400" />
                  <h3 className="text-sm font-bold text-white">Google Ad Manager (GAM) Ready Settings</h3>
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                    Pre-roll & Mid-roll Ads
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Configure programmatic video ad slots. Placeholders render interactive Google Ad overlays with countdown and skip controls, fully wired for Google IMA SDK / VAST tags.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                  {/* Pre-roll ad switch */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
                    <div>
                      <p className="text-xs font-semibold text-white">Enable Pre-roll Ad</p>
                      <p className="text-[11px] text-slate-400">Plays sponsored ad before reel starts</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={form.ad_settings?.pre_roll_enabled ?? true}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            ad_settings: {
                              ...prev.ad_settings,
                              pre_roll_enabled: e.target.checked,
                            },
                          }))
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:outline-none" />
                    </label>
                  </div>

                  {/* Mid-roll ad switch */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 p-3.5">
                    <div>
                      <p className="text-xs font-semibold text-white">Enable Mid-roll Ad</p>
                      <p className="text-[11px] text-slate-400">Pauses reel at cue point for ad</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={form.ad_settings?.mid_roll_enabled ?? true}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            ad_settings: {
                              ...prev.ad_settings,
                              mid_roll_enabled: e.target.checked,
                            },
                          }))
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-600 peer-checked:after:translate-x-full peer-focus:outline-none" />
                    </label>
                  </div>
                </div>

                {/* Mid-roll cue seconds */}
                {form.ad_settings?.mid_roll_enabled && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300">
                      Mid-roll Cue Point (Timestamp in seconds)
                    </label>
                    <div className="mt-1.5 flex items-center gap-3">
                      <input
                        type="number"
                        step="1"
                        min="2"
                        value={form.ad_settings?.mid_roll_cue_seconds ?? 10}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            ad_settings: {
                              ...prev.ad_settings,
                              mid_roll_cue_seconds: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-32 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>Quick:</span>
                        {[6, 10, 15, 20].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                ad_settings: {
                                  ...prev.ad_settings,
                                  mid_roll_cue_seconds: sec,
                                },
                              }))
                            }
                            className={`rounded-lg px-2 py-1 text-[11px] font-mono border ${
                              form.ad_settings?.mid_roll_cue_seconds === sec
                                ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                                : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced GAM parameters */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400">
                      Custom Google Ad Manager VAST/VMAP Ad Tag URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.ad_settings?.ad_tag_url || ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          ad_settings: {
                            ...prev.ad_settings,
                            ad_tag_url: e.target.value,
                          },
                        }))
                      }
                      placeholder="https://pubads.g.doubleclick.net/gampad/ads?iu=..."
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400">
                      GAM Ad Unit Path
                    </label>
                    <input
                      type="text"
                      value={form.ad_settings?.gam_ad_unit_path || ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          ad_settings: {
                            ...prev.ad_settings,
                            gam_ad_unit_path: e.target.value,
                          },
                        }))
                      }
                      placeholder="/21775744923/pranvith_reels_video"
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status active checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="reel_is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="reel_is_active" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Publish reel to public /reels feed immediately
                </label>
              </div>

              {/* Form buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editingId ? 'Save Changes' : 'Publish Reel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fullscreen 9:16 Reel Preview */}
      {previewModalOpen && previewReel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => {
                setPreviewModalOpen(false);
                setPreviewReel(null);
              }}
              className="absolute -top-12 right-0 rounded-full bg-slate-800 p-2 text-white hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative aspect-[9/16] h-[75vh] max-h-[800px] overflow-hidden rounded-3xl border border-slate-700 bg-black shadow-2xl">
              {isInstagramUrl(previewReel.video_url) ? (
                <iframe
                  src={getInstagramEmbedUrl(previewReel.video_url)}
                  title={previewReel.title}
                  className="h-full w-full border-0 select-none"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                  scrolling="no"
                />
              ) : (
                <video
                  src={previewReel.video_url}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              )}
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                <p className="font-bold text-sm">{previewReel.title}</p>
                <p className="text-xs text-white/70 line-clamp-2 mt-1">{previewReel.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reels;

