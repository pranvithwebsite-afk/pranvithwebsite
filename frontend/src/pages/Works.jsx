import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import OurWorks from '../components/OurWorks';
import StudentVideos from '../components/StudentVideos';
import { usePageData } from '../hooks/usePageData';

const Works = () => {
  const { page } = usePageData('works');
  const intro = page?.sections?.intro || {};

  return (
    <main className="page bg-[#070314] text-white">
      <Header />
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
      <Footer />
    </main>
  );
};

export default Works;
