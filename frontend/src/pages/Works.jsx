import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import OurWorks from '../components/OurWorks';
import StudentVideos from '../components/StudentVideos';

const Works = () => {
  return (
    <main className="bg-[#070314] text-white">
      <Header />
      <section className="pt-36 pb-6 text-center">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          Our{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-300">
            Works
          </span>
        </h1>
        <p className="mt-5 text-white/65 max-w-2xl mx-auto px-6">
          A showcase of real projects, wedding films, reels and brand videos edited by our team.
        </p>
      </section>
      <OurWorks />
      <StudentVideos />
      <Footer />
    </main>
  );
};

export default Works;
