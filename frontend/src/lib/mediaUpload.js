export const ADMIN_IMAGE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
export const ADMIN_VIDEO_UPLOAD_MAX_BYTES = 200 * 1024 * 1024;
export const ADMIN_IMAGE_RECOMMENDED_BYTES = 300 * 1024;

export const ADMIN_IMAGE_UPLOAD_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
export const ADMIN_VIDEO_UPLOAD_ACCEPT = '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime,video/mov';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/mov']);

const bytesToUnit = (value, divisor, unit) => `${(value / divisor).toFixed(1)} ${unit}`;

export const formatBytes = (bytes = 0) => {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  if (value < 1024 * 1024 * 1024) return bytesToUnit(value, 1024 * 1024, 'MB');
  return bytesToUnit(value, 1024 * 1024 * 1024, 'GB');
};

export const formatMegabytes = (bytes = 0) => `${((Number(bytes) || 0) / (1024 * 1024)).toFixed(1)} MB`;

const getExtension = (filename = '') => {
  const clean = String(filename || '').trim().toLowerCase();
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot) : '';
};

export const isVideoUploadFile = (file) => {
  const extension = getExtension(file?.name);
  return VIDEO_EXTENSIONS.has(extension) || VIDEO_MIME_TYPES.has(String(file?.type || '').toLowerCase());
};

export const validateImageUploadFile = (file) => {
  if (!file) return 'Choose an image file first.';
  if (isVideoUploadFile(file)) {
    return 'Video is too large for this upload method. Use Upload Video to R2 or paste a YouTube/Vimeo/R2 URL.';
  }
  const extension = getExtension(file.name);
  const mimeType = String(file.type || '').toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension) || !IMAGE_MIME_TYPES.has(mimeType)) {
    return 'Unsupported image type. Allowed: JPG, JPEG, PNG, WEBP.';
  }
  if (file.size > ADMIN_IMAGE_UPLOAD_MAX_BYTES) {
    return `Image is ${formatMegabytes(file.size)}. Keep thumbnails under ${formatMegabytes(ADMIN_IMAGE_UPLOAD_MAX_BYTES)}.`;
  }
  return '';
};

export const validateVideoUploadFile = (file) => {
  if (!file) return 'Choose a video file first.';
  const extension = getExtension(file.name);
  const mimeType = String(file.type || '').toLowerCase();
  if (!VIDEO_EXTENSIONS.has(extension) || !VIDEO_MIME_TYPES.has(mimeType)) {
    return 'Unsupported video type. Allowed: MP4, WEBM, MOV.';
  }
  if (file.size > ADMIN_VIDEO_UPLOAD_MAX_BYTES) {
    return `Video is ${formatMegabytes(file.size)}. Maximum allowed video size is ${formatMegabytes(ADMIN_VIDEO_UPLOAD_MAX_BYTES)}. Please compress the video or upload it manually to Cloudflare R2/YouTube and paste the URL.`;
  }
  return '';
};

export const formatUploadError = (error, fallback = 'Upload failed') => {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail || error?.message || fallback;
  if (error?.stage === 'presign') {
    if (status === 500 && /Cloudflare R2 is not configured/i.test(String(detail))) {
      return 'Cloudflare R2 is not configured. Please add R2 environment variables.';
    }
    return 'Could not create R2 upload URL. Check backend R2 configuration.';
  }
  if (error?.stage === 'r2_put') {
    return 'Video upload to R2 failed. Check Cloudflare R2 CORS settings.';
  }
  if (status === 413) {
    return 'This video is too large for normal upload. Upload directly to Cloudflare R2 or paste a YouTube/Vimeo/R2 URL.';
  }
  if (status === 500 && /Cloudflare R2 is not configured/i.test(String(detail))) {
    return 'Cloudflare R2 is not configured. Please add R2 environment variables.';
  }
  return detail;
};
