import React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { courses } from '../data/mock';
import { handleImageError, safeImageSrc } from '../lib/utils';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);

const CourseDetails = () => {
  const { slug } = useParams();
  const course = courses.find((item) => item.slug === slug);

  if (!course) {
    return <Navigate to="/courses" replace />;
  }

  return (
    <main className="min-h-screen bg-[#070314] text-white">
      <Header />
      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-24 pt-32 lg:grid-cols-2 lg:items-center">
        <div className="overflow-hidden rounded-3xl border border-violet-500/20">
          <img src={safeImageSrc(course.image)} alt={course.title} className="aspect-[16/10] h-full w-full object-cover" onError={handleImageError} />
        </div>
        <div>
          <Link to="/courses" className="mb-6 inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300">
            <ArrowLeft size={16} />
            All Courses
          </Link>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-400">{course.tag}</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">{course.title}</h1>
          <p className="mt-6 text-lg leading-relaxed text-white/65">{course.description}</p>
          <div className="mt-6 flex items-center gap-2 text-white/75">
            <BookOpen size={18} className="text-violet-400" />
            {course.lectures} lectures
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold">{formatPrice(course.price)}</span>
            <span className="text-lg text-white/40 line-through">{formatPrice(course.oldPrice)}</span>
            <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold">{course.discount}</span>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default CourseDetails;
