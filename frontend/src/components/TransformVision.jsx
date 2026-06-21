import React, { useEffect, useMemo, useState } from 'react';
import { Instagram, ArrowRight } from 'lucide-react';
import { FALLBACK_IMAGE, handleImageError } from '../lib/utils';
import { fetchPublicSettings } from '../lib/api';

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
    background: 'linear-gradient(145deg, #7c3aed 0%, #312e81 50%, #090516 100%)',
    link_url: instagramProfileUrl,
    enabled: true,
    sort_order: 0,
  },
  {
    title: 'Behind the scenes',
    type: 'Post',
    coverText: 'BTS',
    background: 'linear-gradient(145deg, #db2777 0%, #7e22ce 48%, #12051f 100%)',
    link_url: instagramProfileUrl,
    enabled: true,
    sort_order: 1,
  },
  {
    title: 'Drone shot preview',
    type: 'Video',
    coverText: 'DRONE',
    background: 'linear-gradient(135deg, #111827 0%, #111827 49%, #7c3aed 50%, #c026d3 100%)',
    link_url: instagramProfileUrl,
    enabled: true,
    sort_order: 2,
  },
  {
    title: 'Commercial frame',
    type: 'Reel',
    coverText: 'COMMERCIAL',
    background: 'radial-gradient(circle at 30% 25%, #f472b6 0%, #7c3aed 35%, #111827 78%)',
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
    background: 'linear-gradient(145deg, #020617 0%, #312e81 48%, #9333ea 100%)',
    link_url: instagramProfileUrl,
    enabled: true,
    sort_order: 5,
  },
];

const TransformVision = () => {
  const [instagramProfile, setInstagramProfile] = useState(defaultInstagramProfile);

  useEffect(() => {
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
  }, []);

  const cards = useMemo(() => {
    const configuredCards = Array.isArray(instagramProfile.cards) && instagramProfile.cards.length > 0
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
  }, [instagramProfile]);

  const followUrl = instagramProfile.follow_button_url || instagramProfileUrl;
  const bioLines = [
    instagramProfile.bio_line_1,
    instagramProfile.bio_line_2,
    instagramProfile.bio_line_3,
    instagramProfile.bio_line_4,
  ].filter(Boolean);

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              Transform your{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-300">
                creative vision
              </span>{' '}
              into reality.
            </h2>
            <p className="mt-7 text-white/65 leading-relaxed max-w-lg">
              Master professional video editing skills with our comprehensive courses.
              Learn industry-standard techniques, creative storytelling, and advanced workflows that bring your ideas to life.
            </p>
            <div className="mt-9 flex items-center gap-4">
              <button className="group inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-500 transition-colors text-white px-6 py-3 rounded-full text-sm font-semibold">
                Get started
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight size={11} />
                </span>
              </button>
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
          <div className="flex justify-center md:justify-end">
            <div className="relative">
              <div className="absolute -inset-10 bg-violet-600/20 blur-3xl rounded-full" />
              <div className="relative w-[260px] md:w-[300px] h-[540px] md:h-[620px] rounded-[42px] bg-gradient-to-b from-[#1a0c4f] to-[#0a0518] border-[10px] border-[#0a0518] shadow-[0_30px_80px_rgba(139,92,246,0.25)] overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-20" />
                <div className="absolute inset-0 p-4 pt-10 text-white">
                  <div className="flex items-center justify-between mb-4 text-xs">
                    <span className="font-semibold">{instagramProfile.username}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-rose-500">
                      <img
                        src={instagramProfile.profile_image_url || FALLBACK_IMAGE}
                        alt={instagramProfile.display_name}
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
                        className="block text-violet-300 mt-1 hover:text-violet-200"
                      >
                        {instagramProfile.link_text}
                      </a>
                    )}
                  </div>
                  <a
                    href={followUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block w-full py-2 rounded-lg bg-violet-600 text-center text-xs font-semibold"
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
                        className="group relative aspect-square overflow-hidden rounded border border-white/5 bg-violet-950"
                        style={{ background: card.background }}
                      >
                        {card.thumbnail_image_url && (
                          <img
                            src={card.thumbnail_image_url}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-300 group-hover:scale-105"
                            onError={handleImageError}
                          />
                        )}
                        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:12px_12px]" />
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransformVision;
