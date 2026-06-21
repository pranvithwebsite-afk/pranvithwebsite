import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Play, Star, X } from 'lucide-react';
import { courses, faqs, studentVideos, testimonials, whatYoullLearn } from '../data/mock';
import { fetchPublicSettings } from '../lib/api';
import { handleImageError, safeImageSrc } from '../lib/utils';
import RightForYou from './RightForYou';

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
  hero: {
    heading: 'Master Cinematic Video Editing',
    subtitle: 'Learn practical editing workflows, storytelling, color, sound, and delivery systems for real creator and client projects.',
    button_text: 'Explore Courses',
    button_link: '#courses',
    media_url: fallbackThumbnail,
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
      <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl shadow-violet-950/30 backdrop-blur md:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.35em] text-violet-300">PranvithDOP Courses</p>
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

const getYoutubeId = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '');
    if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
    const embed = parsed.pathname.match(/\/embed\/([^/?]+)/);
    return embed?.[1] || '';
  } catch {
    return '';
  }
};

const getVimeoId = (url) => {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/(?:video\/)?(\d+)/);
    return match?.[1] || '';
  } catch {
    return '';
  }
};

const isDirectVideo = (url = '') => /\.(mp4|webm)(\?.*)?$/i.test(url);

const getEmbedUrl = (video) => {
  const url = video?.video_url || '';
  if (!url) return '';
  if (video.video_type === 'youtube' || /youtu\.?be|youtube\.com/i.test(url)) {
    const id = getYoutubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?rel=0` : '';
  }
  if (video.video_type === 'vimeo' || /vimeo\.com/i.test(url)) {
    const id = getVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}` : '';
  }
  return '';
};

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

const CoursePageContent = ({ children }) => {
  const [content, setContent] = useState(defaultCoursePageContent);
  const [activeVideo, setActiveVideo] = useState(null);
  const carouselRef = useRef(null);

  useEffect(() => {
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
  }, []);

  const learnItems = useMemo(() => enabledSorted(content.learn_items), [content.learn_items]);
  const videoCards = useMemo(() => enabledSorted(content.testimonial_videos), [content.testimonial_videos]);
  const reviews = useMemo(() => enabledSorted(content.text_reviews), [content.text_reviews]);
  const comments = useMemo(() => enabledSorted(content.comments), [content.comments]);
  const faqItems = useMemo(() => enabledSorted(content.faqs), [content.faqs]);

  const scrollCarousel = (direction) => {
    carouselRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  };

  return (
    <>
      <section className="relative overflow-hidden px-6 pb-16 pt-10">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-300">Courses</p>
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
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-violet-950/30">
            <img
              src={safeImageSrc(content.hero.media_url || fallbackThumbnail)}
              alt="Course preview"
              className="aspect-[16/10] h-full w-full object-cover"
              loading="lazy"
              onError={handleImageError}
            />
          </div>
        </div>
      </section>

      {content.show_right_for_you !== false && <RightForYou />}

      {learnItems.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-300">What You'll Learn</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">Skills that turn timelines into stories.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {learnItems.map((item) => (
                <article key={`${item.title}-${item.sort_order}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-violet-300/30">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 text-sm font-bold text-violet-100">
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
                <p className="text-sm font-bold uppercase tracking-[0.35em] text-violet-300">Student Testimonials</p>
                <h2 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
                  Real people. Real transformations.
                </h2>
                <p className="mt-4 max-w-2xl text-white/62">Hear from our students who mastered video editing.</p>
              </div>
              <div className="hidden gap-2 md:flex">
                <button type="button" onClick={() => scrollCarousel(-1)} className="rounded-full border border-white/10 bg-white/5 p-3 text-white hover:bg-violet-600"><ArrowLeft size={18} /></button>
                <button type="button" onClick={() => scrollCarousel(1)} className="rounded-full border border-white/10 bg-white/5 p-3 text-white hover:bg-violet-600"><ArrowRight size={18} /></button>
              </div>
            </div>

            <div ref={carouselRef} className="-mx-6 flex snap-x gap-5 overflow-x-auto px-6 pb-4 [scrollbar-width:none]">
              {videoCards.map((item, index) => (
                <button
                  key={`${item.student_name}-${index}`}
                  type="button"
                  onClick={() => item.video_url && setActiveVideo(item)}
                  className="group relative h-[440px] w-[280px] shrink-0 snap-start overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] text-left shadow-xl shadow-black/25 transition hover:-translate-y-1 hover:border-violet-300/40"
                >
                  <img
                    src={safeImageSrc(item.thumbnail_image_url || studentVideos[index % studentVideos.length]?.thumb || fallbackThumbnail)}
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
            <h2 className="text-center text-4xl font-bold tracking-tight md:text-5xl">Student Reviews</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {reviews.map((review) => (
                <article key={`${review.student_name}-${review.sort_order}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
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
                <article key={`${comment.student_name}-${comment.sort_order}`} className="rounded-2xl border border-white/10 bg-black/20 p-5">
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
            <h2 className="text-center text-4xl font-bold tracking-tight">Course FAQ</h2>
            <div className="mt-8 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.04]">
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
  const embedUrl = getEmbedUrl(video);
  const direct = video.video_type === 'video_file' || isDirectVideo(video.video_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-8 backdrop-blur">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#090316]">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-violet-600" aria-label="Close video">
          <X size={18} />
        </button>
        <div className="aspect-video w-full bg-black">
          {direct ? (
            <video src={video.video_url} poster={video.thumbnail_image_url} className="h-full w-full" controls playsInline preload="metadata" />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              title={`${video.student_name} testimonial video`}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/60">Video unavailable</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePageContent;
