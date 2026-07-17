import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Play, Star, X } from 'lucide-react';
import { courses, faqs, studentVideos, testimonials, whatYoullLearn } from '../data/mock';
import { fetchPublicSettings } from '../lib/api';
import { handleImageError, safeImageSrc } from '../lib/utils';
import RightForYou from './RightForYou';
import SafeVideoEmbed, { getYouTubeThumbnail } from './SafeVideoEmbed';

const fallbackThumbnail = courses[0]?.image || '';

export const defaultCourseVisibility = {
  courses_enabled: false,
  show_coming_soon: true,
  coming_soon_title: 'Courses Coming Soon',
  coming_soon_subtitle: 'We are preparing premium video editing courses. Stay tuned.',
  coming_soon_button_text: 'Explore Assets',
  coming_soon_button_link: '/assets',
};

export const defaultCoursePageContent = {
  show_right_for_you: true,
  right_for_you_section: null,
  learn_section: null,
  show_course_list: true,
  course_list_section: null,
  videos_section: null,
  reviews_section: null,
  faq_section: null,
  hero: {
    badge: 'Courses',
    heading: 'Master Cinematic Video Editing',
    subtitle: 'Learn practical editing workflows, storytelling, color, sound, and delivery systems for real creator and client projects.',
    button_text: 'Explore Courses',
    button_link: '#courses',
    media_url: fallbackThumbnail,
    video_url: '',
    media_type: 'auto',
    poster_url: '',
  },
  learn_items: whatYoullLearn.map((item, index) => ({
    title: item.tag,
    description: item.desc,
    icon: item.letters,
    enabled: true,
    sort_order: index,
  })),
  testimonial_videos: studentVideos.slice(0, 3).map((item, index) => ({
    student_name: item.name,
    course_name: '',
    thumbnail_image_url: item.thumb || fallbackThumbnail,
    video_type: 'video_url',
    video_url: '',
    review_text: '',
    rating: 5,
    enabled: true,
    sort_order: index,
  })),
  text_reviews: [
    {
      student_name: 'Student',
      student_image_url: '',
      course_name: 'Premiere Pro',
      rating: 5,
      review_text: 'This course helped me understand editing workflow clearly and improved my confidence.',
      enabled: true,
      sort_order: 0,
    },
    {
      student_name: 'Creator',
      student_image_url: '',
      course_name: 'Video Editing',
      rating: 5,
      review_text: 'The lessons are simple, practical, and useful for real editing projects.',
      enabled: true,
      sort_order: 1,
    },
  ],
  comments: testimonials.slice(0, 4).map((item, index) => ({
    student_name: item.name,
    comment_text: item.text,
    date: '',
    enabled: true,
    sort_order: index,
  })),
  faqs: faqs.slice(0, 4).map((item, index) => ({
    question: item.q,
    answer: item.a,
    enabled: true,
    sort_order: index,
  })),
};

export const shouldShowCourseComingSoon = (visibility = defaultCourseVisibility) =>
  visibility.courses_enabled !== true || visibility.show_coming_soon !== false;

export const CourseComingSoon = ({ visibility = defaultCourseVisibility }) => {
  const data = { ...defaultCourseVisibility, ...(visibility || {}) };
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6 py-24">
      <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="cinematic-card relative mx-auto max-w-3xl p-8 text-center backdrop-blur md:p-12">
        <p className="section-eyebrow text-sm">PranvithDOP Courses</p>
        <h1 className="mt-5 text-5xl font-bold tracking-tight text-white md:text-7xl">
          {data.coming_soon_title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
          {data.coming_soon_subtitle}
        </p>
        {data.coming_soon_button_text && data.coming_soon_button_link && (
          <a
            href={data.coming_soon_button_link}
            className="mt-8 inline-flex rounded-full bg-violet-600 px-7 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-violet-900/40 transition hover:-translate-y-0.5 hover:bg-violet-500"
          >
            {data.coming_soon_button_text}
          </a>
        )}
      </div>
    </section>
  );
};

