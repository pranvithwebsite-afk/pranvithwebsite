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
import { useCmsPage } from '../hooks/useCmsPage';
import { safePublicHref } from '../lib/utils';

const sectionToHomeKey = {
  hero: 'hero',
  services: 'services',
  showreel: 'showreel',
  cta: 'cta',
  'featured-assets': 'featuredAssets',
  instagram: 'instagramProfile',
  faq: 'footerCta',
};

const defaultOrder = ['hero', 'featuredAssets', 'instagramProfile', 'services', 'showreel', 'cta', 'footerCta'];

const sectionByKey = (sections = {}) => (key) =>
  Object.values(sections).find((section) => section.section_id === key || section.type === key);

const homeOrderFromCms = (sections = []) => {
  const order = sections
    .filter((section) => section.enabled !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((section) => sectionToHomeKey[section.section_id] || sectionToHomeKey[section.type])
    .filter(Boolean);
  defaultOrder.forEach((key) => {
    if (!order.includes(key)) order.push(key);
  });
  return order;
};

const Home = () => {
  const { page } = useCmsPage('home');
  const cmsSections = page?.sections || [];
  const findSection = sectionByKey(cmsSections);
  const heroSection = findSection('hero');
  const ctaSection = findSection('cta');
  const order = homeOrderFromCms(cmsSections);

  const heroData = heroSection ? {
    headline: heroSection.title,
    subheadline: heroSection.subtitle,
    image: heroSection.media_url,
    buttonText: heroSection.button_text,
    buttonUrl: heroSection.button_link,
  } : null;

  return (
    <main className="page relative overflow-hidden bg-[#070314] text-white">
      <Header />
      {order.map((sectionKey) => {
        const sections = {
          hero: <Hero key="hero" pageData={heroData} />,
          featuredAssets: <OurWorks key="featuredAssets" />,
          instagramProfile: <TransformVision key="instagramProfile" />,
          services: <ServicesSection key="services" />,
          showreel: <ShowreelSection key="showreel" />,
          cta: <HomeCta key="cta" section={ctaSection} />,
          footerCta: <FAQ key="footerCta" />,
        };
        const cmsSection = cmsSections.find((section) => (sectionToHomeKey[section.section_id] || sectionToHomeKey[section.type]) === sectionKey);
        if (cmsSection && cmsSection.enabled === false) return null;
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
