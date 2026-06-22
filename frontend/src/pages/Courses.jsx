import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CmsPageRenderer from '../components/cms/CmsPageRenderer';
import { useCmsPage } from '../hooks/useCmsPage';

const Courses = () => {
  const { page, loading } = useCmsPage('courses');
  const settings = page?.settings || {};
  const sections = page?.sections || [];
  const coursesEnabled = settings.courses_enabled === true;
  const visiblePage = coursesEnabled ? page : { ...page, sections: sections.filter((section) => section.section_id === 'coming-soon' || section.type === 'cta') };

  return (
    <main className="page min-h-screen bg-[#070314] text-white">
      <Header />
      {loading ? (
        <div className="px-6 py-24 text-center text-white/55">Loading...</div>
      ) : sections.length > 0 ? (
        <>
          <CmsPageRenderer page={visiblePage} />
        </>
      ) : (
        <section className="px-6 py-24 text-center text-white/60">Courses Coming Soon</section>
      )}
      <Footer />
    </main>
  );
};

export default Courses;
