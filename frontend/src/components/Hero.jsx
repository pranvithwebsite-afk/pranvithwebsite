import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';
import { fetchPublicSettings } from '../lib/api';
import SafeVideoEmbed, { getSafeVideoEmbedUrl, isDirectVideoUrl } from './SafeVideoEmbed';

const fallbackHero = {
  badge_text: 'Learn premium editing, LUTs, transitions, and storytelling workflows that get results.',
  hero_title: 'Video Editing Mastery for Creators',
  hero_subtitle: 'Master the art of video editing with our comprehensive courses. From beginner basics to advanced techniques, learn professional editing skills that transform your creative vision into stunning reality.',
  primary_button_text: 'Explore Assets',
  primary_button_link: '/assets',
  secondary_button_text: 'Join Community',
  secondary_button_link: '/courses',
  hero_media_type: 'image',
  hero_media_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1600&q=80',
  hero_media_poster_url: '',
  hero_media_autoplay: true,
  hero_media_muted: true,
  hero_media_loop: true,
};

const Hero = ({ pageData }) => {
  const [settingsHero, setSettingsHero] = useState(null);

  useEffect(() => {
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
  }, []);

  const legacyHero = {
    ...fallbackHero,
    badge_text: pageData?.subheadline || fallbackHero.badge_text,
    hero_title: pageData?.headline || fallbackHero.hero_title,
    primary_button_text: pageData?.buttonText || fallbackHero.primary_button_text,
    primary_button_link: pageData?.buttonUrl || fallbackHero.primary_button_link,
    hero_media_url: pageData?.image || fallbackHero.hero_media_url,
  };
  const hero = { ...legacyHero, ...(settingsHero || {}) };
  const mediaUrl = hero.hero_media_url || fallbackHero.hero_media_url;
  const mediaType = hero.hero_media_url ? hero.hero_media_type : 'image';
  const directVideo = mediaType === 'video_file' || (mediaType === 'video_url' && isDirectVideoUrl(mediaUrl));
  const embedUrl = mediaType === 'video_url' && !directVideo ? getSafeVideoEmbedUrl('video_url', mediaUrl) : '';

  const media = useMemo(() => {
    if (embedUrl || directVideo) {
      return (
        <SafeVideoEmbed
          videoType={directVideo ? 'video_file' : 'video_url'}
          videoUrl={mediaUrl}
          title="Home hero video"
          poster={hero.hero_media_poster_url}
          className="absolute inset-0 h-full w-full rounded-none opacity-40"
        />
      );
    }
    return (
      <img
        src={safeImageSrc(mediaUrl, fallbackHero.hero_media_url)}
        alt="video editor"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        onError={handleImageError}
      />
    );
  }, [directVideo, embedUrl, hero.hero_media_poster_url, mediaUrl]);

  return (
    <section className="relative pt-8 pb-12 overflow-hidden">
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
    </section>
  );
};

export default Hero;
