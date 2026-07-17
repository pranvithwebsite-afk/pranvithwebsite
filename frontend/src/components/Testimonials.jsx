import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { testimonials as mockTestimonials } from '../data/mock';
import { fetchTestimonials } from '../lib/api';

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState(mockTestimonials);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchTestimonials();
        if (Array.isArray(data) && data.length) setTestimonials(data);
      } catch (e) {
        // fallback
      }
    })();
  }, []);

  const row1 = testimonials.slice(0, 5);
  const row2 = testimonials.slice(5);
  const all1 = [...row1, ...row1];
  const all2 = [...row2, ...row2];

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="mx-auto mb-14 max-w-7xl text-center">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight">WHAT OUR STUDENTS SAY</h2>
        <p className="mt-4 text-white/65">Join thousands of satisfied students who transformed their editing careers</p>
      </div>

      <div className="space-y-5">
        {/* Row 1 */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[var(--bg-main)] to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[var(--bg-main)] to-transparent pointer-events-none" />
          <div className="flex gap-5 animate-marquee w-max">
            {all1.map((t, idx) => (
              <TestimonialCard key={`r1-${t.id || t.name || ''}-${idx}`} t={t} />
            ))}
          </div>
        </div>
        {/* Row 2 - reverse direction visually using different speed */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[var(--bg-main)] to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[var(--bg-main)] to-transparent pointer-events-none" />
          <div className="flex gap-5 animate-marquee-slow w-max" style={{ animationDirection: 'reverse' }}>
            {all2.map((t, idx) => (
              <TestimonialCard key={`r2-${t.id || t.name || ''}-${idx}`} t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const TestimonialCard = ({ t }) => (
  <div className="w-[340px] shrink-0 p-6 rounded-2xl border border-violet-500/15 bg-gradient-to-br from-[#100830]/60 to-[var(--bg-main)]/60 hover:border-violet-500/40 transition">
    <div className="flex gap-0.5 mb-4">
      {Array.from({ length: t.rating }).map((_, i) => (
        <Star key={`${t.id || t.name}-star-${i}`} size={16} className="text-amber-400 fill-amber-400" />
      ))}
    </div>
    <p className="text-sm text-white/85 leading-relaxed mb-5 min-h-[56px]">&ldquo;{t.text}&rdquo;</p>
    <div>
      <p className="text-sm font-semibold text-white">{t.name}</p>
      <p className="text-xs text-violet-400">{t.role}</p>
    </div>
  </div>
);

export default Testimonials;
