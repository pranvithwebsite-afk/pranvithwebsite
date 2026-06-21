import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import OurWorks from '../components/OurWorks';
import StudentVideos from '../components/StudentVideos';
import { usePageData } from '../hooks/usePageData';
import CmsPageRenderer from '../components/cms/CmsPageRenderer';

const Works = () => {
  const { page, loading } = usePageData('works');
  const legacySections = !Array.isArray(page?.sections) ? page?.sections : {};
  const intro = legacySections?.intro || {};
  const worksFallback = (
    <>
      <section className="pt-12 pb-6 text-center px-6">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          {intro.headline || (
            <>
              Our{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-300">
                Works
              </span>
            </>
          )}
        </h1>
        <p className="mt-5 text-white/65 max-w-2xl mx-auto">
          {intro.description || 'A showcase of real projects, wedding films, reels and brand videos edited by our team.'}
        </p>
      </section>
      <OurWorks />
      <StudentVideos />
    </>
  );

  return (
    <main className="page bg-[#070314] text-white">
      <Header />
      <CmsPageRenderer
        page={page}
        loading={loading}
        slots={{ works: <OurWorks /> }}
        fallback={worksFallback}
      />
      <Footer />
    </main>
  );
};

export default Works;
