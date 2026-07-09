import React, { useMemo, useState } from 'react';
import { Check, Copy, Grid2X2, Image as ImageIcon, List, Search, Upload, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  uploadAdminVideoToR2,
  fetchAdminMedia,
  uploadAdminImageToR2,
} from '../../lib/api';
import {
  ADMIN_IMAGE_RECOMMENDED_BYTES,
  ADMIN_IMAGE_UPLOAD_ACCEPT,
  ADMIN_IMAGE_UPLOAD_MAX_BYTES,
  ADMIN_VIDEO_UPLOAD_ACCEPT,
  ADMIN_VIDEO_UPLOAD_MAX_BYTES,
  formatBytes,
  formatMegabytes,
  formatUploadError,
  validateImageUploadFile,
  validateVideoUploadFile,
} from '../../lib/mediaUpload';
import { detectMediaType, isDirectVideoUrl, isImageUrl, isVimeoUrl, isYouTubeUrl } from '../../components/SafeVideoEmbed';
import { handleImageError, safeImageSrc } from '../../lib/utils';

const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-white transition hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60';

const itemUrl = (item = {}) => item.public_url || item.url || '';
const itemMime = (item = {}) => item.type || item.mime_type || '';
const itemName = (item = {}) => item.original_filename || item.filename || item.title || 'Media';
const itemUploadedAt = (item = {}) => item.uploaded_at || item.created_at || '';
const videoMediaTypes = new Set(['video_file', 'video_url', 'youtube', 'vimeo', 'direct']);
const posterFieldPattern = /(poster|thumbnail)/i;
const posterMessage = 'Poster/thumbnail must be an image URL. Leave it empty for videos or upload a thumbnail image.';

const getItemType = (item = {}) => {
  const mime = String(itemMime(item)).toLowerCase();
  const mediaType = String(item.media_type || '').toLowerCase();
  if (mime.startsWith('image/') || mediaType === 'image') return 'image';
  if (mime.startsWith('video/') || mediaType === 'video') return 'video';
  return 'other';
};

const sortLatestFirst = (items = []) => (
  [...items].sort((left, right) => String(itemUploadedAt(right)).localeCompare(String(itemUploadedAt(left))))
);

