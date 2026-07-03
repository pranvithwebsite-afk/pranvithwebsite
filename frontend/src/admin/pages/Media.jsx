import React, { useEffect, useState } from 'react';
import { Upload, Copy, Trash2, FileArchive, FileText, Image as ImageIcon, Video } from 'lucide-react';
import {
  createAdminDirectVideoUpload,
  deleteAdminMedia,
  fetchAdminMedia,
  finalizeAdminDirectVideoUpload,
  uploadAdminFile,
  uploadFileToSignedUrl,
} from '../../lib/api';
import { toast } from 'sonner';
import { handleImageError, safeImageSrc } from '../../lib/utils';
import {
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

const Media = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedVideoSize, setSelectedVideoSize] = useState('');

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminMedia();
      setMedia(Array.isArray(data) ? data : []);
      setError('');
    } catch (error) {
      console.error('[admin/media] Failed to load media', error?.response?.data?.detail || error?.message || error);
      toast.error('Failed to load media');
      setError('Media library could not be loaded.');
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'video/mov', 'application/pdf', 'application/zip', 'application/x-zip-compressed'];
    if (!validTypes.includes(file.type)) return 'Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WEBM, MOV, PDF, ZIP';
    if (!isVideoUploadFile(file) && file.size > 25 * 1024 * 1024) return 'File exceeds the 25 MB upload limit';
    return '';
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!isVideoUploadFile(file)) setSelectedVideoSize('');
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      let result;
      if (isVideoUploadFile(file)) {
        setSelectedVideoSize(formatMegabytes(file.size));
        const videoError = validateVideoUploadFile(file);
        if (videoError) {
          toast.error(videoError);
          return;
        }
        const signed = await createAdminDirectVideoUpload({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          purpose: 'media-library-video',
        });
        await uploadFileToSignedUrl({
          uploadUrl: signed.upload_url,
          file,
          headers: signed.headers,
          onUploadProgress: (event) => {
            const total = event.total || file.size || 1;
            setUploadProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
          },
        });
        result = await finalizeAdminDirectVideoUpload({
          key: signed.key,
          url: signed.public_url,
          filename: file.name,
          contentType: file.type,
          size: file.size,
          purpose: 'media-library-video',
          title: file.name,
        });
      } else {
        result = await uploadAdminFile(file, (event) => {
          const total = event.total || file.size || 1;
          setUploadProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
        });
      }
      if (result.success) {
        toast.success('File uploaded successfully');
        loadMedia();
      }
    } catch (error) {
      toast.error(formatUploadError(error));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleDelete = async (item) => {
    const name = item?.title || item?.filename || 'this media file';
    if (!window.confirm(`Are you sure you want to delete this media file?\n\n${name}`)) return;
    try {
      await deleteAdminMedia(item.id);
      toast.success('Media deleted');
      setMedia((items) => items.filter((mediaItem) => mediaItem.id !== item.id));
    } catch (error) {
      const detail = error?.response?.data?.detail || 'Failed to delete media';
      toast.error(error?.response?.status === 409 ? 'This media is used on the website. Remove it first.' : detail);
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied!');
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Media Library</h1>
        <p className="mt-3 text-slate-400">Upload and manage images, videos, and files.</p>
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
              Images, Videos, PDFs, ZIP files. Normal uploads max 25MB. Videos go direct to R2.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Max video size: {formatMegabytes(ADMIN_VIDEO_UPLOAD_MAX_BYTES)}
              {selectedVideoSize ? ` • Selected video: ${selectedVideoSize}` : ''}
            </p>
          </div>
          {uploading && (
            <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-violet-500 transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
          <input
            type="file"
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
      ) : media.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-400">No files uploaded yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {media.map((item) => (
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
