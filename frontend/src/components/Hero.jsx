import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';
import { fetchPublicSettings } from '../lib/api';
import SafeVideoEmbed, { detectMediaType, getYouTubeThumbnail } from './SafeVideoEmbed';
import OptimizedImage from './OptimizedImage';

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

  useEffect(() => {
    if (hasVideo || !imageUrl || typeof document === 'undefined') return undefined;
    const href = safeImageSrc(imageUrl, '');
    if (!href) return undefined;

    const existing = document.head.querySelector(`link[rel="preload"][as="image"][href="${href}"]`);
    if (existing) return undefined;

    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.href = href;
    document.head.appendChild(preload);

    return () => {
      if (preload.parentNode) preload.parentNode.removeChild(preload);
    };
  }, [hasVideo, imageUrl]);

  const media = useMemo(() => {
    if (hasVideo) {
      return (
        <SafeVideoEmbed
          videoType={mediaType}
          videoUrl={videoUrl}
          title={hero.hero_title || 'Home hero video'}
          posterUrl={posterUrl}
          className="h-full w-full rounded-none border-0"
          aspectRatio="h-full"
          autoPlay
          muted
          loop
          showPlayOverlay={false}
          loadWhenVisible={false}
          thumbnailLoading="eager"
          thumbnailFetchPriority="high"
          thumbnailWidth={1280}
          thumbnailHeight={640}
        />
      );
    }
    if (!hasMedia) {
      return (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(124,58,237,0.35),transparent_42%),linear-gradient(135deg,#1a0a3a,#0f0625_48%,var(--bg-main))]" />
      );
    }
    return (
      <OptimizedImage
        src={safeImageSrc(imageUrl, '')}
        alt="video editor"
        priority
        width={1280}
        height={640}
        loading="eager"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        onError={handleImageError}
      />
    );
  }, [hasMedia, hasVideo, imageUrl, mediaType, posterUrl, videoUrl, hero.hero_title]);

  return (
    <section className="relative min-h-[calc(100vh-var(--navbar-height))] pb-20 pt-10 sm:pb-24 sm:pt-14">
      <div className="absolute inset-0 radial-purple pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-medium mb-7 backdrop-blur">
          <Sparkles size={12} />
          <span>{hero.badge_text}</span>
        </div>

        <h1 className="mb-8 max-w-full break-words text-[clamp(38px,12vw,62px)] font-bold leading-[0.95] tracking-tight md:text-[clamp(56px,7vw,110px)]">
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

        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="absolute -inset-6 bg-violet-600/20 blur-3xl rounded-3xl" />
          <div className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-br from-[#1a0a3a] via-[#0f0625] to-[#0a0518] p-1 overflow-hidden">
            <div className="relative aspect-[16/8] rounded-[20px] overflow-hidden bg-gradient-to-br from-[#1e0a45] to-[#0a0518]">
              {media}
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a0a3a]/90 via-transparent to-[#1a0a3a]/90 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
