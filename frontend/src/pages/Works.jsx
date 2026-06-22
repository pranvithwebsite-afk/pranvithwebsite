import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Play } from 'lucide-react';
import { handleImageError, safeImageSrc } from '../lib/utils';
import SafeVideoEmbed from '../components/SafeVideoEmbed';
import { useCmsPage } from '../hooks/useCmsPage';

const filters = ['All', 'Commercial', 'Wedding', 'Drone', 'Editing', 'Product', 'Film'];

const enabledSorted = (items = []) =>
  [...items].filter((item) => item.enabled !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

const section = (sections, idOrType) =>
  (sections || []).find((item) => item.section_id === idOrType || item.type === idOrType);

const Works = () => {
  const { page } = useCmsPage('works');
  const [active, setActive] = useState('All');
  const sections = page?.sections || [];
  const hero = section(sections, 'hero') || {};
  const showreel = section(sections, 'showreel') || {};
  const projectsSection = section(sections, 'projects') || section(sections, 'portfolio_grid') || {};
  const allProjects = useMemo(() => enabledSorted(projectsSection.data?.items || []), [projectsSection.data]);
  const projects = useMemo(() => (
    active === 'All' ? allProjects : allProjects.filter((project) => project.category === active)
  ), [active, allProjects]);
  const visibleCategories = useMemo(() => {
    const available = new Set(allProjects.map((project) => project.category).filter(Boolean));
    const categoryFilters = filters.filter((filter) => filter === 'All' || available.has(filter));
    return categoryFilters.length > 1 ? categoryFilters : filters;
  }, [allProjects]);

  return (
    <main className="page bg-[#070314] text-white">
      <Header />
      {hero.enabled !== false && (
        <section className="relative overflow-hidden px-6 pb-12 pt-16 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.22),transparent_45%)]" />
          <div className="relative mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-violet-300">{hero.subtitle || 'PORTFOLIO'}</p>
            <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-7xl">{hero.title || page?.title || 'Films, commercials, aerials, and edits crafted for impact.'}</h1>
            <p className="mx-auto mt-6 max-w-3xl text-white/65">{hero.description || page?.subtitle}</p>
          </div>
        </section>
      )}

      {showreel.enabled !== false && (
        <section className="px-6 pb-16 pt-8">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-violet-300">{showreel.subtitle || 'FEATURED SHOWREEL'}</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">{showreel.title || 'A cinematic portfolio of light, movement, and emotion.'}</h2>
              <p className="mt-4 text-sm leading-7 text-white/65 md:text-base">{showreel.description}</p>
              {showreel.button_text && showreel.button_link && (
                <a href={showreel.button_link} className="mt-6 inline-flex rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500">
                  {showreel.button_text}
                </a>
              )}
            </div>
            <div className="group relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950 via-slate-950 to-black">
              {showreel.media_url ? (
                <SafeVideoEmbed
                  videoType={showreel.media_type}
                  videoUrl={showreel.media_url}
                  title={showreel.title}
                  poster={showreel.poster_url}
                  className="h-full w-full rounded-none"
                />
              ) : (
                <>
                  {showreel.poster_url && (
                    <img src={safeImageSrc(showreel.poster_url)} alt={showreel.title} className="h-full w-full object-cover opacity-75 transition group-hover:scale-105 group-hover:opacity-95" onError={handleImageError} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600/90 text-white shadow-2xl shadow-violet-900/50 transition group-hover:scale-110">
                      <Play size={24} fill="currentColor" />
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <section id="works-grid" className="px-6 pb-24 pt-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {visibleCategories.map((filter) => (
              <button
                key={filter}
                onClick={() => setActive(filter)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active === filter
                    ? 'border-violet-400 bg-violet-600 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-violet-400/60 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {projects.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => (
                <ProjectCard key={`${project.title}-${index}`} project={project} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-12 text-center text-white/60">
              Portfolio projects are not published yet.
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
};

const ProjectCard = ({ project }) => (
  <div className="group h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-1 hover:border-violet-400/50">
    <div className="relative aspect-[16/11] overflow-hidden bg-gradient-to-br from-violet-950 via-slate-950 to-black">
      {project.thumbnail_image_url || project.thumbnail_url || project.image_url ? (
        <img src={safeImageSrc(project.thumbnail_image_url || project.thumbnail_url || project.image_url)} alt={project.title} className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105 group-hover:opacity-95" onError={handleImageError} />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-semibold uppercase tracking-[0.24em] text-violet-200/70">PranvithDOP</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070314] via-transparent to-transparent" />
      <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">{project.category || 'Film'}</span>
    </div>
    <div className="p-6">
      <h3 className="text-xl font-semibold text-white">{project.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/65">{project.description}</p>
      <div className="mt-5 space-y-1 text-xs text-white/45">
        {project.equipment && <p>Equipment: {project.equipment}</p>}
        {project.client && <p>Client: {project.client}</p>}
        {project.date && <p>Date: {project.date}</p>}
      </div>
    </div>
  </div>
);

export default Works;
