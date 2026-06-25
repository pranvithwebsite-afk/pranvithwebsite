import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Play, Sparkles, X } from 'lucide-react';
import { handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';
import { fetchPublicSettings } from '../lib/api';
import SafeVideoEmbed, { detectMediaType, getYouTubeThumbnail, isDirectVideoUrl } from './SafeVideoEmbed';

const fallbackHero = {
  badge_text: 'Learn premium editing, LUTs, transitions, and storytelling workflows that get results.',
  hero_title: 'Video Editing Mastery for Creators',
  hero_subtitle: 'Master the art of video editing with our comprehensive courses. From beginner basics to advanced techniques, learn professional editing skills that transform your creative vision into stunning reality.',
  primary_button_text: 'Explore Assets',
  primary_button_link: '/assets',
  secondary_button_text: 'Join Community',
  secondary_button_link: '/courses',
  hero_media_type: 'auto',
  hero_media_url: '',
  hero_media_poster_url: '',
  hero_media_autoplay: true,
  hero_media_muted: true,
  hero_media_loop: true,
};

const cleanText = (value) => (typeof value === 'string' && value.trim() ? value : undefined);
const compactObject = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));

const Hero = ({ pageData }) => {
  const [settingsHero, setSettingsHero] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const hasCmsHero = !!pageData;

  useEffect(() => {
    if (hasCmsHero) {
      setSettingsHero(null);
      return undefined;
    }

    let mounted = true;
    fetchPublicSettings()
      .then((settings) => {
        if (mounted) setSettingsHero(settings?.home_hero || null);
      })
      .catch(() => {
        if (mounted) setSettingsHero(null);
      });
    return () => {
      mounted = false;
    };
  }, [hasCmsHero]);

  const cmsHero = pageData ? compactObject({
    badge_text: cleanText(pageData.badgeText),
    hero_title: cleanText(pageData.headline),
    hero_subtitle: cleanText(pageData.subheadline),
    primary_button_text: cleanText(pageData.buttonText),
    primary_button_link: cleanText(pageData.buttonUrl),
    secondary_button_text: cleanText(pageData.secondaryButtonText),
    secondary_button_link: cleanText(pageData.secondaryButtonUrl),
    hero_media_type: cleanText(pageData.mediaType),
    hero_media_url: cleanText(pageData.videoUrl || pageData.image),
    hero_media_poster_url: cleanText(pageData.posterUrl || pageData.thumbnailUrl || pageData.imageUrl),
  }) : {};
  const hero = { ...fallbackHero, ...(settingsHero || {}), ...cmsHero };
  const rawMediaUrl = hero.hero_media_url || '';
  const explicitMediaType = hero.hero_media_type || 'auto';
  const detectedMediaType = explicitMediaType === 'auto' ? detectMediaType(rawMediaUrl) : explicitMediaType;
  const videoMediaTypes = new Set(['video_file', 'video_url', 'youtube', 'vimeo']);
  const videoUrl = cleanText(pageData?.videoUrl) || (videoMediaTypes.has(detectedMediaType) ? rawMediaUrl : '');
  const imageUrl = cleanText(pageData?.imageUrl) || (!videoUrl ? rawMediaUrl : '');
  const posterUrl = hero.hero_media_poster_url || cleanText(pageData?.thumbnailUrl) || cleanText(pageData?.imageUrl) || getYouTubeThumbnail(videoUrl, 'maxresdefault');
  const mediaType = videoUrl
    ? (detectedMediaType === 'auto' || detectedMediaType === 'image' ? detectMediaType(videoUrl) : detectedMediaType)
    : detectedMediaType;
  const hasVideo = !!videoUrl;
  const hasMedia = !!(videoUrl || imageUrl || posterUrl);

  const media = useMemo(() => {
    if (hasVideo) {
      return (
        <button
          type="button"
          onClick={() => setVideoOpen(true)}
          className="group absolute inset-0 block h-full w-full text-left"
          aria-label="Play Home hero video"
        >
          {posterUrl ? (
            <img
              src={safeImageSrc(posterUrl, '')}
              alt="video preview"
              className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105"
              onError={handleImageError}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,0.35),transparent_42%),linear-gradient(135deg,#1a0a3a,#0f0625_48%,#070314)]" />
          )}
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-violet-600 text-white shadow-[0_0_35px_rgba(139,92,246,0.75)] transition group-hover:scale-110 group-hover:bg-violet-500 sm:h-20 sm:w-20">
            <Play size={28} fill="currentColor" className="ml-1" />
          </span>
        </button>
      );
    }
    if (!hasMedia) {
      return (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,0.35),transparent_42%),linear-gradient(135deg,#1a0a3a,#0f0625_48%,#070314)]" />
      );
    }
    return (
      <img
        src={safeImageSrc(imageUrl, '')}
        alt="video editor"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        onError={handleImageError}
      />
    );
  }, [hasMedia, hasVideo, imageUrl, posterUrl]);

  return (
    <section className="relative -mt-[var(--navbar-height)] overflow-hidden pb-12 pt-[calc(var(--navbar-height)+2rem)]">
      <div className="absolute inset-0 radial-purple pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-medium mb-7 backdrop-blur">
          <Sparkles size={12} />
          <span>{hero.badge_text}</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-7 fade-in-up">
          <span className="text-white">{hero.hero_title}</span>
        </h1>

        <p className="max-w-2xl mx-auto text-white/70 text-base md:text-lg leading-relaxed mb-10">
          {hero.hero_subtitle}
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href={safePublicHref(hero.primary_button_link, '/assets')}
            className="group inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-500 transition-colors text-white px-7 py-3.5 rounded-full text-sm font-semibold shadow-[0_8px_30px_rgba(139,92,246,0.45)]"
          >
            {hero.primary_button_text}
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <ArrowRight size={12} />
            </span>
          </a>
          <a
            href={safePublicHref(hero.secondary_button_link, '/courses')}
            className="inline-flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/15 text-white px-7 py-3.5 rounded-full text-sm font-semibold transition"
          >
            {hero.secondary_button_text}
          </a>
        </div>

        <div className="hidden md:flex items-center justify-center gap-2 mt-4 -mx-10 opacity-60">
          <div className="h-px w-40 bg-gradient-to-r from-transparent to-violet-500/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <div className="w-[420px]" />
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <div className="h-px w-40 bg-gradient-to-l from-transparent to-violet-500/60" />
        </div>

        <div className="relative mt-16 max-w-5xl mx-auto">
          <div className="absolute -inset-6 bg-violet-600/20 blur-3xl rounded-3xl" />
          <div className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-br from-[#1a0a3a] via-[#0f0625] to-[#0a0518] p-1 overflow-hidden">
            <div className="relative aspect-[16/8] rounded-[20px] overflow-hidden bg-gradient-to-br from-[#1e0a45] to-[#0a0518]">
              {media}
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a0a3a]/90 via-transparent to-[#1a0a3a]/90 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
      {videoOpen && (
        <VideoModal
          videoType={mediaType}
          videoUrl={videoUrl}
          poster={posterUrl}
          onClose={() => setVideoOpen(false)}
        />
      )}
    </section>
  );
};

const VideoModal = ({ videoType, videoUrl, poster, onClose }) => (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true">
    <button
      type="button"
      onClick={onClose}
      className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
      aria-label="Close video"
    >
      <X size={20} />
    </button>
    <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
      <SafeVideoEmbed
        videoType={videoType || (isDirectVideoUrl(videoUrl) ? 'video_file' : 'video_url')}
        videoUrl={videoUrl}
        title="Home hero video"
        poster={poster}
        showPlayOverlay={false}
        autoplayOnClick
        className="w-full rounded-none border-0"
      />
    </div>
  </div>
);

export default Hero;
