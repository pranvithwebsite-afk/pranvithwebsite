import React from 'react';
import { Play } from 'lucide-react';
import { studentVideos } from '../data/mock';
import { handleImageError, safeImageSrc } from '../lib/utils';

const StudentVideos = () => {
  // Duplicate items for marquee
  const items = [...studentVideos, ...studentVideos];

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-10">
        <div className="text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80 tracking-wider">
            SUCCESS STORIES
          </span>
          <h2 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">STUDENT TESTIMONIALS</h2>
          <p className="mt-4 text-white/60 max-w-xl mx-auto">
            Real people. Real transformations. Hear from our students who mastered video editing.
          </p>
        </div>
      </div>

      <div className="relative">
        {/* gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#070314] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#070314] to-transparent pointer-events-none" />

        <div className="flex gap-5 animate-marquee w-max">
          {items.map((s, idx) => (
            <div
              key={`${s.id}-${idx}`}
              className="relative w-[280px] h-[420px] rounded-2xl overflow-hidden border border-violet-500/20 bg-[#0f0830] shrink-0 group cursor-pointer"
            >
              <img src={safeImageSrc(s.thumb)} alt={s.name} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition" onError={handleImageError} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070314] via-[#070314]/40 to-transparent" />
              <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-violet-600/90 shadow-[0_0_40px_rgba(139,92,246,0.6)] flex items-center justify-center group-hover:scale-110 transition">
                <Play size={20} className="text-white ml-0.5" fill="white" />
              </button>
              <p className="absolute bottom-4 left-4 text-sm font-medium text-white/90">{s.name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-12">
        <p className="text-white/65 text-sm mb-5">Join thousands of students who transformed their editing skills</p>
        <button className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-colors text-white px-7 py-3 rounded-full text-sm font-semibold tracking-wider">
          START YOUR JOURNEY
        </button>
      </div>
    </section>
  );
};

export default StudentVideos;
