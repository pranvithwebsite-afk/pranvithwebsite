import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Instagram, ArrowRight } from 'lucide-react';
import { FALLBACK_IMAGE, handleImageError, safePublicHref } from '../lib/utils';
import { fetchPublicSettings } from '../lib/api';
import OptimizedImage from './OptimizedImage';

const instagramProfileUrl =
  'https://www.instagram.com/pranvith_dop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==';

const defaultInstagramProfile = {
  username: 'pranvith_dop',
  display_name: 'Pranvith Dop',
  profile_image_url: FALLBACK_IMAGE,
  followers_count: '5,131',
  following_count: '10',
  posts_count: '',
  bio_line_1: '🎥 DOP | Filmmaker | Video Editor',
  bio_line_2: '🚁 Drone Pilot | DI',
  bio_line_3: '📸 Product & Commercial Photography',
  bio_line_4: '🎨 Graphic Design',
  link_text: 'youtube.com/@pranvithdop',
  link_url: 'https://www.youtube.com/@pranvithdop',
  follow_button_url: instagramProfileUrl,
};

const defaultInstagramCards = [
  {
    title: 'Cinematic editing reel',
    type: 'Reel',
    coverText: 'EDIT REEL',
    background: 'linear-gradient(145deg, #0d1322 0%, #131c2e 50%, #070a13 100%)',
    link_url: instagramProfileUrl,
    enabled: true,
    sort_order: 0,
  },
  {
    title: 'Behind the scenes',
    type: 'Post',
    coverText: 'BTS',
    background: 'linear-gradient(145deg, #1e40af 0%, #0d1322 48%, #070a13 100%)',
    link_url: instagramProfileUrl,
    enabled: true,
    sort_order: 1,
  },
  {
    title: 'Drone shot preview',
    type: 'Video',
    coverText: 'DRONE',
    background: 'linear-gradient(135deg, #070a13 0%, #0d1322 50%, #3b82f6 100%)',
    link_url: instagramProfileUrl,
    enabled: true,
    sort_order: 2,
  },
  {
    title: 'Commercial frame',
    type: 'Reel',
    coverText: 'COMMERCIAL',
    background: 'radial-gradient(circle at 30% 25%, #3b82f6 0%, #0d1322 35%, #070a13 78%)',
    link_url: instagramProfileUrl,
    enabled: true,
    sort_order: 3,
  },
  {
    title: 'DI color grade',
    type: 'Post',
    coverText: 'DI',
    background: 'linear-gradient(160deg, #0f172a 0%, #581c87 55%, #be185d 100%)',
    link_url: instagramProfileUrl,
    enabled: true,
    sort_order: 4,
  },
  {
    title: 'Graphic design post',
    type: 'Video',
    coverText: 'DESIGN',
    background: 'linear-gradient(145deg, #020617 0%, #312e81 48%, #0877ff 100%)',
    link_url: instagramProfileUrl,
    enabled: true,
    sort_order: 5,
  },
];

