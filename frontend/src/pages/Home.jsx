import React from 'react';
import { ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import ShowreelSection from '../components/ShowreelSection';
import ServicesSection from '../components/ServicesSection';
import TransformVision from '../components/TransformVision';
import OurWorks from '../components/OurWorks';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import { usePublicPageLoading } from '../components/PublicPageLoader';
import PageReadyPlaceholder from '../components/PageReadyPlaceholder';
import { useCmsPage } from '../hooks/useCmsPage';
import { safePublicHref } from '../lib/utils';

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
  sections.find((section) => section.section_id === key || section.type === key);

const firstText = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

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
  const servicesSection = findSection('services') || findSection('services_cards');
  const showreelSection = findSection('showreel');
  const faqSection = findSection('faq');
  const order = homeOrderFromCms(cmsSections);

  const heroData = heroSection ? {
    badgeText: firstText(heroSection.subtitle, heroSection.data?.badge_text),
    headline: firstText(heroSection.title, heroSection.data?.title, heroSection.data?.heading, heroSection.data?.hero_title),
    subheadline: firstText(heroSection.description, heroSection.data?.description, heroSection.data?.hero_subtitle),
    image: firstText(heroSection.media_url, heroSection.data?.media_url, heroSection.data?.hero_media_url),
    mediaType: firstText(heroSection.media_type, heroSection.data?.media_type, heroSection.data?.hero_media_type),
    posterUrl: firstText(heroSection.poster_url, heroSection.data?.poster_url, heroSection.data?.hero_media_poster_url),
    buttonText: firstText(heroSection.button_text, heroSection.data?.button_text, heroSection.data?.primary_button_text),
    buttonUrl: firstText(heroSection.button_link, heroSection.data?.button_link, heroSection.data?.primary_button_link),
    secondaryButtonText: firstText(heroSection.data?.secondary_button_text),
    secondaryButtonUrl: firstText(heroSection.data?.secondary_button_link),
  } : null;

  if (loading) return <PageReadyPlaceholder />;

  return (
    <main className="page relative overflow-hidden bg-[#070314] text-white">
      <Header />
      {order.map((sectionKey) => {
        const sections = {
          hero: <Hero key="hero" pageData={heroData} />,
          featuredAssets: <OurWorks key="featuredAssets" section={worksSection} />,
          instagramProfile: instagramSection ? <TransformVision key="instagramProfile" section={instagramSection} /> : null,
          services: servicesSection ? <ServicesSection key="services" section={servicesSection} /> : null,
          showreel: showreelSection ? <ShowreelSection key="showreel" section={showreelSection} /> : null,
          cta: <HomeCta key="cta" section={ctaSection} />,
          footerCta: faqSection ? <FAQ key="footerCta" section={faqSection} /> : null,
        };
        return sections[sectionKey] || null;
      })}
      <Footer />
    </main>
  );
};

const HomeCta = ({ section }) => (
  <section className="relative overflow-hidden px-6 py-20">
    <div className="mx-auto max-w-6xl rounded-3xl border border-violet-500/20 bg-gradient-to-r from-[#1a124a]/70 to-[#0f0830]/60 px-6 py-8 shadow-2xl shadow-violet-950/20 md:px-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">PranvithDOP</p>
          <h2 className="mt-3 text-2xl font-bold text-white md:text-4xl">{section?.title || 'Ready to create cinematic visuals?'}</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65">{section?.description || 'Explore assets, courses, showreels, and production services built for serious creators.'}</p>
        </div>
        {(section?.button_text || section?.button_link) && (
          <a href={safePublicHref(section?.button_link, '/hire')} className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500">
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

export default Home;
