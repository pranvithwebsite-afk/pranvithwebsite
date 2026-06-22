import React, { useMemo } from 'react';
import { Play } from 'lucide-react';
import { handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';

const enabledSorted = (items = []) =>
  [...items].filter((item) => item.enabled !== false).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

const OurWorks = ({ section }) => {
  const visibleProjects = useMemo(() => enabledSorted(section?.data?.items).slice(0, 5), [section]);
  if (!section) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#070314] via-[#0a0420] to-[#070314] px-6 py-24">
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">Our Works</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">{section.title || 'Cinematic work, cleanly presented.'}</h2>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-white/70">
            {section.description || section.subtitle || 'Selected films, commercial visuals, drone sequences, and edits from the PranvithDOP portfolio.'}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project, index) => (
            <a
              key={`${project.title}-${index}`}
              href={safePublicHref(project.video_url || project.button_link, '/works')}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-violet-400/50"
            >
              <div className="relative aspect-[16/11] overflow-hidden bg-gradient-to-br from-violet-950 via-slate-950 to-black">
                {project.thumbnail_image_url || project.thumbnail_url || project.image_url ? (
                  <img src={safeImageSrc(project.thumbnail_image_url || project.thumbnail_url || project.image_url)} alt={project.title} className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105 group-hover:opacity-95" onError={handleImageError} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-semibold uppercase tracking-[0.24em] text-violet-200/70">PranvithDOP</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070314] via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">{project.category}</span>
                <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/90 text-white opacity-0 transition group-hover:opacity-100">
                  <Play size={15} fill="currentColor" />
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-white">{project.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/60">{project.description}</p>
              </div>
            </a>
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

export default OurWorks;