const TransformVision = ({ section }) => {
  const [instagramProfile, setInstagramProfile] = useState(defaultInstagramProfile);
  const sectionRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    if (section) {
      setInstagramProfile({
        ...defaultInstagramProfile,
        ...(section.data || {}),
        profile_image_url: section.media_url || section.data?.profile_image_url || defaultInstagramProfile.profile_image_url,
        cards: section.data?.items || section.data?.cards || [],
        button_text: section.button_text,
        button_link: section.button_link,
      });
      return undefined;
    }
    let mounted = true;
    fetchPublicSettings()
      .then((settings) => {
        if (!mounted) return;
        setInstagramProfile({
          ...defaultInstagramProfile,
          ...(settings?.instagram_profile || {}),
        });
      })
      .catch(() => {
        if (mounted) setInstagramProfile(defaultInstagramProfile);
      });
    return () => {
      mounted = false;
    };
  }, [section]);

  useEffect(() => {
    const sectionEl = sectionRef.current;
    const phoneEl = phoneRef.current;
    if (!sectionEl || !phoneEl) return undefined;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    let rafId = 0;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const updatePhoneMotion = () => {
      const rect = sectionEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);
      const centered = (progress - 0.5) * 2;
      const zoomWave = Math.sin(progress * Math.PI);

      phoneEl.style.setProperty('--phone-y', `${-12 + progress * 24}px`);
      phoneEl.style.setProperty('--phone-rotate-x', `${5 - progress * 10}deg`);
      phoneEl.style.setProperty('--phone-rotate-y', `${-16 + progress * 28}deg`);
      phoneEl.style.setProperty('--phone-rotate-z', `${-2 + progress * 4}deg`);
      phoneEl.style.setProperty('--phone-scale', String(0.92 + zoomWave * 0.10));
      phoneEl.style.setProperty('--phone-z', `${zoomWave * 80}px`);
      phoneEl.style.setProperty('--phone-glow', String(0.55 + Math.abs(centered) * 0.2));
      rafId = 0;
    };

    const updatePointerMotion = (event) => {
      const rect = sectionEl.getBoundingClientRect();
      const x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      const y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
      phoneEl.style.setProperty('--phone-pointer-x', `${x * 7}deg`);
      phoneEl.style.setProperty('--phone-pointer-y', `${y * -5}deg`);
      phoneEl.style.setProperty('--phone-float-x', `${x * 14}px`);
      phoneEl.style.setProperty('--phone-float-y', `${y * 10}px`);
    };

    const resetPointerMotion = () => {
      phoneEl.style.setProperty('--phone-pointer-x', '0deg');
      phoneEl.style.setProperty('--phone-pointer-y', '0deg');
      phoneEl.style.setProperty('--phone-float-x', '0px');
      phoneEl.style.setProperty('--phone-float-y', '0px');
    };

    const requestUpdate = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updatePhoneMotion);
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    sectionEl.addEventListener('pointermove', updatePointerMotion, { passive: true });
    sectionEl.addEventListener('pointerleave', resetPointerMotion);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      sectionEl.removeEventListener('pointermove', updatePointerMotion);
      sectionEl.removeEventListener('pointerleave', resetPointerMotion);
    };
  }, []);

  const cards = useMemo(() => {
    const configuredCards = Array.isArray(instagramProfile.cards) && (instagramProfile.cards.length > 0 || section)
      ? instagramProfile.cards
      : defaultInstagramCards;
    return configuredCards
      .filter((card) => card.enabled !== false)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .slice(0, 9)
      .map((card, index) => ({
        ...defaultInstagramCards[index % defaultInstagramCards.length],
        ...card,
        type: card.type || defaultInstagramCards[index % defaultInstagramCards.length].type,
        link_url: card.link_url || instagramProfile.follow_button_url || instagramProfileUrl,
      }));
  }, [instagramProfile, section]);

  const followUrl = instagramProfile.follow_button_url || instagramProfileUrl;
  const bioLines = [
    instagramProfile.bio_line_1,
    instagramProfile.bio_line_2,
    instagramProfile.bio_line_3,
    instagramProfile.bio_line_4,
  ].filter(Boolean);

  return (
    <section ref={sectionRef} className="transform-vision-section relative overflow-hidden px-4 sm:px-6 py-16 md:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              {section?.title || (
                <>
                  Transform your{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-300">
                    creative vision
                  </span>{' '}
                  into reality.
                </>
              )}
            </h2>
            <p className="mt-7 text-white/65 leading-relaxed max-w-lg">
              {section?.description || 'Master professional video editing skills with our comprehensive courses. Learn industry-standard techniques, creative storytelling, and advanced workflows that bring your ideas to life.'}
            </p>
            <div className="mt-9 flex items-center gap-4">
              <a href={safePublicHref(instagramProfile.button_link, '/courses')} className="group inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-500 transition-colors text-white px-6 py-3 rounded-full text-sm font-semibold">
                {instagramProfile.button_text || 'Get started'}
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight size={11} />
                </span>
              </a>
              <a
                href={followUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white px-5 py-3 rounded-full text-sm font-semibold transition"
              >
                <Instagram size={16} />
                Follow us
              </a>
            </div>
          </div>

          {/* Mobile mockup */}
          <div className="transform-phone-stage flex justify-center md:justify-end py-4">
            <div ref={phoneRef} className="transform-phone-3d relative">
              <div className="transform-phone-orbit absolute -inset-10 rounded-full" />
              <div className="transform-phone-shadow" />
              <div className="phone-floating-chip phone-floating-chip--top">
                <span className="phone-chip-dot" />
                5.3K audience
              </div>
              <div className="phone-floating-chip phone-floating-chip--bottom">
                <span className="phone-chip-spark">✦</span>
                New reel live
              </div>
              <div className="phone-mockup relative h-[520px] w-[255px] overflow-hidden rounded-[40px] border-[9px] border-[#0a0518] bg-gradient-to-b from-[#1a0c4f] to-[#0a0518] md:h-[570px] md:w-[285px]">
                <div className="phone-screen-shine" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-20" />
                <div className="phone-camera-lens" />
                <div className="absolute inset-0 p-4 pt-10 text-white">
                  <div className="flex items-center justify-between mb-4 text-xs">
                    <span className="font-semibold">{instagramProfile.username}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="phone-profile-avatar w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-rose-500">
                      <OptimizedImage
                        src={instagramProfile.profile_image_url || FALLBACK_IMAGE}
                        alt={instagramProfile.display_name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-around text-center">
                        {instagramProfile.posts_count && (
                          <div>
                            <div className="text-sm font-semibold">{instagramProfile.posts_count}</div>
                            <div className="text-[10px] text-white/60">posts</div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold">{instagramProfile.followers_count}</div>
                          <div className="text-[10px] text-white/60">followers</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{instagramProfile.following_count}</div>
                          <div className="text-[10px] text-white/60">following</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs leading-tight">
                    <div className="font-semibold">{instagramProfile.display_name}</div>
                    {bioLines.map((line) => (
                      <div key={line} className="text-white/70">{line}</div>
                    ))}
                    {instagramProfile.link_text && (
                      <a
                        href={instagramProfile.link_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[#93c5fd] mt-1 hover:text-[#60a5fa]"
                      >
                        {instagramProfile.link_text}
                      </a>
                    )}
                  </div>
                  <a
                    href={followUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block w-full py-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-center text-xs font-semibold text-white transition-all duration-300 shadow-[0_4px_16px_rgba(59,130,246,0.3)]"
                  >
                    Follow
                  </a>
                  <div className="mt-4 grid grid-cols-3 gap-1">
                    {cards.map((card) => (
                      <a
                        key={`${card.title}-${card.sort_order}`}
                        href={card.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${card.title} ${card.type} on Instagram`}
                        className="phone-content-card group relative aspect-square overflow-hidden rounded border border-white/5 bg-violet-950"
                        style={{ background: card.background }}
                      >
                        {card.thumbnail_image_url && (
                          <OptimizedImage
                            src={card.thumbnail_image_url}
                            alt=""
                            width={160}
                            height={160}
                            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-300 group-hover:scale-105"
                            onError={handleImageError}
                          />
                        )}
                        <div className="absolute inset-0 opacity-12 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:12px_12px]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                        <span className="absolute inset-x-2 top-1/2 -translate-y-1/2 text-center text-[9px] font-black leading-tight tracking-wide text-white/90">
                          {card.coverText}
                        </span>
                        <span className="absolute right-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide">
                          {String(card.type || '').toUpperCase()}
                        </span>
                        <span className="absolute inset-x-1 bottom-1 line-clamp-2 text-[8px] font-semibold leading-tight text-white">
                          {card.title}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="phone-side-edge" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransformVision;
