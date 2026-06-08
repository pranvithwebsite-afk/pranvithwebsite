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

const Home = () => {
  return (
    <main className="relative bg-[#070314] text-white overflow-hidden">
      <Header />
      <Hero />
      <RightForYou />
      <CoursesSection />
      <WhatYoullLearn />
      <TransformVision />
      <StudentVideos />
      <OurWorks />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  );
};

export default Home;
