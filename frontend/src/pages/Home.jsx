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
          setVisibility({
            ...defaultHomeVisibility,
            ...(settings?.home_visibility || {}),
          });
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
      {visibility.showHero !== false && <Hero pageData={page?.sections?.hero} />}

      {visibility.showHero !== false && summary.title && (
        <section className="px-6 py-16">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-sm uppercase text-violet-300 tracking-[0.4em] mb-3">{summary.title}</p>
            <p className="text-xl md:text-2xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
              {summary.description}
            </p>
          </div>
        </section>
      )}

      {visibility.showCta !== false && <RightForYou />}
      {visibility.showShowreel !== false && <ShowreelSection />}
      {visibility.showServices !== false && <ServicesSection />}
      {visibility.showStudentTestimonials === true && <ClientTestimonialsSection />}
      {visibility.showCoursesPreview === true && <CoursesSection />}
      {visibility.showInstagramProfile !== false && <TransformVision />}
      {visibility.showStudentTestimonials === true && <StudentVideos />}
      {visibility.showFeaturedAssets !== false && <OurWorks />}
      {visibility.showStudentTestimonials === true && <Testimonials />}
      {visibility.showFooterCta !== false && <FAQ />}
      <Footer />
    </main>
  );
};

export default Home;
