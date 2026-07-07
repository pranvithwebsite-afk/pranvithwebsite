import React, { useEffect, useMemo, useState } from 'react';
import { Upload, Copy, Trash2, FileArchive, FileText, Image as ImageIcon, Video, RefreshCw } from 'lucide-react';
import {
  createAdminDirectVideoUpload,
  deleteAdminMedia,
  fetchAdminMedia,
  fetchAdminMediaUsage,
  finalizeAdminDirectVideoUpload,
  removeDuplicateAdminMedia,
  uploadAdminFile,
  uploadAdminImageToR2,
import { uploadMultipleFiles } from '../../lib/mediaUploads';
import { toast } from 'sonner';
import { handleImageError, safeImageSrc } from '../../lib/utils';
import { useAdminConfirm } from '../components/AdminConfirmProvider';
import {
  validateImageUploadFile,
  ADMIN_VIDEO_UPLOAD_MAX_BYTES,
  formatMegabytes,
  formatUploadError,
  isVideoUploadFile,
  validateVideoUploadFile,
} from '../../lib/mediaUpload';

const formatFileSize = (bytes = 0) => {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-IN', { dateStyle: 'medium' });
};

const mediaUrl = (item = {}) => item.public_url || item.url || '';
const mediaMime = (item = {}) => item.type || item.mime_type || '';
const mediaSize = (item = {}) => Number(item.size || item.size_bytes || 0);

const mediaStableKey = (item = {}) => {
  const url = String(mediaUrl(item) || '').trim().toLowerCase();
  if (url) return `url:${url}`;
  const filename = String(item.original_filename || item.filename || item.title || '').trim().toLowerCase();
  if (filename) return `file:${filename}|${mediaSize(item)}`;
  return `id:${String(item.id || '').trim()}`;
};

const dedupeMediaItems = (items = []) => {
  const seen = new Set();
  const unique = [];
  let duplicatesHidden = 0;

  for (const item of items) {
    const key = mediaStableKey(item);
    if (!key) continue;
    if (seen.has(key)) {
      duplicatesHidden += 1;
      continue;
    }
    seen.add(key);
    unique.push(item);
  }

  return { unique, duplicatesHidden };
};

const Media = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedVideoSize, setSelectedVideoSize] = useState('');
  const [deduping, setDeduping] = useState(false);
  const confirm = useAdminConfirm();

  const visibleMediaState = useMemo(() => dedupeMediaItems(media), [media]);
  const visibleMedia = visibleMediaState.unique;
  const duplicatesHidden = visibleMediaState.duplicatesHidden;

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async ({ notifyOnError = true } = {}) => {
    try {
      setLoading(true);
      const data = await fetchAdminMedia();
      setMedia(Array.isArray(data) ? data : []);
      setError('');
      return { ok: true, items: Array.isArray(data) ? data : [] };
    } catch (error) {
      console.error('[admin/media] Failed to load media', error?.response?.data?.detail || error?.message || error);
      if (notifyOnError) toast.error('Failed to load media');
      setError('Media library could not be loaded.');
      setMedia([]);
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  };

  const handleFilesSelected = async (files) => {
    if (!files.length) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus(`Starting upload of ${files.length} files...`);

    const { results, errors } = await uploadMultipleFiles({
      files,
      purpose: 'media-library',
      onProgress: ({ overallProgress, fileProgress, currentFile, totalFiles, currentFileName, stage }) => {
        setUploadProgress(overallProgress);
        const stageMessage = stage === 'presign' ? 'securing connection' : stage;
        setUploadStatus(`Uploading ${currentFile} of ${totalFiles}: ${currentFileName} (${stageMessage} ${Math.round(fileProgress)}%)...`);
      },
    });

    setUploading(false);
    setUploadProgress(0);
    setUploadStatus('');

    if (results.length > 0) {
      toast.success(`${results.length} file(s) uploaded successfully.`);
    }

    if (errors.length > 0) {
      errors.forEach(({ file, error }) => {
        toast.error(`Failed to upload ${file}: ${error}`);
      });
    }

    await loadMedia({ notifyOnError: false });
  };

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    handleFilesSelected(files);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    handleFilesSelected(files);
  };

  const handleDelete = async (item) => {
    const name = item?.title || item?.filename || 'this media file';
    const usage = await fetchAdminMediaUsage(item.id).catch(() => ({ used: false, locations: [] }));
    const usageLines = Array.isArray(usage?.locations) ? usage.locations.slice(0, 4) : [];
    await confirm({
      title: 'Delete media?',
      itemName: name,
      message: usage?.used
        ? `This media may be used on the website. If it is still referenced, deletion will be blocked to keep the website safe.${usageLines.length ? `\n\nUsed in:\n${usageLines.join('\n')}` : ''}`
        : 'Delete this media file from the library. This action cannot be undone.',
      confirmText: 'Delete',
      loadingText: 'Deleting...',
      onConfirm: async () => {
        try {
          const result = await deleteAdminMedia(item.id);
          toast[result?.warning ? 'warning' : 'success'](result?.warning || 'Media deleted');
          setMedia((items) => items.filter((mediaItem) => mediaItem.id !== item.id));
        } catch (error) {
          const detail = error?.response?.data?.detail || 'Failed to delete media';
          toast.error(error?.response?.status === 409
            ? `This media is currently used on the website and cannot be deleted.${usageLines.length ? ` Used in: ${usageLines.join(', ')}` : ''}`
            : detail);
          return false;
        }
        return true;
      },
    });
  };

  const handleRemoveDuplicates = async () => {
    if (deduping) return;
    await confirm({
      title: 'Remove duplicates?',
      itemName: 'Media Library records',
      message: 'Keep the newest record in each duplicate group and remove the extra database records only. This will not delete Cloudflare R2 files.',
      confirmText: 'Remove duplicates',
      loadingText: 'Removing...',
      onConfirm: async () => {
        try {
          setDeduping(true);
          const result = await removeDuplicateAdminMedia();
          await loadMedia({ notifyOnError: false });
          toast.success(result?.deleted_records
            ? `Removed ${result.deleted_records} duplicate media record${result.deleted_records === 1 ? '' : 's'}.`
            : 'No duplicate media records were found.');
        } catch (error) {
          toast.error(error?.response?.data?.detail || 'Could not remove duplicate media records');
          return false;
        } finally {
          setDeduping(false);
        }
        return true;
      },
    });
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied!');
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Media Library</h1>
            <p className="mt-3 text-slate-400">Upload and manage images, videos, and files.</p>
            {duplicatesHidden > 0 && (
              <p className="mt-2 text-sm text-amber-200">
                Showing {visibleMedia.length} unique items. {duplicatesHidden} duplicate record{duplicatesHidden === 1 ? '' : 's'} hidden.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemoveDuplicates}
            disabled={deduping || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={14} className={deduping ? 'animate-spin' : ''} />
            {deduping ? 'Removing duplicates...' : 'Remove duplicates'}
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="rounded-3xl border-2 border-dashed bg-slate-950/50 p-8">
        <label
          className={`flex flex-col items-center gap-3 cursor-pointer transition ${dragActive ? 'border-violet-400 bg-slate-900/80' : 'border-slate-700'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
            <Upload size={28} className="text-violet-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">
              {uploading ? 'Uploading...' : 'Click to upload or drag & drop'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Images, Videos, PDFs, ZIP files.
            </p>
            {uploading && (
              <>
                <p className="text-sm text-violet-300 mt-2">{uploadStatus}</p>
                <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-800 mt-2">
                  <div className="h-full bg-violet-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Max video size: {formatMegabytes(ADMIN_VIDEO_UPLOAD_MAX_BYTES)}
            </p>
          </div>
          <input
            type="file"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
            accept="image/*,video/*,.pdf,.zip"
          />
        </label>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-950" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-rose-100">{error}</div>
      ) : visibleMedia.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-400">No files uploaded yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleMedia.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onDelete={() => handleDelete(item)}
              onCopyUrl={() => copyToClipboard(mediaUrl(item))}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const MediaCard = ({ item, onDelete, onCopyUrl }) => {
  const mime = mediaMime(item);
  const url = mediaUrl(item);
  const isImage = mime.startsWith('image/') || item.media_type === 'image';
  const isVideo = mime.startsWith('video/') || item.media_type === 'video';
  const isPdf = mime === 'application/pdf';
  const isZip = mime.includes('zip');

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden hover:border-slate-700 transition">
      {/* Preview */}
      <div className="relative aspect-square bg-slate-900 flex items-center justify-center overflow-hidden group">
        {isImage ? (
          <img
            src={safeImageSrc(url)}
            alt={item.title || item.original_filename || item.filename || 'Media'}
            className="w-full h-full object-cover group-hover:scale-105 transition"
            onError={handleImageError}
          />
        ) : isVideo ? (
          <video
            src={url}
            className="w-full h-full object-cover"
            controls
          />
        ) : (
          <div className="text-center">
            {isPdf ? <FileText size={36} className="text-slate-500 mx-auto mb-2" /> : isZip ? <FileArchive size={36} className="text-slate-500 mx-auto mb-2" /> : <Video size={36} className="text-slate-500 mx-auto mb-2" />}
            <p className="text-xs text-slate-500">{(item.type || 'file').split('/').pop().toUpperCase()}</p>
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
          <button
            onClick={onCopyUrl}
            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition"
            title="Copy URL"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={onDelete}
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold text-white truncate">{item.title || item.original_filename || item.filename}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{mime || item.media_type}</p>
        <p className="mt-1 text-xs text-slate-500">{formatFileSize(item.size)} | {formatDate(item.uploaded_at)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={onCopyUrl}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition"
          >
            Copy URL
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 rounded border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-100 text-xs font-semibold transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default Media;
