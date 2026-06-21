import React from 'react';
import { Star } from 'lucide-react';
import { clientTestimonials } from '../data/portfolio';

const ClientTestimonialsSection = () => (
  <section className="relative px-6 py-20">
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm uppercase tracking-[0.32em] text-violet-300/80">Client words</p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
          Trusted for films, brands, weddings, and launch visuals.
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {clientTestimonials.map((item) => (
          <article
            key={`${item.name}-${item.projectType}`}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 backdrop-blur transition hover:-translate-y-1 hover:border-violet-300/30"
          >
            <div className="flex gap-1 text-amber-300">
              {Array.from({ length: item.rating || 5 }).map((_, index) => (
                <Star key={index} size={15} fill="currentColor" />
              ))}
            </div>
            <p className="mt-5 text-sm leading-7 text-white/75">"{item.text}"</p>
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="font-semibold text-white">{item.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-violet-200/70">{item.projectType}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default ClientTestimonialsSection;
