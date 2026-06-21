import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import RightForYou from '../components/RightForYou';
import CoursesSection from '../components/Courses';
import WhatYoullLearn from '../components/WhatYoullLearn';
import TransformVision from '../components/TransformVision';
import StudentVideos from '../components/StudentVideos';
import OurWorks from '../components/OurWorks';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import { usePageData } from '../hooks/usePageData';
import CmsPageRenderer from '../components/cms/CmsPageRenderer';

const Home = () => {
  const { page, loading } = usePageData('home');
  const summary = page?.sections?.summary || {};

  return (
    <main className="page relative bg-[#070314] text-white overflow-hidden">
      <Header />
      <CmsPageRenderer
        page={page}
        loading={loading}
        fallback={(
          <>
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
            <RightForYou />
            <CoursesSection />
            <WhatYoullLearn />
            <TransformVision />
            <StudentVideos />
            <OurWorks />
            <Testimonials />
            <FAQ />
          </>
        )}
      />
      <Footer />
    </main>
  );
};

export default Home;
