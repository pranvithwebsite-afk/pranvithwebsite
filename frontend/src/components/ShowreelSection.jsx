import React from 'react';
import { Link } from 'react-router-dom';
import { portfolioProjects, showreelUrl } from '../data/portfolio';
import { handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';
import SafeVideoEmbed from './SafeVideoEmbed';

const enabledSorted = (items = []) =>
  [...items].filter((item) => item.enabled !== false).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

const ShowreelSection = ({ section }) => {
  const items = enabledSorted(section?.data?.items);
  const previewItems = items.length ? items : (section ? [] : portfolioProjects.slice(1, 4));
  const videoMediaTypes = new Set(['video_file', 'video_url', 'youtube', 'vimeo']);
  const mainVideoUrl = section?.video_url || section?.data?.video_url || (videoMediaTypes.has(section?.media_type) ? section?.media_url : '') || (videoMediaTypes.has(section?.data?.media_type) ? section?.data?.media_url : '') || section?.media_url || section?.data?.media_url || showreelUrl;
  const mainPoster = section?.poster_url || section?.thumbnail_url || section?.image_url || section?.data?.poster_url || section?.data?.thumbnail_url || section?.data?.image_url || portfolioProjects[0].thumbnail;

  if (section && !section.title && !section.description && previewItems.length === 0) return null;

  return (
  <section className="relative overflow-hidden px-6 py-24">
    <div className="absolute inset-x-0 top-1/3 h-64 bg-violet-600/10 blur-3xl" />
    <div className="relative mx-auto max-w-7xl">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">{section?.subtitle || 'Featured Showreel'}</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
            {section?.title || 'A cinematic portfolio of light, movement, and emotion.'}
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-white/65">
          {section?.description || 'Commercials, wedding stories, drone sequences, product frames, and post-production work shaped for premium digital delivery.'}
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-3xl border border-violet-500/20 bg-[#100830]/70 shadow-[0_30px_120px_rgba(124,58,237,0.22)]">
        <SafeVideoEmbed
          videoType={section?.media_type || 'video_url'}
          videoUrl={mainVideoUrl}
          title={section?.title || 'Featured showreel'}
          posterUrl={mainPoster}
          className="rounded-none border-0"
        />
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {previewItems.slice(0, 3).map((project, index) => (
          <div
            key={project.id || `${project.title}-${index}`}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-violet-400/50"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              {project.video_url || project.videoLink ? (
                <SafeVideoEmbed
                  videoType={project.video_type || 'video_url'}
                  videoUrl={project.video_url || project.videoLink}
                  title={project.title}
                  posterUrl={project.thumbnail_image_url || project.thumbnail_url || project.image_url || project.thumbnail}
                  className="h-full w-full rounded-none border-0"
                  aspectRatio="aspect-[16/10]"
                />
              ) : (project.thumbnail_image_url || project.thumbnail_url || project.image_url || project.thumbnail) ? (
                <img src={safeImageSrc(project.thumbnail_image_url || project.thumbnail_url || project.image_url || project.thumbnail)} alt={project.title} className="h-full w-full object-cover opacity-70 transition group-hover:scale-105 group-hover:opacity-90" onError={handleImageError} />
              ) : null}
              <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">{project.category}</span>
            </div>
            <div className="p-5">
              <h3 className="font-semibold text-white">{project.title}</h3>
              <p className="mt-2 text-sm text-white/60">{project.description}</p>
            </div>
          </div>
        ))}
      </div>

      {(section?.button_text || section?.button_link) && (
        <div className="mt-10 text-center">
          <Link to={safePublicHref(section?.button_link, '/works')} className="inline-flex rounded-full border border-violet-400/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-600">
            {section?.button_text || 'View all works'}
          </Link>
        </div>
      )}
    </div>
  </section>
  );
};

export default ShowreelSection;
