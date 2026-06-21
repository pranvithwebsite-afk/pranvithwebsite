import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import CoursesSection from '../components/Courses';
import ShowreelSection from '../components/ShowreelSection';
import ServicesSection from '../components/ServicesSection';
import ClientTestimonialsSection from '../components/ClientTestimonialsSection';
import TransformVision from '../components/TransformVision';
import StudentVideos from '../components/StudentVideos';
import OurWorks from '../components/OurWorks';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import { usePageData } from '../hooks/usePageData';
import { fetchPublicSettings } from '../lib/api';

const defaultHomeVisibility = {
  hero: true,
  featuredAssets: true,
  instagramProfile: true,
  services: true,
  showreel: true,
  coursesPreview: false,
  studentTestimonials: false,
  cta: true,
  footerCta: true,
  section_order: [
    'hero',
    'featuredAssets',
    'instagramProfile',
    'services',
    'showreel',
    'coursesPreview',
    'studentTestimonials',
    'cta',
    'footerCta',
  ],
};

const homeSectionKeys = defaultHomeVisibility.section_order;
const legacyHomeSectionKeys = {
  showHero: 'hero',
  showFeaturedAssets: 'featuredAssets',
  showInstagramProfile: 'instagramProfile',
  showServices: 'services',
  showShowreel: 'showreel',
  showCoursesPreview: 'coursesPreview',
  showStudentTestimonials: 'studentTestimonials',
  showCta: 'cta',
  showFooterCta: 'footerCta',
  transformVision: 'instagramProfile',
  profile: 'instagramProfile',
  worksPreview: 'showreel',
  testimonials: 'studentTestimonials',
};

const normalizeHomeVisibility = (visibility) => {
  const source = visibility || {};
  const merged = { ...defaultHomeVisibility };
  homeSectionKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) merged[key] = source[key];
  });
  Object.entries(legacyHomeSectionKeys).forEach(([oldKey, newKey]) => {
    if (
      Object.prototype.hasOwnProperty.call(source, oldKey)
      && !Object.prototype.hasOwnProperty.call(source, newKey)
    ) {
      merged[newKey] = source[oldKey];
    }
  });
  const rawOrder = Array.isArray(source.section_order) ? source.section_order : defaultHomeVisibility.section_order;
  const safeOrder = [];
  rawOrder.forEach((key) => {
    const canonicalKey = legacyHomeSectionKeys[key] || key;
    if (homeSectionKeys.includes(canonicalKey) && !safeOrder.includes(canonicalKey)) {
      safeOrder.push(canonicalKey);
    }
  });
  homeSectionKeys.forEach((key) => {
    if (!safeOrder.includes(key)) safeOrder.push(key);
  });
  return { ...merged, section_order: safeOrder };
};

const Home = () => {
  const { page } = usePageData('home');
  const summary = page?.sections?.summary || {};
  const [visibility, setVisibility] = useState(defaultHomeVisibility);

  useEffect(() => {
    let mounted = true;
    fetchPublicSettings()
      .then((settings) => {
        if (mounted) {
          setVisibility(normalizeHomeVisibility(settings?.home_visibility));
        }
      })
      .catch(() => {
        if (mounted) setVisibility(defaultHomeVisibility);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="page relative bg-[#070314] text-white overflow-hidden">
      <Header />
      {visibility.section_order.map((sectionKey) => {
        if (visibility[sectionKey] === false) return null;
        if (sectionKey === 'coursesPreview' && visibility[sectionKey] !== true) return null;
        if (sectionKey === 'studentTestimonials' && visibility[sectionKey] !== true) return null;

        const sections = {
          hero: (
            <React.Fragment key="hero">
              <Hero pageData={page?.sections?.hero} />
              {summary.title && (
                <section className="px-6 py-16">
                  <div className="max-w-5xl mx-auto text-center">
                    <p className="text-sm uppercase text-violet-300 tracking-[0.4em] mb-3">{summary.title}</p>
                    <p className="text-xl md:text-2xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
                      {summary.description}
                    </p>
                  </div>
                </section>
              )}
            </React.Fragment>
          ),
          featuredAssets: <OurWorks key="featuredAssets" />,
          instagramProfile: <TransformVision key="instagramProfile" />,
          services: <ServicesSection key="services" />,
          showreel: <ShowreelSection key="showreel" />,
          coursesPreview: <CoursesSection key="coursesPreview" />,
          studentTestimonials: (
            <React.Fragment key="studentTestimonials">
              <ClientTestimonialsSection />
              <StudentVideos />
              <Testimonials />
            </React.Fragment>
          ),
          cta: <HomeCta key="cta" />,
          footerCta: <FAQ key="footerCta" />,
        };

        return sections[sectionKey] || null;
      })}
      <Footer />
    </main>
  );
};

const HomeCta = () => (
  <section className="relative overflow-hidden px-6 py-20">
    <div className="mx-auto max-w-6xl rounded-3xl border border-violet-500/20 bg-gradient-to-r from-[#1a124a]/70 to-[#0f0830]/60 px-6 py-8 shadow-2xl shadow-violet-950/20 md:px-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">PranvithDOP</p>
          <h2 className="mt-3 text-2xl font-bold text-white md:text-4xl">Ready to create cinematic visuals?</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/65">Explore assets, courses, showreels, and production services built for serious creators.</p>
        </div>
        <a href="/hire" className="group inline-flex shrink-0 items-center gap-3 rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500">
          Book a Project
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
            <ArrowRight size={11} />
          </span>
        </a>
      </div>
    </div>
  </section>
);

export default Home;
