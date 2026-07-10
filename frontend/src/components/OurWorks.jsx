import React, { useMemo } from 'react';
import { handleImageError, safeImageSrc, safePublicHref, normalizeWorkItem } from '../lib/utils';
import SafeVideoEmbed, { detectMediaType } from './SafeVideoEmbed';
import OptimizedImage from './OptimizedImage';

const enabledSorted = (items = []) =>
  [...items].filter((item) => item.enabled !== false).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

const OurWorks = ({ section }) => {
  const visibleProjects = useMemo(() => {
    const items = section?.data?.items || section?.items || section?.data?.projects || section?.projects || [];
    return enabledSorted(items.map(normalizeWorkItem).filter(Boolean)).slice(0, 5)
  }, [section]);

  if (!section || visibleProjects.length === 0) return null;

  return (
    <section className="section-block overflow-hidden px-6">
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="section-eyebrow text-xs">{section.data?.eyebrow || 'Our Works'}</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">{section.title || 'Cinematic work, cleanly presented.'}</h2>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-white/70">
            {section.description || section.subtitle || 'Selected films, commercial visuals, drone sequences, and edits from the PranvithDOP portfolio.'}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project, index) => (
            <WorkCard key={project.id || `${project.title}-${index}`} project={project} />
          ))}
        </div>

        {(section.button_text || section.button_link) && (
          <div className="mt-12 text-center">
            <a href={safePublicHref(section.button_link, '/works')} className="inline-flex rounded-full bg-violet-600 px-7 py-3 text-sm font-semibold tracking-wider text-white transition-colors hover:bg-violet-500">
              {section.button_text || 'VIEW ALL WORKS'}
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

const WorkCard = ({ project }) => {
  const { title, category, description, thumbnail_url, video_url } = project;
  const hasVideo = !!video_url;

  return (
    <article className="cinematic-card group overflow-hidden transition hover:-translate-y-1">
      <div className="relative aspect-[16/11] overflow-hidden bg-gradient-to-br from-[#1a102d] via-[#0b0318] to-black">
        {hasVideo ? (
          <SafeVideoEmbed
            videoType={detectMediaType(video_url)}
            videoUrl={video_url}
            title={title}
            posterUrl={thumbnail_url}
            className="h-full w-full rounded-none border-0"
            aspectRatio="aspect-[16/11]"
          />
        ) : thumbnail_url ? (
          <OptimizedImage src={safeImageSrc(thumbnail_url)} alt={title} loading="lazy" className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105 group-hover:opacity-95" onError={handleImageError} />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-semibold uppercase tracking-[0.24em] text-violet-200/70">PranvithDOP</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-transparent to-transparent" />
        <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">{category}</span>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/60">{description}</p>
      </div>
    </article>
  );
}


export default OurWorks;
