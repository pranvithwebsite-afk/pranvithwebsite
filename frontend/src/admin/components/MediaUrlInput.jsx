import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, Upload, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  createAdminDirectVideoUpload,
  fetchAdminMedia,
  finalizeAdminDirectVideoUpload,
  uploadAdminImageToR2,
  uploadFileToSignedUrl,
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

const videoMediaTypes = new Set(['video_file', 'video_url', 'youtube', 'vimeo', 'direct']);
const posterFieldPattern = /(poster|thumbnail)/i;

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
  const videoMode = supportsVideoUpload && (videoMediaTypes.has(normalizedMediaType) || videoMediaTypes.has(currentType));
  const trimmedValue = String(value || '').trim();
  const posterValueInvalid = isPosterField && trimmedValue && !isImageUrl(trimmedValue);
  const mediaValueIsSupportedVideo = !!trimmedValue && (
    isDirectVideoUrl(trimmedValue)
    || isYouTubeUrl(trimmedValue)
    || isVimeoUrl(trimmedValue)
  );

  const filteredItems = useMemo(() => {
    if (!accept) return pickerItems;
    if (accept.includes('image') && !accept.includes('video')) {
      return pickerItems.filter((item) => String(itemMime(item)).startsWith('image/') || item.media_type === 'image');
    }
    if (accept.includes('video') && !accept.includes('image')) {
      return pickerItems.filter((item) => String(itemMime(item)).startsWith('video/') || item.media_type === 'video');
    }
    return pickerItems;
  }, [accept, pickerItems]);

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
      const signed = await createAdminDirectVideoUpload({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
        purpose: videoUploadPurpose,
        slug: videoUploadSlug,
      });
      await uploadFileToSignedUrl({
        uploadUrl: signed.upload_url,
        file,
        headers: {
          'Content-Type': file.type,
          ...(signed.required_headers || signed.headers || {}),
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size || 1;
          setVideoProgress(Math.min(100, Math.round((progressEvent.loaded / total) * 100)));
        },
      });
      const completed = await finalizeAdminDirectVideoUpload({
        key: signed.key,
        url: signed.public_url,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        purpose: videoUploadPurpose,
        title: file.name,
      });
      const url = completed?.media?.public_url || completed?.media?.url || completed?.url || signed.public_url;
      onChange(url);
      onUploaded?.(completed?.media || { url, type: file.type, title: file.name });
      toast.success('Video uploaded directly to Cloudflare R2');
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
      ? 'Poster/thumbnail must be an image URL. For YouTube videos, leave poster empty or upload a thumbnail image.'
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
          {supportsImageUpload && (
            <label className={`${buttonClass} ${uploadingImage || uploadingVideo ? 'pointer-events-none opacity-60' : ''}`}>
              <Upload size={14} />
              {uploadingImage ? 'Uploading image...' : 'Upload Image/Thumbnail'}
              <input
                type="file"
                accept={ADMIN_IMAGE_UPLOAD_ACCEPT}
                disabled={uploadingImage || uploadingVideo}
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
          {supportsVideoUpload && (
            <label className={`${buttonClass} ${uploadingImage || uploadingVideo ? 'pointer-events-none opacity-60' : ''}`}>
              <Video size={14} />
              {uploadingVideo ? `Uploading video ${videoProgress || 0}%` : 'Upload Video to R2'}
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
            Select
          </button>
          <button type="button" onClick={() => onChange('')} disabled={!value} className={`${buttonClass} border-rose-500/30 text-rose-100 hover:border-rose-400`}>
            Remove
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
          For R2 upload, bucket CORS must allow PUT from pranvithdop.com and localhost.
        </p>
      )}
      {showPreview && <MediaPreview value={value} type={currentType} isPosterField={isPosterField} posterValueInvalid={posterValueInvalid} mediaValueIsSupportedVideo={mediaValueIsSupportedVideo} />}
      {pickerOpen && (
        <MediaPickerModal
          items={filteredItems}
          loading={pickerLoading}
          onClose={() => setPickerOpen(false)}
          onSelect={(url) => {
            onChange(url);
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
    return <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Poster/thumbnail must be an image URL. For YouTube videos, leave poster empty or upload a thumbnail image.</p>;
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
    return <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Poster/thumbnail must be an image URL. For YouTube videos, leave poster empty or upload a thumbnail image.</p>;
  }
  return <p className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Unsupported or unsafe media URL.</p>;
};

const MediaPickerModal = ({ items, loading, onClose, onSelect }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur">
    <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <h3 className="text-lg font-semibold text-white">Select from Media Library</h3>
        <button type="button" onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 hover:text-white">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-[64vh] overflow-y-auto p-5">
        {loading ? (
          <p className="text-sm text-slate-400">Loading media...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400">No matching media found.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id || itemUrl(item)}
                type="button"
                onClick={() => onSelect(itemUrl(item))}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-left transition hover:border-violet-500"
              >
                <div className="flex aspect-video items-center justify-center bg-slate-950">
                  {String(itemMime(item)).startsWith('image/') || item.media_type === 'image' ? (
                    <img src={safeImageSrc(itemUrl(item))} alt={item.title || 'Media'} className="h-full w-full object-cover" onError={handleImageError} />
                  ) : (
                    <ImageIcon size={28} className="text-slate-500" />
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-white">{item.title || item.original_filename || item.filename || 'Media'}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{itemMime(item) || itemUrl(item)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default MediaUrlInput;
