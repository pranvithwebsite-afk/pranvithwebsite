import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import RightForYou from '../components/RightForYou';
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
  showHero: true,
  showInstagramProfile: true,
  showServices: true,
  showShowreel: true,
  showFeaturedAssets: true,
  showCoursesPreview: false,
  showStudentTestimonials: false,
  showCta: true,
  showFooterCta: true,
  section_order: [
    'showHero',
    'showInstagramProfile',
    'showServices',
    'showShowreel',
    'showFeaturedAssets',
    'showCoursesPreview',
    'showStudentTestimonials',
    'showCta',
    'showFooterCta',
  ],
};

const homeSectionKeys = defaultHomeVisibility.section_order;

const normalizeHomeVisibility = (visibility) => {
  const merged = { ...defaultHomeVisibility, ...(visibility || {}) };
  const order = Array.isArray(merged.section_order) ? merged.section_order : defaultHomeVisibility.section_order;
  const safeOrder = order.filter((key, index) => homeSectionKeys.includes(key) && order.indexOf(key) === index);
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
        if (sectionKey === 'showCoursesPreview' && visibility[sectionKey] !== true) return null;
        if (sectionKey === 'showStudentTestimonials' && visibility[sectionKey] !== true) return null;

        const sections = {
          showHero: (
            <React.Fragment key="showHero">
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
          showInstagramProfile: <TransformVision key="showInstagramProfile" />,
          showServices: <ServicesSection key="showServices" />,
          showShowreel: <ShowreelSection key="showShowreel" />,
          showFeaturedAssets: <OurWorks key="showFeaturedAssets" />,
          showCoursesPreview: <CoursesSection key="showCoursesPreview" />,
          showStudentTestimonials: (
            <React.Fragment key="showStudentTestimonials">
              <ClientTestimonialsSection />
              <StudentVideos />
              <Testimonials />
            </React.Fragment>
          ),
          showCta: <RightForYou key="showCta" />,
          showFooterCta: <FAQ key="showFooterCta" />,
        };

        return sections[sectionKey] || null;
      })}
      <Footer />
    </main>
  );
};

export default Home;
