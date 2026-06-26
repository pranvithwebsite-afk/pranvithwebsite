import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Award, Camera, Clock, Film, Plane, Sparkles } from 'lucide-react';
import { handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';
import { usePublicPageLoading } from '../components/PublicPageLoader';
import { useCmsPage } from '../hooks/useCmsPage';
import SafeVideoEmbed, { detectMediaType } from '../components/SafeVideoEmbed';
import OptimizedImage from '../components/OptimizedImage';

const statIcons = [Film, Camera, Plane, Clock];

const findSection = (sections, idOrType) =>
  (sections || []).find((section) => section.section_id === idOrType)
  || (sections || []).find((section) => section.type === idOrType);

const getCmsOrder = (sections = [], keys = [], fallback = 999) => {
  const matched = (sections || []).find((section) =>
    keys.includes(section.section_id) || keys.includes(section.type)
  );

  if (!matched) return fallback;

  const order = Number(matched.sort_order);
  return Number.isFinite(order) ? order : fallback;
};

const About = () => {
  const { page, loading } = useCmsPage('about');
  usePublicPageLoading(loading);

  const sections = page?.sections || [];

  const hero = findSection(sections, 'hero') || findSection(sections, 'image_text') || {};
  const statsSection = findSection(sections, 'stats') || {};
  const creativeSection = findSection(sections, 'creative-positioning') || {};
  const gearSection = findSection(sections, 'gear-workflow') || {};

  const heroOrder = getCmsOrder(sections, ['hero', 'image_text'], 10);
  const statsOrder = getCmsOrder(sections, ['stats'], 20);
  const creativeGearOrder = Math.min(
    getCmsOrder(sections, ['creative-positioning'], 30),
    getCmsOrder(sections, ['gear-workflow', 'gear'], 40)
  );

  const stats = statsSection.section_id && Array.isArray(statsSection.data?.items) && statsSection.data.items.length
    ? statsSection.data.items
        .filter((item) => item.enabled !== false)
        .map((item) => ({
          value: item.title,
          label: item.description,
        }))
    : [];

  const gearItems = Array.isArray(gearSection.data?.items)
    ? gearSection.data.items
        .filter((item) => item.enabled !== false)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    : [];

  const showHero = hero.section_id || !page;
  const videoMediaTypes = new Set(['video_file', 'video_url', 'youtube', 'vimeo']);
  const heroVideoUrl = hero.video_url || hero.data?.video_url || (videoMediaTypes.has(hero.media_type) ? hero.media_url : '') || (videoMediaTypes.has(hero.data?.media_type) ? hero.data?.media_url : '') || (videoMediaTypes.has(detectMediaType(hero.media_url)) ? hero.media_url : '') || (videoMediaTypes.has(detectMediaType(hero.data?.media_url)) ? hero.data?.media_url : '');
  const heroPosterUrl = hero.poster_url || hero.thumbnail_url || hero.image_url || hero.data?.poster_url || hero.data?.thumbnail_url || hero.data?.image_url;

  return (
    <main className="page bg-[var(--bg-main)] text-white">
      <Header />

      <div className="flex flex-col">
        {showHero && (
          <section style={{ order: heroOrder }} className="relative overflow-hidden px-6 py-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_0%,rgba(124,58,237,0.22),transparent_45%)]" />

            <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              {hero.enabled !== false && (
                <div className="overflow-hidden rounded-3xl border border-violet-500/20 bg-white/[0.04] p-3 shadow-[0_30px_120px_rgba(124,58,237,0.18)]">
                  <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.35),transparent_35%),linear-gradient(145deg,#1e0a45,var(--bg-main))]">
                    {heroVideoUrl ? (
                      <SafeVideoEmbed
                        videoType={hero.media_type || hero.data?.media_type || detectMediaType(heroVideoUrl)}
                        videoUrl={heroVideoUrl}
                        title={hero.title || 'About video'}
                        posterUrl={heroPosterUrl}
                        className="h-full w-full rounded-none border-0"
                        aspectRatio="aspect-[4/5]"
                      />
                    ) : hero.media_url ? (
                      <OptimizedImage
                        src={safeImageSrc(hero.media_url)}
                        alt="PranvithDOP profile"
                        priority
                        width={560}
                        height={700}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          handleImageError(event, '');
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-full w-full" />
                    )}

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg-main)]/30 via-transparent to-white/5" />
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-violet-300">
                  {hero.subtitle || page?.subtitle || 'About Pranvith Dop'}
                </p>

                <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-7xl">
                  {hero.title || page?.title || 'DOP, filmmaker, editor, drone pilot, and visual storyteller.'}
                </h1>

                <p className="mt-7 text-lg leading-relaxed text-white/70">
                  {hero.description || 'PranvithDOP creates cinematic visuals for brands, creators, weddings, products, and digital campaigns.'}
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to={safePublicHref(hero.button_link, '/hire')}
                    className="rounded-full bg-violet-600 px-7 py-3 text-sm font-semibold text-white hover:bg-violet-500"
                  >
                    {hero.button_text || 'Book a project'}
                  </Link>

                  <Link
                    to={safePublicHref(hero.data?.secondary_button_link, '/works')}
                    className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    {hero.data?.secondary_button_text || 'View portfolio'}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {statsSection.section_id && stats.length > 0 && (
          <section style={{ order: statsOrder }} className="px-6 pb-20">
            <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => {
                const Icon = statIcons[index % statIcons.length];

                return (
                  <div
                    key={`${stat.label}-${index}`}
                    className="rounded-3xl border border-violet-500/15 bg-[#100830]/60 p-6 text-center"
                  >
                    <Icon size={28} className="mx-auto mb-4 text-violet-300" />
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                    <p className="mt-2 text-xs uppercase tracking-wider text-white/50">
                      {stat.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(creativeSection.section_id || gearSection.section_id) && (
          <section style={{ order: creativeGearOrder }} className="px-6 pb-24">
            <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
              {creativeSection.section_id && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                  <Sparkles className="mb-5 text-violet-300" />
                  <h2 className="text-3xl font-bold text-white">
                    {creativeSection.title || 'Creative positioning'}
                  </h2>
                  <p className="mt-4 leading-relaxed text-white/70">
                    {creativeSection.description}
                  </p>
                </div>
              )}

              {gearSection.section_id && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                  <Award className="mb-5 text-violet-300" />
                  <h2 className="text-3xl font-bold text-white">
                    {gearSection.title || 'Gear & workflow'}
                  </h2>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {gearItems.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75"
                      >
                        {item.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
};

export default About;
