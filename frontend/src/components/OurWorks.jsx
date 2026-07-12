import React, { useMemo, useState } from 'react';
import { handleImageError, safeImageSrc, safePublicHref, normalizeWorkItem } from '../lib/utils';
import SafeVideoEmbed, { detectMediaType } from './SafeVideoEmbed';
import OptimizedImage from './OptimizedImage';
import VideoModal from './VideoModal';

const enabledSorted = (items = []) =>
  [...items].filter((item) => item.enabled !== false).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

const OurWorks = ({ section }) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const projects = useMemo(() => {
    const items = section?.data?.items || section?.items || section?.data?.projects || section?.projects || [];
    return enabledSorted(items.map(normalizeWorkItem).filter(Boolean));
  }, [section]);
  const categories = useMemo(() => ['All', ...new Set(projects.map((project) => project.category || 'Other'))], [projects]);
  const visibleProjects = useMemo(() => (
    (activeCategory === 'All' ? projects : projects.filter((project) => project.category === activeCategory)).slice(0, 5)
  ), [activeCategory, projects]);

  if (!section || projects.length === 0) return null;

  return (
    <section className="section-block site-section--base px-6">
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="section-eyebrow text-xs">{section.data?.eyebrow || 'Our Works'}</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">{section.title || 'Cinematic work, cleanly presented.'}</h2>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-white/70">
            {section.description || section.subtitle || 'Selected films, commercial visuals, drone sequences, and edits from the PranvithDOP portfolio.'}
          </p>
        </div>

        {categories.length > 1 && (
          <div className="-mx-2 mb-8 flex gap-2 overflow-x-auto px-2 pb-2 md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur transition ${activeCategory === category
                  ? 'border-violet-400/60 bg-violet-600 text-white shadow-[0_8px_24px_rgba(124,58,237,0.28)]'
                  : 'border-white/10 bg-black/30 text-white/70 hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white'}`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project, index) => (
            <WorkCard key={project.id || `${project.title}-${index}`} project={project} onPlay={() => setSelectedVideo(project)} />
          ))}
        </div>

        {(section.button_text || section.button_link) && (
          <div className="mt-12 text-center">
            <a href={safePublicHref(section.button_link, '/works')} className="inline-flex rounded-full bg-violet-600 px-7 py-3 text-sm font-semibold tracking-wider text-white transition-colors hover:bg-violet-500">
              {section.button_text || 'VIEW ALL WORKS'}
            </a>
          </div>
        )}
        <VideoModal open={!!selectedVideo} onClose={() => setSelectedVideo(null)} videoUrl={selectedVideo?.video_url} title={selectedVideo?.title} posterUrl={selectedVideo?.thumbnail_url} />
      </div>
    </section>
  );
};

const WorkCard = ({ project, onPlay }) => {
  const { title, category, description, thumbnail_url, video_url } = project;
  const hasVideo = !!video_url;

  return (
    <article className="cinematic-card group overflow-hidden transition hover:-translate-y-1">
      <div className="relative aspect-video overflow-hidden rounded-t-[inherit] bg-gradient-to-br from-[#1a102d] via-[#0b0318] to-black">
        {hasVideo ? (
          <SafeVideoEmbed
            videoType={detectMediaType(video_url)}
            videoUrl={video_url}
            title={title}
            posterUrl={thumbnail_url}
            className="h-full w-full rounded-none border-0"
            aspectRatio="aspect-video"
            loadOnInteractionOnly
            onPlay={onPlay}
          />
        ) : thumbnail_url ? (
          <OptimizedImage src={safeImageSrc(thumbnail_url)} alt={title} width={640} height={360} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={handleImageError} />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-semibold uppercase tracking-[0.24em] text-violet-200/70">PranvithDOP</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-transparent to-transparent" />
        <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">{category || 'Other'}</span>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/60">{description}</p>
      </div>
    </article>
  );
}


export default OurWorks;
