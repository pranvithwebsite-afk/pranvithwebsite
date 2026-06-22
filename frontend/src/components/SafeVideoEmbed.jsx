import React from 'react';

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const DIRECT_VIDEO_EXT = /\.(mp4|webm|mov)(\?.*)?$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?.*)?$/i;

const isSafeRelativePath = (value) => {
  const raw = String(value || '').trim();
  return raw.startsWith('/') && !raw.startsWith('//') && !/[\u0000-\u001f]/.test(raw);
};

const parseSafeUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (isSafeRelativePath(raw)) {
    try {
      return new URL(raw, 'https://pranvithdop.local');
    } catch {
      return null;
    }
  }
  try {
    const parsed = new URL(raw);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
};

export const isSafeMediaUrl = (value) => !!parseSafeUrl(value);

const cleanVideoId = (value) => String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');

export const getYouTubeId = (url) => {
  const parsed = parseSafeUrl(url);
  if (!parsed) return '';
  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return '';

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    return cleanVideoId(parsed.pathname.split('/').filter(Boolean)[0]);
  }
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts[0] === 'embed' || parts[0] === 'shorts') return cleanVideoId(parts[1]);
  return cleanVideoId(parsed.searchParams.get('v'));
};

export const getVimeoId = (url) => {
  const parsed = parseSafeUrl(url);
  if (!parsed) return '';
  const host = parsed.hostname.toLowerCase();
  if (!VIMEO_HOSTS.has(host)) return '';
  const parts = parsed.pathname.split('/').filter(Boolean);
  const id = host === 'player.vimeo.com' && parts[0] === 'video' ? parts[1] : parts[0];
  return /^\d+$/.test(id || '') ? id : '';
};

export const isDirectVideoUrl = (url) => {
  const parsed = parseSafeUrl(url);
  return !!parsed && DIRECT_VIDEO_EXT.test(String(url || '').trim());
};

export const isImageUrl = (url) => {
  const parsed = parseSafeUrl(url);
  return !!parsed && IMAGE_EXT.test(String(url || '').trim());
};

export const detectMediaType = (url) => {
  const raw = String(url || '').trim();
  if (!raw || !isSafeMediaUrl(raw)) return '';
  if (isImageUrl(raw)) return 'image';
  if (isDirectVideoUrl(raw)) return 'video_file';
  if (getYouTubeId(raw) || getVimeoId(raw)) return 'video_url';
  return '';
};

export const getSafeVideoEmbedUrl = (videoType, videoUrl) => {
  const type = String(videoType || '').trim().toLowerCase();
  const url = String(videoUrl || '').trim();
  const youtubeId = (type === 'youtube' || type === 'video_url' || type === 'auto' || !type) ? getYouTubeId(url) : '';
  if (youtubeId) return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`;

  const vimeoId = (type === 'vimeo' || type === 'video_url' || type === 'auto' || !type) ? getVimeoId(url) : '';
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;

  return '';
};

const externalVideoLabel = (videoType, videoUrl) => {
  if (getYouTubeId(videoUrl) || String(videoType || '').toLowerCase() === 'youtube') return 'Watch on YouTube';
  return 'Open video';
};

const getSafeExternalUrl = (videoUrl) => {
  const raw = String(videoUrl || '').trim();
  if (isSafeRelativePath(raw)) return raw;
  const parsed = parseSafeUrl(raw);
  return parsed && parsed.origin !== 'https://pranvithdop.local' ? parsed.href : '';
};

const getSafePosterUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return getSafeExternalUrl(raw);
};

const SafeVideoEmbed = ({
  videoType,
  videoUrl,
  title = 'Video',
  poster = '',
  className = '',
}) => {
  const type = String(videoType || '').trim().toLowerCase();
  const embedUrl = getSafeVideoEmbedUrl(type, videoUrl);
  const directVideo = type === 'direct' || type === 'video_file' || isDirectVideoUrl(videoUrl);
  const externalUrl = getSafeExternalUrl(videoUrl);
  const posterUrl = getSafePosterUrl(poster);
  const wrapperClass = `relative aspect-video overflow-hidden rounded-[inherit] bg-black ${className}`.trim();

  if (directVideo && externalUrl) {
    return (
      <video
        src={externalUrl}
        poster={posterUrl || undefined}
        controls
        playsInline
        preload="metadata"
        className={`${wrapperClass} h-full w-full object-contain`}
      />
    );
  }

  if (embedUrl) {
    return (
      <div className={wrapperClass}>
        {posterUrl && <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" loading="lazy" />}
        <iframe
          title={title}
          src={embedUrl}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-600"
          >
            {externalVideoLabel(type, videoUrl)}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={`${wrapperClass} flex min-h-[220px] items-center justify-center border border-white/10 text-center text-sm text-white/60`}>
      <div className="px-6">
        <p>Video unavailable</p>
        {externalUrl && (
          <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500">
            {externalVideoLabel(type, videoUrl)}
          </a>
        )}
      </div>
    </div>
  );
};

export default SafeVideoEmbed;
