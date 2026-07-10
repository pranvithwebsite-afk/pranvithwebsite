import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CoursesSection from '../components/Courses';
import CoursePageContent, { CourseComingSoon, defaultCourseVisibility } from '../components/CoursePageContent';
import { detectMediaType } from '../components/SafeVideoEmbed';
import { usePublicPageLoading } from '../components/PublicPageLoader';
import { useCmsPage } from '../hooks/useCmsPage';

const enabledSorted = (items = []) =>
  [...items].filter((item) => item.enabled !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

const section = (sections, idOrType) =>
  (sections || []).find((item) => item.section_id === idOrType)
  || (sections || []).find((item) => item.type === idOrType);

const sectionByAny = (sections, keys = []) =>
  keys.reduce((found, key) => found || section(sections, key), null);

const firstText = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

const normalizeKey = (value) => String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');

const isComingSoonSection = (item = {}) => {
  const sectionKey = normalizeKey(item.section_key);
  const sectionId = normalizeKey(item.section_id);
  const type = normalizeKey(item.type);
  const title = normalizeKey(item.title);

  if (sectionKey === 'coming-soon' || sectionId === 'coming-soon') return true;
  if (title === 'courses-coming-soon') return true;
  return type === 'cta' && title === 'courses-coming-soon';
};

const normalizeVideoReview = (item = {}, index) => ({
  ...item,
  student_name: item.student_name || item.title || 'Student',
  course_name: item.course_name || item.subtitle || item.category || '',
  review_text: item.review_text || item.description || '',
  thumbnail_image_url: item.thumbnail_image_url || item.thumbnail_url || item.poster_url || item.image_url || '',
  video_type: item.video_type || item.media_type || 'auto',
  video_url: item.video_url || (['video_file', 'video_url', 'youtube', 'vimeo'].includes(item.media_type) || ['video_file', 'video_url', 'youtube', 'vimeo'].includes(detectMediaType(item.media_url)) ? item.media_url : '') || '',
  media_url: item.media_url || '',
  enabled: item.enabled !== false,
  sort_order: item.sort_order ?? index,
});

const normalizeRating = (value) => {
  const rating = Number(value || 5);
  return Number.isFinite(rating) && rating > 0 ? rating : 5;
};

const normalizeTextReview = (item = {}, index) => ({
  ...item,
  student_name: item.student_name || item.title || 'Student',
  course_name: item.course_name || item.subtitle || item.category || '',
  review_text: item.review_text || item.description || '',
  student_image_url: item.student_image_url || item.image_url || '',
  rating: normalizeRating(item.rating || item.meta?.rating),
  enabled: item.enabled !== false,
  sort_order: item.sort_order ?? index,
});

const Courses = () => {
  const { page, loading } = useCmsPage('courses');
  usePublicPageLoading(loading);
  const pageHidden = page?.status === 'hidden';
  const sections = (page?.sections || []).filter((item) => item.enabled !== false);
  const settings = { ...defaultCourseVisibility, ...(page?.settings || {}) };
  const comingSoon = sections.find(isComingSoonSection) || null;
  const showComingSoon = loading || !!comingSoon;
  const hero = section(sections, 'hero') || {};
  const rightForYou = section(sections, 'right-for-you') || {};
  const learn = section(sections, 'what-youll-learn') || section(sections, 'course_showcase') || {};
  const courseList = section(sections, 'course-list') || {};
  const videos = sectionByAny(sections, ['student-videos', 'video_reviews', 'testimonial_videos']) || {};
  const reviews = sectionByAny(sections, ['student-reviews', 'testimonials', 'reviews']) || {};
  const faq = section(sections, 'faq') || {};

  const courseContent = {
    hero: {
      badge: firstText(hero.subtitle, hero.data?.subtitle, hero.data?.badge, hero.data?.badge_text),
      heading: firstText(hero.title, hero.data?.title, hero.data?.heading, hero.data?.heroTitle, hero.data?.hero_title, page?.title),
      subtitle: firstText(hero.description, hero.data?.description, hero.data?.subtitle, page?.subtitle),
      button_text: firstText(hero.button_text, hero.data?.button_text, hero.data?.primary_button_text),
      button_link: firstText(hero.button_link, hero.data?.button_link, hero.data?.primary_button_link),
      media_url: firstText(hero.media_url, hero.data?.media_url, hero.data?.hero_media_url, hero.data?.image_url),
      video_url: firstText(hero.video_url, hero.data?.video_url, ['video_file', 'video_url', 'youtube', 'vimeo'].includes(hero.media_type) ? hero.media_url : '', ['video_file', 'video_url', 'youtube', 'vimeo'].includes(hero.data?.media_type) ? hero.data?.media_url : '', ['video_file', 'video_url', 'youtube', 'vimeo'].includes(detectMediaType(hero.media_url)) ? hero.media_url : '', ['video_file', 'video_url', 'youtube', 'vimeo'].includes(detectMediaType(hero.data?.media_url)) ? hero.data?.media_url : ''),
      media_type: firstText(hero.media_type, hero.data?.media_type, hero.data?.hero_media_type),
      poster_url: firstText(hero.poster_url, hero.thumbnail_url, hero.image_url, hero.data?.poster_url, hero.data?.thumbnail_url, hero.data?.image_url),
    },
    show_right_for_you: !!rightForYou.section_id,
    right_for_you_section: rightForYou.section_id ? rightForYou : null,
    learn_section: learn.section_id ? learn : null,
    course_list_section: courseList.section_id ? courseList : null,
    videos_section: videos.section_id ? videos : null,
    reviews_section: reviews.section_id ? reviews : null,
    faq_section: faq.section_id ? faq : null,
    show_course_list: courseList.section_id ? courseList.data?.show_course_list !== false : false,
    learn_items: enabledSorted(learn.data?.items),
    testimonial_videos: enabledSorted(videos.data?.items).map(normalizeVideoReview),
    text_reviews: enabledSorted(reviews.data?.items).map(normalizeTextReview),
    comments: [],
    faqs: enabledSorted(faq.data?.items).map((item, index) => ({
      question: item.question || item.title,
      answer: item.answer || item.description,
      enabled: item.enabled !== false,
      sort_order: item.sort_order ?? index,
    })),
  };

  return (
    <>
      <Header />
      <main className="page bg-transparent text-white">
        {!loading && pageHidden ? (
          <CourseComingSoon visibility={settings} />
        ) : showComingSoon ? (
          <CourseComingSoon
            visibility={{
              ...settings,
              coming_soon_title: comingSoon?.title || settings.coming_soon_title,
              coming_soon_subtitle: comingSoon?.subtitle || settings.coming_soon_subtitle,
              coming_soon_button_text: comingSoon?.button_text || settings.coming_soon_button_text,
              coming_soon_button_link: comingSoon?.button_link || settings.coming_soon_button_link,
            }}
          />
        ) : (
          <CoursePageContent contentOverride={courseContent}>
            {courseContent.show_course_list && <CoursesSection section={courseContent.course_list_section} />}
          </CoursePageContent>
        )}
      </main>
      <Footer />
    </>
  );
};

export default Courses;
