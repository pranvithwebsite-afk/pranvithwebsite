import React from 'react';
import { ArrowRight } from 'lucide-react';
import SafeVideoEmbed, { detectMediaType } from '../SafeVideoEmbed';
import { handleImageError, safeImageSrc } from '../../lib/utils';
import OptimizedImage from '../OptimizedImage';

const enabledItems = (items = []) =>
  [...items].filter((item) => item?.enabled !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

const videoMediaTypes = new Set(['video_file', 'video_url', 'youtube', 'vimeo']);

const firstText = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

const mediaTypeFor = (value = {}) => value.media_type || value.data?.media_type || detectMediaType(value.video_url || value.media_url || value.data?.video_url || value.data?.media_url);

const getVideoUrl = (value = {}) => {
  const data = value.data || {};
  const sectionMediaType = mediaTypeFor(value);
  const dataMediaType = data.media_type || detectMediaType(data.media_url);
  return firstText(
    value.video_url,
    data.video_url,
    videoMediaTypes.has(sectionMediaType) ? value.media_url : '',
    videoMediaTypes.has(dataMediaType) ? data.media_url : '',
    videoMediaTypes.has(detectMediaType(value.media_url)) ? value.media_url : '',
    videoMediaTypes.has(detectMediaType(data.media_url)) ? data.media_url : ''
  );
};

const getPosterUrl = (value = {}) => {
  const data = value.data || {};
  return firstText(
    value.poster_url,
    value.thumbnail_url,
    value.thumbnail_image_url,
    value.image_url,
    data.poster_url,
    data.thumbnail_url,
    data.thumbnail_image_url,
    data.image_url
  );
};

const MediaBlock = ({ section }) => {
  const data = section.data || {};
  const videoUrl = getVideoUrl(section);
  const url = videoUrl || section.media_url || data.media_url;
  if (!url) return null;
  const mediaType = section.media_type || data.media_type || detectMediaType(url);
  if (videoUrl || videoMediaTypes.has(mediaType)) {
    return (
      <SafeVideoEmbed
        videoType={mediaType}
        videoUrl={url}
        posterUrl={getPosterUrl(section)}
        title={section.title}
        className="w-full rounded-2xl"
      />
    );
  }
  return <OptimizedImage src={safeImageSrc(url)} alt={section.title || 'CMS media'} width={960} height={540} className="aspect-video w-full rounded-2xl object-cover" onError={handleImageError} />;
};

const CmsSectionRenderer = ({ section, children }) => {
  if (!section || section.enabled === false) return null;
  const data = section.data || {};
  const items = enabledItems(data.items || section.cards || []);

  if (section.type === 'contact_form') {
    return children || null;
  }

  if (section.type === 'hero') {
    return (
      <section className="relative overflow-hidden px-6 py-16 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,77,0,0.16),transparent_45%)]" />
        <div className="relative mx-auto max-w-5xl">
          {section.subtitle && <p className="section-eyebrow text-xs">{section.subtitle}</p>}
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">{section.title}</h1>
          {section.description && <p className="mx-auto mt-6 max-w-3xl text-white/68">{section.description}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {section.button_text && section.button_link && (
              <a href={section.button_link} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500">
                {section.button_text} <ArrowRight size={14} />
              </a>
            )}
            {data.secondary_button_text && data.secondary_button_link && (
              <a href={data.secondary_button_link} className="rounded-full border border-purple-300/20 px-6 py-3 text-sm font-semibold text-white hover:border-purple-300/35 hover:bg-purple-500/15">
                {data.secondary_button_text}
              </a>
            )}
          </div>
          {(section.media_url || section.video_url || data.video_url) && <div className="mx-auto mt-10 max-w-4xl"><MediaBlock section={section} /></div>}
        </div>
      </section>
    );
  }

  if (section.type === 'image_text') {
    return (
      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <MediaBlock section={section} />
          <div>
            {section.subtitle && <p className="section-eyebrow text-xs">{section.subtitle}</p>}
            <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{section.title}</h2>
            {section.description && <p className="mt-5 text-lg leading-8 text-white/68">{section.description}</p>}
            {section.button_text && section.button_link && <a href={section.button_link} className="mt-7 inline-flex rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500">{section.button_text}</a>}
          </div>
        </div>
      </section>
    );
  }

  if (['services_cards', 'course_showcase', 'reviews', 'faq', 'gallery', 'portfolio_grid', 'product_showcase'].includes(section.type)) {
    return (
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            {section.subtitle && <p className="section-eyebrow text-xs">{section.subtitle}</p>}
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{section.title}</h2>
            {section.description && <p className="mx-auto mt-4 max-w-3xl text-white/62">{section.description}</p>}
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {items.map((item, index) => (
              <article key={`${item.title || item.question || index}`} className="cinematic-card p-6">
                {getVideoUrl(item) ? (
                  <SafeVideoEmbed
                    videoType={mediaTypeFor(item)}
                    videoUrl={getVideoUrl(item)}
                    posterUrl={getPosterUrl(item)}
                    title={item.title || item.student_name || 'Video'}
                    className="mb-5 w-full rounded-xl"
                  />
                ) : (item.thumbnail_url || item.thumbnail_image_url || item.image_url) && (
                  <OptimizedImage src={safeImageSrc(item.thumbnail_url || item.thumbnail_image_url || item.image_url)} alt={item.title || 'Item'} width={420} height={236} className="mb-5 aspect-video w-full rounded-xl object-cover" onError={handleImageError} />
                )}
                <h3 className="text-xl font-semibold text-white">{item.title || item.question || item.student_name}</h3>
                <p className="mt-3 text-sm leading-7 text-white/62">{item.description || item.answer || item.review_text || item.comment_text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (['video', 'showreel'].includes(section.type)) {
    return (
      <section className="px-6 py-16">
        <div className="cinematic-card mx-auto grid max-w-7xl gap-8 p-6 lg:grid-cols-2 lg:items-center">
          <div>
            {section.subtitle && <p className="section-eyebrow text-xs">{section.subtitle}</p>}
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{section.title}</h2>
            {section.description && <p className="mt-4 text-white/65">{section.description}</p>}
          </div>
          <MediaBlock section={section} />
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-14">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold md:text-5xl">{section.title}</h2>
        {section.description && <p className="mt-5 text-white/65">{section.description}</p>}
      </div>
    </section>
  );
};

export default CmsSectionRenderer;