const enabledSorted = (items = []) =>
  [...items].filter((item) => item.enabled !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

const getVideoUrl = (item = {}) => item.video_url || item.media_url || '';

const getPosterUrl = (item = {}, fallback = '') =>
  item.poster_url || item.thumbnail_url || item.thumbnail_image_url || item.image_url || fallback;

const mergeCourseContent = (remote) => ({
  ...defaultCoursePageContent,
  ...(remote || {}),
  hero: {
    ...defaultCoursePageContent.hero,
    ...(remote?.hero || {}),
  },
  learn_items: Array.isArray(remote?.learn_items) ? remote.learn_items : defaultCoursePageContent.learn_items,
  testimonial_videos: Array.isArray(remote?.testimonial_videos) ? remote.testimonial_videos : defaultCoursePageContent.testimonial_videos,
  text_reviews: Array.isArray(remote?.text_reviews) ? remote.text_reviews : defaultCoursePageContent.text_reviews,
  comments: Array.isArray(remote?.comments) ? remote.comments : defaultCoursePageContent.comments,
  faqs: Array.isArray(remote?.faqs) ? remote.faqs : defaultCoursePageContent.faqs,
});

const CoursePageContent = ({ children, contentOverride }) => {
  const [content, setContent] = useState(() => mergeCourseContent(contentOverride));
  const [activeVideo, setActiveVideo] = useState(null);
  const carouselRef = useRef(null);

  useEffect(() => {
    if (contentOverride) {
      setContent(mergeCourseContent(contentOverride));
      return undefined;
    }
    let mounted = true;
    fetchPublicSettings()
      .then((settings) => {
        if (mounted) setContent(mergeCourseContent(settings?.course_page));
      })
      .catch(() => {
        if (mounted) setContent(defaultCoursePageContent);
      });
    return () => {
      mounted = false;
    };
  }, [contentOverride]);

  const learnItems = useMemo(() => enabledSorted(content.learn_items), [content.learn_items]);
  const videoCards = useMemo(() => enabledSorted(content.testimonial_videos), [content.testimonial_videos]);
  const reviews = useMemo(() => enabledSorted(content.text_reviews), [content.text_reviews]);
  const comments = useMemo(() => enabledSorted(content.comments), [content.comments]);
  const faqItems = useMemo(() => enabledSorted(content.faqs), [content.faqs]);
  const learnSection = content.learn_section || {};
  const videosSection = content.videos_section || {};
  const reviewsSection = content.reviews_section || {};
  const faqSection = content.faq_section || {};

  const scrollCarousel = (direction) => {
    carouselRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  };

  return (
    <>
      <section className="relative overflow-hidden px-6 pb-16 pt-32 md:pt-36">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="text-center lg:text-left">
            <p className="section-eyebrow text-sm">{content.hero.badge}</p>
            <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight md:text-7xl">{content.hero.heading}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/68 lg:mx-0">{content.hero.subtitle}</p>
            {content.hero.button_text && (
              <a
                href={content.hero.button_link || '#courses'}
                className="mt-8 inline-flex rounded-full bg-violet-600 px-7 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-violet-900/30 transition hover:-translate-y-0.5 hover:bg-violet-500"
              >
                {content.hero.button_text}
              </a>
            )}
          </div>
          <div className="cinematic-card overflow-hidden">
            {content.hero.video_url ? (
              <SafeVideoEmbed
                videoType={content.hero.media_type || 'video_url'}
                videoUrl={content.hero.video_url}
                title={content.hero.heading || 'Course preview'}
                posterUrl={content.hero.poster_url || content.hero.media_url || fallbackThumbnail}
                className="h-full w-full rounded-none border-0"
                aspectRatio="aspect-[16/10]"
              />
            ) : (
              <img
                src={safeImageSrc(content.hero.media_url || fallbackThumbnail)}
                alt="Course preview"
                className="aspect-[16/10] h-full w-full object-cover"
                loading="lazy"
                onError={handleImageError}
              />
            )}
          </div>
        </div>
      </section>

      {content.show_right_for_you !== false && content.right_for_you_section && <RightForYou section={content.right_for_you_section} />}

      {learnItems.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <p className="section-eyebrow text-sm">{learnSection.title || "What You'll Learn"}</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{learnSection.subtitle || 'Skills that turn timelines into stories.'}</h2>
              {learnSection.description && <p className="mx-auto mt-4 max-w-2xl text-white/62">{learnSection.description}</p>}
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {learnItems.map((item) => (
                <article key={`${item.title}-${item.sort_order}`} className="cinematic-card p-6 transition hover:-translate-y-1">
                  <div className="cinematic-icon mb-5 flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold">
                    {item.icon || '✓'}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/62">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <div id="courses">{children}</div>

      {videoCards.length > 0 && (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="section-eyebrow text-sm">{videosSection.title || 'Student Testimonials'}</p>
                <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
                  {videosSection.subtitle || 'Real people. Real transformations.'}
                </h2>
                <p className="mt-4 max-w-2xl text-white/62">{videosSection.description || 'Hear from our students who mastered video editing.'}</p>
              </div>
              <div className="hidden gap-2 md:flex">
                <button type="button" onClick={() => scrollCarousel(-1)} className="rounded-full border border-purple-300/20 bg-purple-500/10 p-3 text-white hover:bg-purple-500/15"><ArrowLeft size={18} /></button>
                <button type="button" onClick={() => scrollCarousel(1)} className="rounded-full border border-purple-300/20 bg-purple-500/10 p-3 text-white hover:bg-purple-500/15"><ArrowRight size={18} /></button>
              </div>
            </div>

            <div ref={carouselRef} className="-mx-6 flex snap-x gap-5 overflow-x-auto px-6 pb-4 [scrollbar-width:none]">
              {videoCards.map((item, index) => (
                <button
                  key={`${item.student_name}-${index}`}
                  type="button"
                  onClick={() => getVideoUrl(item) && setActiveVideo(item)}
                  className="cinematic-card group relative h-[440px] w-[280px] shrink-0 snap-start overflow-hidden text-left transition hover:-translate-y-1"
                >
                  <img
                    src={safeImageSrc(getPosterUrl(item) || getYouTubeThumbnail(getVideoUrl(item), 'hqdefault') || studentVideos[index % studentVideos.length]?.thumb || fallbackThumbnail)}
                    alt={item.student_name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={handleImageError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600/90 text-white shadow-2xl shadow-violet-900/60 transition group-hover:scale-110">
                      <Play size={24} fill="currentColor" />
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-xl font-bold text-white">{item.student_name}</p>
                    {item.course_name && <p className="mt-1 text-sm text-violet-200">{item.course_name}</p>}
                    {item.review_text && <p className="mt-3 line-clamp-2 text-sm text-white/70">{item.review_text}</p>}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-white/70">Join thousands of students who transformed their editing skills</p>
              <a href="#courses" className="mt-5 inline-flex rounded-full bg-violet-600 px-7 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white hover:bg-violet-500">
                Start Your Journey
              </a>
            </div>
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-4xl font-bold tracking-tight md:text-5xl">{reviewsSection.title || 'Student Reviews'}</h2>
            {reviewsSection.description && <p className="mx-auto mt-4 max-w-2xl text-center text-white/62">{reviewsSection.description}</p>}
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {reviews.map((review) => (
                <article key={`${review.student_name}-${review.sort_order}`} className="cinematic-card p-6">
                  <div className="flex items-center gap-1 text-amber-300">
                    {Array.from({ length: review.rating || 5 }).map((_, index) => <Star key={index} size={15} fill="currentColor" />)}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/72">"{review.review_text}"</p>
                  <div className="mt-5 flex items-center gap-3">
                    {review.student_image_url && <img src={safeImageSrc(review.student_image_url)} alt={review.student_name} className="h-11 w-11 rounded-full object-cover" onError={handleImageError} />}
                    <div>
                      <p className="font-semibold text-white">{review.student_name}</p>
                      {review.course_name && <p className="text-xs uppercase tracking-[0.18em] text-violet-200/70">{review.course_name}</p>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {comments.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-4xl font-bold tracking-tight">Student Comments</h2>
            <div className="mt-8 space-y-4">
              {comments.map((comment) => (
                <article key={`${comment.student_name}-${comment.sort_order}`} className="cinematic-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{comment.student_name}</p>
                    {comment.date && <p className="text-xs text-white/40">{comment.date}</p>}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/65">{comment.comment_text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {faqItems.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-4xl font-bold tracking-tight">{faqSection.title || 'Course FAQ'}</h2>
            {faqSection.description && <p className="mx-auto mt-4 max-w-2xl text-center text-white/62">{faqSection.description}</p>}
            <div className="cinematic-card mt-8 divide-y divide-purple-300/15">
              {faqItems.map((item) => (
                <details key={`${item.question}-${item.sort_order}`} className="group p-6">
                  <summary className="cursor-pointer list-none text-lg font-semibold text-white">{item.question}</summary>
                  <p className="mt-3 text-sm leading-7 text-white/62">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeVideo && (
        <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </>
  );
};

const VideoModal = ({ video, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-8 backdrop-blur">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-purple-300/20 bg-[var(--bg-elevated)]">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-violet-600" aria-label="Close video">
          <X size={18} />
        </button>
        <div className="aspect-video w-full bg-black">
          <SafeVideoEmbed
            videoType={video.video_type || video.media_type}
            videoUrl={getVideoUrl(video)}
            title={`${video.student_name} testimonial video`}
            posterUrl={getPosterUrl(video)}
            className="h-full w-full rounded-none"
            showPlayOverlay={false}
          />
        </div>
      </div>
    </div>
  );
};

export default CoursePageContent;
