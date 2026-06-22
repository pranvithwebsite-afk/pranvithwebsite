import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminMedia, uploadAdminFile } from '../../lib/api';
import { detectMediaType, isDirectVideoUrl, isImageUrl } from '../../components/SafeVideoEmbed';
import { handleImageError, safeImageSrc } from '../../lib/utils';

const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-white transition hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60';

const itemUrl = (item = {}) => item.public_url || item.url || '';
const itemMime = (item = {}) => item.type || item.mime_type || '';

const MediaUrlInput = ({
  label,
  value,
  onChange,
  accept = 'image/*,video/*',
  placeholder = 'Paste media URL',
  helperText = '',
  showPreview = true,
  mediaType,
  mediaItems = [],
  onUploaded,
}) => {
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerItems, setPickerItems] = useState(mediaItems);
  const [pickerLoading, setPickerLoading] = useState(false);
  const currentType = mediaType || detectMediaType(value);

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

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      const result = await uploadAdminFile(file);
      const url = result?.media?.public_url || result?.media?.url || result?.url;
      if (!url) throw new Error('Upload did not return a media URL');
      onChange(url);
      onUploaded?.(result.media || { url, type: file.type, title: file.name });
      toast.success('Media uploaded');
    } catch (error) {
      toast.error(error?.response?.data?.detail || error?.message || 'Upload failed');
    } finally {
      setUploading(false);
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
    } catch (error) {
      toast.error('Media library could not be loaded');
    } finally {
      setPickerLoading(false);
    }
  };

  return (
    <div>
      {label && <label className="mb-2 block text-sm font-semibold text-white">{label}</label>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
        />
        <label className={buttonClass}>
          <Upload size={14} />
          {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" accept={accept} disabled={uploading} onChange={handleUpload} className="hidden" />
        </label>
        <button type="button" onClick={openPicker} className={buttonClass}>
          Select
        </button>
        <button type="button" onClick={() => onChange('')} disabled={!value} className={`${buttonClass} border-rose-500/30 text-rose-100 hover:border-rose-400`}>
          Remove
        </button>
      </div>
      {helperText && <p className="mt-2 text-xs text-slate-500">{helperText}</p>}
      {showPreview && <MediaPreview value={value} type={currentType} />}
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

const MediaPreview = ({ value, type }) => {
  if (!value) return <p className="mt-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-500">No media selected.</p>;
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
    return <video src={value} controls className="mt-3 aspect-video w-full rounded-xl border border-slate-800 bg-black object-contain" />;
  }
  if (type === 'video_url') {
    return <p className="mt-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-100">Video URL detected. Public page will render the video player.</p>;
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
