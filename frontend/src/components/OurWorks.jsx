import React from 'react';
import { Play } from 'lucide-react';
import { ourWorks } from '../data/mock';

const OurWorks = () => {
  const items = [...ourWorks, ...ourWorks];
  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-[#070314] via-[#0a0420] to-[#070314]">
      {/* mountain background suggestion */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 opacity-30" style={{ background: 'linear-gradient(to top, rgba(139,92,246,0.15), transparent)' }} />

      <div className="relative max-w-7xl mx-auto px-6 text-center mb-12">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight">OUR WORKS</h2>
        <p className="mt-5 text-white/70 max-w-xl mx-auto leading-relaxed">
          Real projects edited with creativity and precision.
          From wedding films to reels and client work.
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-[#070314] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-[#070314] to-transparent pointer-events-none" />

        <div className="flex gap-5 animate-marquee-slow w-max">
          {items.map((w, idx) => (
            <div
              key={`${w.id}-${idx}`}
              className="relative w-[300px] h-[170px] rounded-xl overflow-hidden bg-[#0f0830] border border-white/10 shrink-0 group cursor-pointer"
            >
              <img src={w.thumb} alt="work" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-90 transition" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070314] to-transparent" />
              <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div className="w-12 h-12 rounded-full bg-violet-600/95 flex items-center justify-center">
                  <Play size={18} className="text-white ml-0.5" fill="white" />
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-14">
        <button className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-colors text-white px-7 py-3 rounded-full text-sm font-semibold tracking-wider">
          WATCH OUR WORK
        </button>
      </div>
    </section>
  );
};

export default OurWorks;
