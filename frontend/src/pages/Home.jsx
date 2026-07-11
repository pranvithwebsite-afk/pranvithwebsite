import React, { Suspense, lazy } from 'react';
import { ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Footer from '../components/Footer';
import ViewportGate from '../components/ViewportGate';
import { usePublicPageLoading } from '../components/PublicPageLoader';
import { useCmsPage } from '../hooks/useCmsPage';
import { safePublicHref } from '../lib/utils';

const ServicesSection = lazy(() => import('../components/ServicesSection'));
const ShowreelSection = lazy(() => import('../components/ShowreelSection'));
const TransformVision = lazy(() => import('../components/TransformVision'));
const OurWorks = lazy(() => import('../components/OurWorks'));
const FAQ = lazy(() => import('../components/FAQ'));

const sectionToHomeKey = {
  hero: 'hero',
  services: 'services',
  services_cards: 'services',
  showreel: 'showreel',
  cta: 'cta',
  'featured-assets': 'featuredAssets',
  featured_assets_preview: 'featuredAssets',
  portfolio_grid: 'featuredAssets',
  instagram: 'instagramProfile',
  'instagram-profile': 'instagramProfile',
  instagram_profile: 'instagramProfile',
  gallery: 'instagramProfile',
  faq: 'footerCta',
};

const sectionByKey = (sections = []) => (key) =>
  sections.find((section) => section.section_id === key)
  || sections.find((section) => section.type === key);

const firstText = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

const videoMediaTypes = new Set(['video_file', 'video_url', 'youtube', 'vimeo']);

const homeOrderFromCms = (sections = []) => {
  const order = sections
    .map((section) => sectionToHomeKey[section.section_id] || sectionToHomeKey[section.type])
    .filter(Boolean);
  return order.length ? order : ['hero', 'featuredAssets', 'instagramProfile', 'services', 'showreel', 'cta', 'footerCta'];
};

const Home = () => {
  const { page, loading } = useCmsPage('home');
  usePublicPageLoading(loading);
  const cmsSections = page?.sections || [];
  const findSection = sectionByKey(cmsSections);
  const heroSection = findSection('hero');
  const ctaSection = findSection('cta');
  const worksSection = findSection('featured-assets') || findSection('portfolio_grid');
  const instagramSection = findSection('instagram-profile') || findSection('instagram') || findSection('gallery');
  const servicesSection = findSection('services') || findSection('services_cards') || findSection('home_services');
  const showreelSection = findSection('showreel');
  const faqSection = findSection('faq');
  const order = homeOrderFromCms(cmsSections);
  const deferredKeys = new Set(['featuredAssets', 'instagramProfile', 'services', 'showreel', 'footerCta']);

  const heroData = heroSection ? {
    badgeText: firstText(heroSection.subtitle, heroSection.data?.badge_text),
    headline: firstText(heroSection.title, heroSection.data?.title, heroSection.data?.heading, heroSection.data?.hero_title),
    subheadline: firstText(heroSection.description, heroSection.data?.description, heroSection.data?.hero_subtitle),
    image: firstText(heroSection.image_url, heroSection.data?.image_url, !videoMediaTypes.has(heroSection.media_type) ? heroSection.media_url : '', !videoMediaTypes.has(heroSection.data?.hero_media_type) ? heroSection.data?.hero_media_url : ''),
    videoUrl: firstText(heroSection.video_url, heroSection.data?.video_url, videoMediaTypes.has(heroSection.media_type) ? heroSection.media_url : '', videoMediaTypes.has(heroSection.data?.media_type) ? heroSection.data?.media_url : '', videoMediaTypes.has(heroSection.data?.hero_media_type) ? heroSection.data?.hero_media_url : ''),
    thumbnailUrl: firstText(heroSection.thumbnail_url, heroSection.data?.thumbnail_url, heroSection.data?.thumbnail_image_url),
    mediaType: firstText(heroSection.media_type, heroSection.data?.media_type, heroSection.data?.hero_media_type),
    posterUrl: firstText(heroSection.poster_url, heroSection.image_url, heroSection.thumbnail_url, heroSection.data?.poster_url, heroSection.data?.image_url, heroSection.data?.thumbnail_url, heroSection.data?.hero_media_poster_url),
    buttonText: firstText(heroSection.button_text, heroSection.data?.button_text, heroSection.data?.primary_button_text),
    buttonUrl: firstText(heroSection.button_link, heroSection.data?.button_link, heroSection.data?.primary_button_link),
    secondaryButtonText: firstText(heroSection.data?.secondary_button_text),
    secondaryButtonUrl: firstText(heroSection.data?.secondary_button_link),
  } : null;

  return (
    <>
      <Header />
      <main className="page relative bg-transparent text-white">
        {order.map((sectionKey) => {
          const sections = {
            hero: <Hero key="hero" pageData={heroData} />,
            featuredAssets: (
              <Suspense key="featuredAssets" fallback={<SectionSkeleton />}>
                <OurWorks section={worksSection} />
              </Suspense>
            ),
            instagramProfile: instagramSection ? (
              <Suspense key="instagramProfile" fallback={<SectionSkeleton />}>
                <TransformVision section={instagramSection} />
              </Suspense>
            ) : null,
            services: servicesSection ? <ServicesSection key="services" section={servicesSection} /> : null,
            showreel: showreelSection ? (
              <Suspense key="showreel" fallback={<SectionSkeleton />}>
                <ShowreelSection section={showreelSection} />
              </Suspense>
            ) : null,
            cta: <HomeCta key="cta" section={ctaSection} />,
            footerCta: faqSection ? (
              <Suspense key="footerCta" fallback={<SectionSkeleton />}>
                <FAQ section={faqSection} />
              </Suspense>
            ) : null,
          };
          const content = sections[sectionKey] || null;
          if (!content) return null;
          if (!deferredKeys.has(sectionKey)) return content;
          return (
            <ViewportGate
              key={`gate-${sectionKey}`}
              rootMargin="320px 0px"
              fallback={<SectionSkeleton compact={sectionKey !== 'footerCta'} />}
            >
              {content}
            </ViewportGate>
          );
        })}
      </main>
      <Footer />
    </>
  );
};

const HomeCta = ({ section }) => (
  <section className="section-block px-6">
    <div className="page-shell rounded-3xl border border-[var(--border-soft)] bg-[var(--panel-purple)] px-6 py-8 shadow-2xl shadow-black/20 md:px-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-purple)]">{section?.data?.eyebrow || 'PranvithDOP'}</p>
          <h2 className="mt-3 text-2xl font-bold text-white md:text-4xl">{section?.title || 'Ready to create cinematic visuals?'}</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65">{section?.description || 'Explore assets, courses, showreels, and production services built for serious creators.'}</p>
        </div>
        {(section?.button_text || section?.button_link) && (
          <a href={safePublicHref(section?.button_link, '/hire')} className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-accent-purple-strong px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-purple">
            {section?.button_text || 'Book a Project'}
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
              <ArrowRight size={11} />
            </span>
          </a>
        )}
      </div>
    </div>
  </section>
);

const SectionSkeleton = ({ compact = false }) => (
  <section className={`section-block px-6 ${compact ? 'py-10' : ''}`.trim()} aria-hidden="true">
    <div className="mx-auto max-w-7xl">
      <div className="h-8 w-56 animate-pulse rounded-full bg-white/8" />
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-56 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
    </div>
  </section>
);

export default Home;
