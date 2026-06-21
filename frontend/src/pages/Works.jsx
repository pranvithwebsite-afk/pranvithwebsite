import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ShowreelSection from '../components/ShowreelSection';
import { portfolioProjects } from '../data/portfolio';
import { handleImageError, safeImageSrc } from '../lib/utils';

const filters = ['All', 'Commercial', 'Wedding', 'Drone', 'Editing', 'Product', 'Film'];

const Works = () => {
  const [active, setActive] = useState('All');
  const projects = useMemo(() => (
    active === 'All'
      ? portfolioProjects
      : portfolioProjects.filter((project) => project.category === active)
  ), [active]);

  return (
    <main className="page bg-[#070314] text-white">
      <Header />
      <section className="relative overflow-hidden px-6 pb-12 pt-16 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.22),transparent_45%)]" />
        <div className="relative mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-violet-300">Portfolio</p>
          <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-7xl">
            Films, commercials, aerials, and edits crafted for impact.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-white/65">
            A curated portfolio of PranvithDOP cinematography, drone work, product visuals, and post-production projects.
          </p>
        </div>
      </section>

      <ShowreelSection />

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {filters.map((filter) => (
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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <a
                key={project.id}
                href={project.videoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition duration-300 hover:-translate-y-1 hover:border-violet-400/50"
              >
                <div className="relative aspect-[16/11] overflow-hidden">
                  <img src={safeImageSrc(project.thumbnail)} alt={project.title} className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105 group-hover:opacity-95" onError={handleImageError} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070314] via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">{project.category}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white">{project.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">{project.description}</p>
                  <div className="mt-5 space-y-1 text-xs text-white/45">
                    <p>Equipment: {project.equipment}</p>
                    {project.client && <p>Client: {project.client}</p>}
                    {project.date && <p>Date: {project.date}</p>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default Works;
