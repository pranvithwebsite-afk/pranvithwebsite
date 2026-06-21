import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CoursesSection from '../components/Courses';

const Courses = () => {
  return (
    <main className="page bg-[#070314] text-white">
      <Header />
      <div className="pt-8 pb-10 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">All Courses</h1>
        <p className="mt-4 text-white/65 max-w-xl mx-auto px-6">Explore our complete catalog of professional video editing courses.</p>
      </div>
      <CoursesSection />
      <Footer />
    </main>
  );
};

export default Courses;