const MediaUrlInput = ({
  label,
  fieldName = '',
  value,
  onChange,
  accept = 'image/*',
  placeholder = 'Paste media URL',
  helperText = '',
  showPreview = true,
  mediaType,
  mediaItems = [],
  onUploaded,
  videoUploadPurpose = 'cms-video',
  videoUploadSlug = '',
}) => {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerItems, setPickerItems] = useState(mediaItems);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedVideoSize, setSelectedVideoSize] = useState('');
  const normalizedMediaType = String(mediaType || '').trim().toLowerCase();
  const currentType = normalizedMediaType || detectMediaType(value);
  const supportsImageUpload = accept.includes('image');
  const supportsVideoUpload = accept.includes('video');
  const isPosterField = posterFieldPattern.test(String(fieldName || label || ''));
  const mediaLibraryMode = isPosterField ? 'poster' : (supportsVideoUpload ? 'video' : 'image');
  const videoMode = supportsVideoUpload && (videoMediaTypes.has(normalizedMediaType) || videoMediaTypes.has(currentType));
  const trimmedValue = String(value || '').trim();
  const posterValueInvalid = isPosterField && trimmedValue && !isImageUrl(trimmedValue);
  const mediaValueIsSupportedVideo = !!trimmedValue && (
    isDirectVideoUrl(trimmedValue)
    || isYouTubeUrl(trimmedValue)
    || isVimeoUrl(trimmedValue)
  );
  const filteredItems = useMemo(() => {
    const items = sortLatestFirst(pickerItems);
    if (isPosterField) {
      return items.filter((item) => getItemType(item) === 'image');
    }
    if (!accept) return items;
    if (accept.includes('image') && !accept.includes('video')) {
      return items.filter((item) => getItemType(item) === 'image');
    }
    if (accept.includes('video') && !accept.includes('image')) {
      return items.filter((item) => getItemType(item) === 'video');
    }
    return items.filter((item) => ['image', 'video'].includes(getItemType(item)));
  }, [accept, isPosterField, pickerItems]);
  const showImageUploadButton = supportsImageUpload && (!supportsVideoUpload || isPosterField || !videoMode);
  const showVideoUploadButton = supportsVideoUpload && !isPosterField;
  const imageUploadLabel = isPosterField ? 'Upload Thumbnail Image' : 'Upload Image';

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSelectedVideoSize('');

    const validationError = validateImageUploadFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setUploadingImage(true);
      const result = await uploadAdminImageToR2({ file });
      const url = result?.media?.public_url || result?.media?.url || result?.url;
      if (!url) throw new Error('Upload did not return a media URL');
      onChange(url);
      onUploaded?.(result.media || { url, type: file.type, title: file.name });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(formatUploadError(error));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setSelectedVideoSize(formatMegabytes(file.size));
    const validationError = validateVideoUploadFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setUploadingVideo(true);
      setVideoProgress(0);
      const completed = await uploadAdminVideoToR2({
        file,
        purpose: videoUploadPurpose,
        slug: videoUploadSlug,
        title: file.name,
        allowBackendFallback: false,
        presignEndpoint: '/admin/uploads/presign-video',
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size || 1;
          setVideoProgress(Math.min(100, Math.round((progressEvent.loaded / total) * 100)));
        },
      });
      const url = completed?.media?.public_url || completed?.media?.url || completed?.url;
      onChange(url);
      onUploaded?.(completed?.media || { url, type: file.type, title: file.name });
      toast.success(completed?.message || 'Video uploaded');
    } catch (error) {
      console.warn('[admin/media] direct video upload failed', {
        stage: error?.stage || 'unknown',
        status: error?.response?.status || error?.originalError?.response?.status || null,
        detail: error?.response?.data?.detail || error?.originalError?.response?.data?.detail || error?.message || error,
      });
      toast.error(formatUploadError(error, 'Video upload failed'));
    } finally {
      setUploadingVideo(false);
      setVideoProgress(0);
    }
  };

  const openPicker = async () => {
    setPickerOpen(true);
    if (mediaItems.length) {
      setPickerItems(mediaItems);
      return;
    }
    try {
      setPickerLoading(true);
      const data = await fetchAdminMedia();
      setPickerItems(Array.isArray(data) ? data : []);
    } catch (_error) {
      toast.error('Media library could not be loaded');
    } finally {
      setPickerLoading(false);
    }
  };

  const resolvedHelperText = helperText || (
    isPosterField
      ? posterMessage
      : videoMode
      ? 'Paste YouTube/Vimeo/R2 video URL, or upload video directly to Cloudflare R2.'
      : `Use JPG/PNG/WebP images. Recommended compressed JPG/WebP under ${formatBytes(ADMIN_IMAGE_RECOMMENDED_BYTES)}. Hard image limit: ${formatMegabytes(ADMIN_IMAGE_UPLOAD_MAX_BYTES)}.`
  );

  return (
    <div>
      {label && <label className="mb-2 block text-sm font-semibold text-white">{label}</label>}
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`min-w-0 flex-1 rounded-2xl border bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500 ${posterValueInvalid ? 'border-amber-500' : 'border-slate-800'}`}
        />
        <div className="flex flex-wrap gap-2">
          {showImageUploadButton && (
            <label className={`${buttonClass} ${uploadingImage || uploadingVideo ? 'pointer-events-none opacity-60' : ''}`}>
              <Upload size={14} />
              {uploadingImage ? 'Uploading image...' : imageUploadLabel}
              <input
                type="file"
                accept={ADMIN_IMAGE_UPLOAD_ACCEPT}
                disabled={uploadingImage || uploadingVideo}
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
          {showVideoUploadButton && (
            <label className={`${buttonClass} ${uploadingImage || uploadingVideo ? 'pointer-events-none opacity-60' : ''}`}>
              <Video size={14} />
              {uploadingVideo ? `Uploading video ${videoProgress || 0}%` : 'Upload Video'}
              <input
                type="file"
                accept={ADMIN_VIDEO_UPLOAD_ACCEPT}
                disabled={uploadingImage || uploadingVideo}
                onChange={handleVideoUpload}
                className="hidden"
              />
            </label>
          )}
          <button type="button" onClick={openPicker} className={buttonClass}>
            Open Media Library
          </button>
          {isPosterField && (
            <button type="button" onClick={() => onChange('')} disabled={!value} className={buttonClass}>
              Clear Poster
            </button>
          )}
          <button type="button" onClick={() => onChange('')} disabled={!value} className={`${buttonClass} border-rose-500/30 text-rose-100 hover:border-rose-400`}>
            {isPosterField ? 'Clear URL' : 'Remove'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{resolvedHelperText}</p>
      {uploadingVideo && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-violet-500 transition-all" style={{ width: `${videoProgress || 0}%` }} />
        </div>
      )}
      {supportsVideoUpload && (
        <p className="mt-1 text-xs text-slate-500">
          Max video size: {formatMegabytes(ADMIN_VIDEO_UPLOAD_MAX_BYTES)}
          {selectedVideoSize ? ` - Selected video: ${selectedVideoSize}` : ''}
        </p>
      )}
      {supportsVideoUpload && (
        <p className="mt-1 text-xs text-slate-500">
          For YouTube/Vimeo, paste link in Media URL and leave Poster empty or upload an image thumbnail.
        </p>
      )}
      {supportsVideoUpload && (
        <p className="mt-1 text-xs text-slate-500">
          Cloudflare R2 CORS must allow PUT from https://pranvithdop.com and https://www.pranvithdop.com
        </p>
      )}
      {showPreview && <MediaPreview value={value} type={currentType} isPosterField={isPosterField} posterValueInvalid={posterValueInvalid} mediaValueIsSupportedVideo={mediaValueIsSupportedVideo} />}
      {pickerOpen && (
        <MediaPickerModal
          items={filteredItems}
          loading={pickerLoading}
          mode={mediaLibraryMode}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            if (isPosterField && getItemType(item) !== 'image') {
              toast.error('Poster must be an image.');
              return;
            }
            onChange(itemUrl(item));
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
};

const MediaPreview = ({ value, type, isPosterField, posterValueInvalid, mediaValueIsSupportedVideo }) => {
  if (!value) return <p className="mt-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-500">No media selected.</p>;
  if (posterValueInvalid) {
    return <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{posterMessage}</p>;
  }
  if (type === 'image' || isImageUrl(value)) {
    return (
      <img
        src={safeImageSrc(value)}
        alt="Media preview"
        className="mt-3 aspect-video w-full rounded-xl border border-slate-800 bg-slate-900 object-cover"
        onError={handleImageError}
      />
    );
  }
  if (type === 'video_file' || isDirectVideoUrl(value)) {
    return <video src={value} controls playsInline className="mt-3 aspect-video w-full rounded-xl border border-slate-800 bg-black object-contain" />;
  }
  if (type === 'video_url' || type === 'youtube' || type === 'vimeo' || mediaValueIsSupportedVideo) {
    return <p className="mt-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">Video URL detected. Public page will render the correct player for YouTube, Vimeo, or direct video URLs.</p>;
  }
  if (isPosterField) {
    return <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">{posterMessage}</p>;
  }
  return <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Unsupported or unsafe media URL.</p>;
};

const pickerTabsForMode = {
  poster: ['images'],
  image: ['images', 'all'],
  video: ['videos', 'all'],
};

const MediaPickerModal = ({ items, loading, mode = 'all', onClose, onSelect }) => {
  const availableTabs = pickerTabsForMode[mode] || ['all', 'images', 'videos'];
  const [activeTab, setActiveTab] = useState(availableTabs[0]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [copiedUrl, setCopiedUrl] = useState('');

  const visibleItems = useMemo(() => {
    const query = String(search || '').trim().toLowerCase();
    return items.filter((item) => {
      const type = getItemType(item);
      if (activeTab === 'images' && type !== 'image') return false;
      if (activeTab === 'videos' && type !== 'video') return false;
      if (!query) return true;
      return [
        itemName(item),
        itemMime(item),
        itemUrl(item),
        type,
      ].some((candidate) => String(candidate || '').toLowerCase().includes(query));
    });
  }, [activeTab, items, search]);

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success('Media URL copied');
    } catch (_error) {
      toast.error('Could not copy media URL');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur">
      <div className="max-h-[86vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Media Library</h3>
            <p className="mt-1 text-xs text-slate-500">Latest first with quick search, type tabs, copy, and select.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search filename, type, or URL"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-violet-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${activeTab === tab ? 'border-violet-500 bg-violet-500/10 text-violet-100' : 'border-slate-700 text-slate-200 hover:border-violet-500'}`}
                >
                  {tab === 'all' ? 'All' : tab === 'images' ? 'Images' : 'Videos'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setView('grid')} className={`rounded-lg border p-2 ${view === 'grid' ? 'border-violet-500 text-violet-100' : 'border-slate-700 text-slate-300'}`}>
                <Grid2X2 size={15} />
              </button>
              <button type="button" onClick={() => setView('list')} className={`rounded-lg border p-2 ${view === 'list' ? 'border-violet-500 text-violet-100' : 'border-slate-700 text-slate-300'}`}>
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
        <div className="max-h-[64vh] overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-slate-400">Loading media...</p>
          ) : visibleItems.length === 0 ? (
            <p className="text-sm text-slate-400">No matching media found.</p>
          ) : view === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <MediaPickerCard key={item.id || itemUrl(item)} item={item} copiedUrl={copiedUrl} onCopy={handleCopyUrl} onSelect={onSelect} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item) => (
                <MediaPickerRow key={item.id || itemUrl(item)} item={item} copiedUrl={copiedUrl} onCopy={handleCopyUrl} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MediaPickerPreview = ({ item }) => {
  const type = getItemType(item);
  const url = itemUrl(item);
  if (type === 'image') {
    return <img src={safeImageSrc(url)} alt={itemName(item)} className="h-full w-full object-cover" onError={handleImageError} />;
  }
  if (type === 'video') {
    return <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
  }
  return <ImageIcon size={28} className="text-slate-500" />;
};

const MediaPickerActions = ({ item, copiedUrl, onCopy, onSelect }) => {
  const url = itemUrl(item);
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onCopy(url)} className={buttonClass}>
        {copiedUrl === url ? <Check size={14} /> : <Copy size={14} />}
        {copiedUrl === url ? 'Copied' : 'Copy URL'}
      </button>
      <button type="button" onClick={() => onSelect(item)} className={`${buttonClass} border-violet-500 bg-violet-500/10 text-violet-100`}>
        Select
      </button>
    </div>
  );
};

const MediaPickerCard = ({ item, copiedUrl, onCopy, onSelect }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
    <div className="flex aspect-video items-center justify-center bg-slate-950">
      <MediaPickerPreview item={item} />
    </div>
    <div className="space-y-3 p-4">
      <div>
        <p className="truncate text-sm font-semibold text-white">{itemName(item)}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{getItemType(item)}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{itemMime(item) || itemUrl(item)}</p>
      </div>
      <MediaPickerActions item={item} copiedUrl={copiedUrl} onCopy={onCopy} onSelect={onSelect} />
    </div>
  </div>
);

const MediaPickerRow = ({ item, copiedUrl, onCopy, onSelect }) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 sm:flex-row sm:items-center">
    <div className="h-24 w-full overflow-hidden rounded-xl bg-slate-950 sm:w-40">
      <MediaPickerPreview item={item} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-white">{itemName(item)}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{getItemType(item)}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{itemMime(item) || itemUrl(item)}</p>
      <p className="mt-1 truncate text-xs text-slate-600">{itemUrl(item)}</p>
    </div>
    <MediaPickerActions item={item} copiedUrl={copiedUrl} onCopy={onCopy} onSelect={onSelect} />
  </div>
);

export default MediaUrlInput;
