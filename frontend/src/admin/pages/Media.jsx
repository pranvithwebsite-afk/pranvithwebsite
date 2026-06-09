import React, { useEffect, useState } from 'react';
import { Upload, Copy, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { fetchAdminMedia, uploadAdminFile, deleteAdminMedia } from '../../lib/api';
import { toast } from 'sonner';

const Media = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminMedia();
      setMedia(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load media');
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf', 'application/zip'];
    return validTypes.includes(file.type);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!validateFile(file)) {
      toast.error('Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, MP4, PDF, ZIP');
      return;
    }

    try {
      setUploading(true);
      const result = await uploadAdminFile(file);
      if (result.success) {
        toast.success('File uploaded successfully');
        loadMedia();
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await deleteAdminMedia(id);
      toast.success('File deleted');
      loadMedia();
    } catch (error) {
      toast.error('Failed to delete file');
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
              Images, Videos, PDFs, ZIP files (Max 50MB)
            </p>
          </div>
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
        <div className="text-center text-slate-400">Loading media...</div>
      ) : media.length === 0 ? (
        <div className="text-center text-slate-400">No files uploaded yet</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {media.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onDelete={() => handleDelete(item.id)}
              onCopyUrl={() => copyToClipboard(item.url)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const MediaCard = ({ item, onDelete, onCopyUrl }) => {
  const isImage = item.type.startsWith('image/');
  const isVideo = item.type.startsWith('video/');

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden hover:border-slate-700 transition">
      {/* Preview */}
      <div className="relative aspect-square bg-slate-900 flex items-center justify-center overflow-hidden group">
        {isImage ? (
          <img
            src={item.url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition"
          />
        ) : isVideo ? (
          <video
            src={item.url}
            className="w-full h-full object-cover"
            controls
          />
        ) : (
          <div className="text-center">
            <ImageIcon size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">{item.type.split('/')[1].toUpperCase()}</p>
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
          <button
            onClick={onCopyUrl}
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition"
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
        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
        <p className="text-xs text-slate-500 mt-1">
          {new Date(item.uploaded_at).toLocaleDateString()}
        </p>
        <button
          onClick={onCopyUrl}
          className="mt-2 w-full px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition"
        >
          Copy URL
        </button>
      </div>
    </div>
  );
};

export default Media;
