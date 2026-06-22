import React from 'react';
import { ArrowRight } from 'lucide-react';
import SafeVideoEmbed from '../SafeVideoEmbed';
import { handleImageError, safeImageSrc } from '../../lib/utils';

const enabledItems = (items = []) =>
  [...items].filter((item) => item?.enabled !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

const MediaBlock = ({ section }) => {
  const url = section.media_url;
  if (!url) return null;
  if (section.media_type === 'video_file' || section.media_type === 'youtube' || section.media_type === 'vimeo') {
    return <SafeVideoEmbed videoType={section.media_type} videoUrl={url} poster={section.poster_url} title={section.title} className="w-full rounded-2xl" />;
  }
  return <img src={safeImageSrc(url)} alt={section.title || 'CMS media'} className="aspect-video w-full rounded-2xl object-cover" onError={handleImageError} />;
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.22),transparent_45%)]" />
        <div className="relative mx-auto max-w-5xl">
          {section.subtitle && <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">{section.subtitle}</p>}
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl">{section.title}</h1>
          {section.description && <p className="mx-auto mt-6 max-w-3xl text-white/68">{section.description}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {section.button_text && section.button_link && (
              <a href={section.button_link} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500">
                {section.button_text} <ArrowRight size={14} />
              </a>
            )}
            {data.secondary_button_text && data.secondary_button_link && (
              <a href={data.secondary_button_link} className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                {data.secondary_button_text}
              </a>
            )}
          </div>
          {section.media_url && <div className="mx-auto mt-10 max-w-4xl"><MediaBlock section={section} /></div>}
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
            {section.subtitle && <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">{section.subtitle}</p>}
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
            {section.subtitle && <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">{section.subtitle}</p>}
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{section.title}</h2>
            {section.description && <p className="mx-auto mt-4 max-w-3xl text-white/62">{section.description}</p>}
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {items.map((item, index) => (
              <article key={`${item.title || item.question || index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                {(item.thumbnail_url || item.thumbnail_image_url || item.image_url) && (
                  <img src={safeImageSrc(item.thumbnail_url || item.thumbnail_image_url || item.image_url)} alt={item.title || 'Item'} className="mb-5 aspect-video w-full rounded-xl object-cover" onError={handleImageError} />
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
        <div className="mx-auto grid max-w-7xl gap-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 lg:grid-cols-2 lg:items-center">
          <div>
            {section.subtitle && <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">{section.subtitle}</p>}
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
