import React from 'react';
import { Star } from 'lucide-react';
import { clientTestimonials } from '../data/portfolio';
import { handleImageError, safeImageSrc } from '../lib/utils';

const enabledSorted = (items = []) =>
  [...items].filter((item) => item?.enabled !== false).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

const normalizeRating = (value) => {
  const rating = Number(value || 5);
  return Number.isFinite(rating) && rating > 0 ? Math.min(Math.round(rating), 5) : 5;
};

const normalizeTestimonial = (item = {}, index) => ({
  name: item.name || item.title || 'Client',
  projectType: item.projectType || item.subtitle || item.category || '',
  text: item.text || item.description || '',
  image_url: item.image_url || '',
  rating: normalizeRating(item.rating || item.meta?.rating),
  sort_order: item.sort_order ?? index,
});

const ClientTestimonialsSection = ({ section = null }) => {
  const cmsItems = enabledSorted(section?.data?.items || []);
  const items = section ? cmsItems.map(normalizeTestimonial) : clientTestimonials;

  if (!items.length) return null;

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-2xl">
          <p className="section-eyebrow text-sm">{section?.subtitle || 'Client words'}</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
            {section?.title || 'Trusted for films, brands, weddings, and launch visuals.'}
          </h2>
          {section?.description && <p className="mt-4 text-sm leading-7 text-white/65">{section.description}</p>}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <article
              key={`${item.name}-${item.projectType}-${item.sort_order ?? ''}`}
              className="cinematic-card p-6 backdrop-blur transition hover:-translate-y-1"
            >
              <div className="flex gap-1 text-amber-300">
                {Array.from({ length: item.rating || 5 }).map((_, index) => (
                  <Star key={index} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-white/75">"{item.text}"</p>
              <div className="mt-6 flex items-center gap-3 border-t border-purple-300/15 pt-5">
                {item.image_url && (
                  <img src={safeImageSrc(item.image_url)} alt={item.name} className="h-10 w-10 rounded-full object-cover" onError={handleImageError} />
                )}
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-violet-200/70">{item.projectType}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientTestimonialsSection;
