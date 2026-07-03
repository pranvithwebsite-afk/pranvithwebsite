import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Clock3, PlayCircle, Sparkles } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';
import {
  CourseComingSoon,
  defaultCourseVisibility,
  shouldShowCourseComingSoon,
} from '../components/CoursePageContent';
import { courses } from '../data/mock';
import { fetchPublicSettings } from '../lib/api';
import { handleImageError, safeImageSrc } from '../lib/utils';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);

const CourseDetails = () => {
  const { slug } = useParams();
  const [visibility, setVisibility] = useState(defaultCourseVisibility);
  const course = courses.find((item) => item.slug === slug);

  useEffect(() => {
    let mounted = true;
    fetchPublicSettings()
      .then((settings) => {
        if (mounted) {
          setVisibility({
            ...defaultCourseVisibility,
            ...(settings?.course_visibility || {}),
          });
        }
      })
      .catch(() => {
        if (mounted) setVisibility(defaultCourseVisibility);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const courseHighlights = useMemo(() => {
    if (!course) return [];
    return [
      { label: 'Format', value: course.tag || 'Online course', icon: Sparkles },
      { label: 'Content', value: `${course.lectures} lectures`, icon: BookOpen },
      { label: 'Pace', value: 'Learn at your speed', icon: Clock3 },
    ];
  }, [course]);

  if (!course) {
    return <Navigate to="/courses" replace />;
  }

  if (shouldShowCourseComingSoon(visibility)) {
    return (
      <main className="page min-h-screen bg-[var(--bg-main)] text-white">
        <Header />
        <CourseComingSoon visibility={visibility} />
        <Footer />
      </main>
    );
  }

  return (
    <main className="page min-h-screen bg-[var(--bg-main)] text-white">
      <Header />
      <section className="section-block pt-8">
        <div className="page-shell">
          <Link to="/courses" className="mb-6 inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300">
            <ArrowLeft size={16} />
            All Courses
          </Link>

          <div className="cinematic-card overflow-hidden p-5 sm:p-7 lg:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
              <div>
                <div className="overflow-hidden rounded-[24px] border border-violet-500/20">
                  <img src={safeImageSrc(course.image)} alt={course.title} className="aspect-[16/10] h-full w-full object-cover" onError={handleImageError} />
                </div>

                <div className="mt-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-violet-300">{course.tag}</p>
                  <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{course.title}</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">{course.description}</p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {courseHighlights.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-2xl border border-violet-500/15 bg-white/[0.03] px-4 py-4">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                        <Icon size={16} />
                      </div>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-white/40">{label}</p>
                      <p className="mt-2 text-sm font-semibold text-white/90">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-[7.5rem]">
                <div className="rounded-[24px] border border-violet-500/20 bg-[#0b0716] p-5">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Course price</p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <span className="text-3xl font-extrabold text-violet-300 sm:text-4xl">{formatPrice(course.price)}</span>
                    <span className="text-base text-white/35 line-through">{formatPrice(course.oldPrice)}</span>
                  </div>
                  <div className="mt-3 inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-100">
                    {course.discount}
                  </div>
                  <div className="mt-5 grid gap-3">
                    <Link
                      to="/courses"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500"
                    >
                      Explore Courses
                    </Link>
                    <a
                      href="#course-outline"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-5 py-3.5 text-sm font-semibold text-white transition hover:border-violet-400/35 hover:bg-violet-500/15"
                    >
                      <PlayCircle size={16} />
                      View Details
                    </a>
                  </div>
                </div>

                <div id="course-outline" className="rounded-[24px] border border-violet-500/20 bg-[#0b0716] p-5">
                  <p className="text-sm font-semibold text-white">What this landing improves</p>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-white/65">
                    <li>Better mobile stacking for title, price, and CTA.</li>
                    <li>Narrower premium content width on large screens.</li>
                    <li>Clearer price hierarchy and action grouping.</li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default CourseDetails;
