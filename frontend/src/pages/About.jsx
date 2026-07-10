import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Award, Camera, Clock, Film, Plane, Sparkles } from 'lucide-react';
import { FALLBACK_IMAGE, handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';
import { usePublicPageLoading } from '../components/PublicPageLoader';
import PageReadyPlaceholder from '../components/PageReadyPlaceholder';
import { useCmsPage } from '../hooks/useCmsPage';
import OptimizedImage from '../components/OptimizedImage';

const statIcons = [Film, Camera, Plane, Clock];

const findSection = (sections, idOrType) =>
  (sections || []).find((section) => section.section_id === idOrType)
  || (sections || []).find((section) => section.type === idOrType);

const firstText = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

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

  const heroImageUrl = safeImageSrc(firstText(
    hero.media_url,
    hero.image_url,
    hero.thumbnail_url,
    hero.poster_url,
    hero.data?.media_url,
    hero.data?.image_url,
    hero.data?.thumbnail_url,
    hero.data?.poster_url
  ), FALLBACK_IMAGE);

  const showHero = hero.section_id || !page;

  return (
    <>
      <Header />
      <main className="page bg-transparent text-white">
        {loading ? (
          <PageReadyPlaceholder />
        ) : (
          <div className="flex flex-col">
            {showHero && (
              <section style={{ order: heroOrder }} className="section-block overflow-hidden px-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_0%,rgba(124,58,237,0.22),transparent_45%)]" />

                <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                  {hero.enabled !== false && (
                    <div className="cinematic-card overflow-hidden p-3">
                      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(167,139,250,0.22),transparent_35%),linear-gradient(145deg,#1a102d,#05000d)]">
                        <OptimizedImage
                          src={heroImageUrl}
                          alt="PranvithDOP profile"
                          width={800}
                          height={1000}
                          className="h-full w-full object-cover"
                          onError={handleImageError}
                        />

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg-main)]/30 via-transparent to-white/5" />
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="section-eyebrow text-xs">
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
                        className="rounded-full bg-accent-purple-strong px-7 py-3 text-sm font-semibold text-white hover:bg-accent-purple"
                      >
                        {hero.button_text || 'Book a project'}
                      </Link>

                      <Link
                        to={safePublicHref(hero.data?.secondary_button_link, '/works')}
                        className="rounded-full border border-purple-300/20 px-7 py-3 text-sm font-semibold text-white hover:border-purple-300/35 hover:bg-purple-500/15"
                      >
                        {hero.data?.secondary_button_text || 'View portfolio'}
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {statsSection.section_id && stats.length > 0 && (
              <section style={{ order: statsOrder }} className="section-block px-6 pt-0">
                <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.map((stat, index) => {
                    const Icon = statIcons[index % statIcons.length];

                    return (
                      <div
                        key={`${stat.label}-${index}`}
                        className="cinematic-card p-6 text-center"
                      >
                        <Icon size={28} className="mx-auto mb-4 text-purple-200" />
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
              <section style={{ order: creativeGearOrder }} className="section-block px-6 pt-0">
                <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
                  {creativeSection.section_id && (
                    <div className="cinematic-card p-8">
                      <Sparkles className="mb-5 text-purple-200" />
                      <h2 className="text-3xl font-bold text-white">
                        {creativeSection.title || 'Creative positioning'}
                      </h2>
                      <p className="mt-4 leading-relaxed text-white/70">
                        {creativeSection.description}
                      </p>
                    </div>
                  )}

                  {gearSection.section_id && (
                    <div className="cinematic-card p-8">
                      <Award className="mb-5 text-purple-200" />
                      <h2 className="text-3xl font-bold text-white">
                        {gearSection.title || 'Gear & workflow'}
                      </h2>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {gearItems.map((item) => (
                          <div
                            key={item.title}
                            className="rounded-2xl border border-purple-300/20 bg-purple-500/10 px-4 py-3 text-sm text-white/75"
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
        )}
      </main>
      <Footer />
    </>
  );
};

export default About;
