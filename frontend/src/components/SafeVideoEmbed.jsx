import React, { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
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
  if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live' || parts[0] === 'v') return cleanVideoId(parts[1]);
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

export const isYouTubeUrl = (url) => !!getYouTubeId(url);

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
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`;

  const vimeoId = (type === 'vimeo' || type === 'video_url' || type === 'auto' || !type) ? getVimeoId(url) : '';
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;

  return '';
};

export const extractYouTubeId = getYouTubeId;

export const getYouTubeEmbedUrl = (url) => getSafeVideoEmbedUrl('youtube', url);

export const getYouTubeThumbnail = (url, quality = 'maxresdefault') => {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : '';
};

const withAutoplay = (url) => {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}autoplay=1`;
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
  posterUrl = '',
  className = '',
  aspectRatio = 'aspect-video',
  autoplayOnClick = true,
  showPlayOverlay = true,
  loadWhenVisible = true,
}) => {
  const [activated, setActivated] = useState(!showPlayOverlay);
  const [nearViewport, setNearViewport] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [youtubeMaxFailed, setYoutubeMaxFailed] = useState(false);
  const [thumbnailUnavailable, setThumbnailUnavailable] = useState(false);
  const type = String(videoType || '').trim().toLowerCase();
  const embedUrl = getSafeVideoEmbedUrl(type, videoUrl);
  const directVideo = type === 'direct' || type === 'video_file' || isDirectVideoUrl(videoUrl);
  const externalUrl = getSafeExternalUrl(videoUrl);
  const safePosterUrl = getSafePosterUrl(posterUrl || poster);
  const youtubeThumbnail = !safePosterUrl || posterFailed ? getYouTubeThumbnail(videoUrl, youtubeMaxFailed ? 'hqdefault' : 'maxresdefault') : '';
  const thumbnailUrl = thumbnailUnavailable ? '' : (safePosterUrl && !posterFailed ? safePosterUrl : youtubeThumbnail);
  const wrapperClass = `group relative ${aspectRatio || 'aspect-video'} overflow-hidden rounded-[inherit] border border-violet-500/15 bg-black ${className}`.trim();
  const frameRef = useRef(null);
  const shouldLoadPlayer = activated || (loadWhenVisible && nearViewport);
  const allowAutoplay = autoplayOnClick && !isMobile;

  useEffect(() => {
    setIsMobile(window.matchMedia?.('(max-width: 767px)').matches || false);
  }, []);

  useEffect(() => {
    if (!loadWhenVisible || nearViewport || !frameRef.current) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '360px 0px' }
    );
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [loadWhenVisible, nearViewport]);

  if (shouldLoadPlayer && directVideo && externalUrl) {
    return (
      <div ref={frameRef} className={wrapperClass}>
        <video
          src={externalUrl}
          poster={safePosterUrl || undefined}
          controls
          autoPlay={allowAutoplay}
          playsInline
          preload={activated ? 'metadata' : 'none'}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>
    );
  }

  if (shouldLoadPlayer && embedUrl) {
    return (
      <div ref={frameRef} className={wrapperClass}>
        <iframe
          title={title}
          src={allowAutoplay && activated ? withAutoplay(embedUrl) : embedUrl}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if ((embedUrl || (directVideo && externalUrl)) && showPlayOverlay) {
    return (
      <button
        ref={frameRef}
        type="button"
        onClick={() => setActivated(true)}
        className={`${wrapperClass} block w-full text-left`}
        aria-label={`Play ${title}`}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => {
              if (safePosterUrl && !posterFailed) setPosterFailed(true);
              else if (youtubeThumbnail && !youtubeMaxFailed) setYoutubeMaxFailed(true);
              else setThumbnailUnavailable(true);
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(124,58,237,0.35),transparent_38%),linear-gradient(135deg,#1a0a3a,#0f0625_52%,#070314)]" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-violet-600 text-white shadow-[0_0_35px_rgba(139,92,246,0.75)] transition group-hover:scale-110 group-hover:bg-violet-500 sm:h-20 sm:w-20">
          <Play size={28} fill="currentColor" className="ml-1" />
        </span>
        <span className="absolute bottom-4 left-4 right-4 line-clamp-2 text-sm font-semibold text-white drop-shadow md:text-base">
          {title}
        </span>
      </button>
    );
  }

  return (
    <div ref={frameRef} className={`${wrapperClass} flex min-h-[220px] items-center justify-center border border-white/10 text-center text-sm text-white/60`}>
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
