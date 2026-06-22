import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CmsPageRenderer from '../components/cms/CmsPageRenderer';
import { useCmsPage } from '../hooks/useCmsPage';

const Works = () => {
  const { page, loading } = useCmsPage('works');
  return (
    <main className="page min-h-screen bg-[#070314] text-white">
      <Header />
      {loading ? (
        <div className="px-6 py-24 text-center text-white/55">Loading...</div>
      ) : page?.sections?.length ? (
        <CmsPageRenderer page={page} />
      ) : (
        <section className="px-6 py-24 text-center text-white/60">Our Works content is not published yet.</section>
      )}
      <Footer />
    </main>
  );
};

export default Works;
