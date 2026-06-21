import React from 'react';
import { Link } from 'react-router-dom';
import { services } from '../data/portfolio';

const ServicesSection = () => (
  <section className="relative px-6 py-24">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(124,58,237,0.18),transparent_40%)]" />
    <div className="relative mx-auto max-w-7xl">
      <div className="mb-12 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-300">Services</p>
        <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
          Production services for brands, creators, and once-in-a-lifetime stories.
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.title}
              to={service.path}
              className="group rounded-3xl border border-violet-500/15 bg-white/[0.04] p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-violet-400/60 hover:bg-violet-500/10"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15 text-violet-200">
                <Icon size={22} />
              </div>
              <h3 className="text-xl font-semibold text-white">{service.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{service.description}</p>
              <span className="mt-6 inline-flex text-sm font-semibold text-violet-300 transition group-hover:text-white">
                Explore service
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  </section>
);

export default ServicesSection;
