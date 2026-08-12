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

const cardGlows = ['card-glow-blue', 'card-glow-amber', 'card-glow-teal'];

const ClientTestimonialsSection = ({ section = null }) => {
  const cmsItems = enabledSorted(section?.data?.items || []);
  const items = section ? cmsItems.map(normalizeTestimonial) : clientTestimonials;

  if (!items.length) return null;

  return (
    <section className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#ea580c]/15 border border-[#ea580c]/35 text-xs font-semibold uppercase tracking-wider text-[#f97316]">
            SUCCESS STORIES
          </span>
          <h2 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-5xl">
            {section?.title || 'Hear from our customers & their success stories'}
          </h2>
          {section?.description && <p className="mt-4 text-sm leading-relaxed text-white/65 max-w-xl mx-auto">{section.description}</p>}
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-20">
          {items.map((item, idx) => (
            <article
              key={`${item.name}-${item.projectType}-${item.sort_order ?? idx}`}
              className={`cinematic-card ${cardGlows[idx % cardGlows.length]} p-7 backdrop-blur-2xl border border-white/10 bg-[#0e1322] rounded-3xl transition duration-300 hover:-translate-y-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col justify-between`}
            >
              <div>
                <div className="flex gap-1 text-amber-400 mb-4">
                  {Array.from({ length: item.rating || 5 }).map((_, index) => (
                    <Star key={index} size={15} fill="currentColor" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-white/80 font-normal">"{item.text}"</p>
              </div>

              <div className="mt-8 flex items-center gap-3.5 border-t border-white/10 pt-5">
                {item.image_url ? (
                  <img src={safeImageSrc(item.image_url)} alt={item.name} className="h-11 w-11 rounded-full object-cover border border-white/15" onError={handleImageError} />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#ea580c] flex items-center justify-center text-white font-bold text-sm">
                    {item.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm text-white">{item.name}</p>
                  <p className="text-xs text-[#93c5fd] mt-0.5">{item.projectType || 'Verified Creator'}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Brand Logo Cloud Section */}
        <div className="pt-12 border-t border-white/10 text-center">
          <p className="text-xl md:text-2xl font-bold tracking-tight text-white mb-8">
            Used by the world's best
          </p>
          <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap opacity-70 grayscale hover:grayscale-0 transition-all duration-500 text-lg font-extrabold text-white/70">
            <span className="tracking-widest hover:text-[#ea580c] transition">UEFA</span>
            <span className="tracking-wider italic hover:text-[#3b82f6] transition">LACOSTE</span>
            <span className="tracking-widest font-serif hover:text-white transition">LEVI'S</span>
            <span className="tracking-wider uppercase hover:text-[#ea580c] transition">LAMBORGHINI</span>
            <span className="tracking-widest font-sans hover:text-[#3b82f6] transition">RED BULL</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientTestimonialsSection;
