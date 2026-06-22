import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CmsPageRenderer from '../components/cms/CmsPageRenderer';
import { useCmsPage } from '../hooks/useCmsPage';

const Home = () => {
  const { page, loading } = useCmsPage('home');
  const sections = page?.sections || [];

  return (
    <main className="page relative min-h-screen overflow-hidden bg-[#070314] text-white">
      <Header />
      {loading ? (
        <div className="px-6 py-24 text-center text-white/55">Loading...</div>
      ) : sections.length > 0 ? (
        <CmsPageRenderer page={page} />
      ) : (
        <section className="px-6 py-24 text-center text-white/60">Home page content is not published yet.</section>
      )}
      <Footer />
    </main>
  );
};

export default Home;
