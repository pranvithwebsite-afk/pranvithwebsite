import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CoursesSection from '../components/Courses';
import CoursePageContent, { CourseComingSoon, defaultCourseVisibility } from '../components/CoursePageContent';
import { useCmsPage } from '../hooks/useCmsPage';

const enabledSorted = (items = []) =>
  [...items].filter((item) => item.enabled !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

const section = (sections, idOrType) =>
  (sections || []).find((item) => item.section_id === idOrType || item.type === idOrType);

const Courses = () => {
  const { page } = useCmsPage('courses');
  const sections = page?.sections || [];
  const settings = { ...defaultCourseVisibility, ...(page?.settings || {}) };
  const comingSoon = section(sections, 'coming-soon') || {};
  const hero = section(sections, 'hero') || {};
  const learn = section(sections, 'what-youll-learn') || section(sections, 'course_showcase') || {};
  const videos = section(sections, 'testimonial_videos') || {};
  const reviews = section(sections, 'reviews') || {};
  const faq = section(sections, 'faq') || {};
  const coursesEnabled = settings.courses_enabled === true;

  const courseContent = {
    hero: {
      heading: hero.title || page?.title,
      subtitle: hero.description || page?.subtitle,
      button_text: hero.button_text,
      button_link: hero.button_link,
      media_url: hero.media_url,
    },
    learn_items: enabledSorted(learn.data?.items),
    testimonial_videos: enabledSorted(videos.data?.items),
    text_reviews: enabledSorted(reviews.data?.items),
    comments: [],
    faqs: enabledSorted(faq.data?.items).map((item, index) => ({
      question: item.question || item.title,
      answer: item.answer || item.description,
      enabled: item.enabled !== false,
      sort_order: item.sort_order ?? index,
    })),
  };

  return (
    <main className="page bg-[#070314] text-white">
      <Header />
      {!coursesEnabled || settings.show_coming_soon !== false ? (
        <CourseComingSoon
          visibility={{
            ...settings,
            coming_soon_title: comingSoon.title || settings.coming_soon_title,
            coming_soon_subtitle: comingSoon.subtitle || settings.coming_soon_subtitle,
            coming_soon_button_text: comingSoon.button_text || settings.coming_soon_button_text,
            coming_soon_button_link: comingSoon.button_link || settings.coming_soon_button_link,
          }}
        />
      ) : (
        <CoursePageContent contentOverride={courseContent}>
          <CoursesSection />
        </CoursePageContent>
      )}
      <Footer />
    </main>
  );
};

export default Courses;
