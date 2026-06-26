import React from 'react';
import { whatYoullLearn } from '../data/mock';

const WhatYoullLearn = () => {
  return (
    <section className="relative py-24">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-center text-4xl md:text-6xl font-bold tracking-tight mb-20">
          What You'll Learn
        </h2>

        <div className="space-y-10">
          {whatYoullLearn.map((item, idx) => (
            <div
              key={item.tag}
              className="relative rounded-3xl border border-violet-500/15 bg-gradient-to-br from-[#100830]/60 to-[var(--bg-main)]/30 p-1 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Visual */}
                <div
                  className={`relative aspect-[4/3] md:aspect-auto md:min-h-[340px] rounded-2xl bg-gradient-to-br ${item.bg} flex items-center justify-center overflow-hidden ${
                    idx % 2 === 1 ? 'md:order-2' : ''
                  }`}
                >
                  <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent 50%)' }} />
                  <span className={`text-[200px] md:text-[260px] font-black leading-none ${item.textColor} drop-shadow-2xl`}>
                    {item.letters}
                  </span>
                </div>

                {/* Body */}
                <div className={`p-8 md:p-12 flex flex-col justify-center ${idx % 2 === 1 ? 'md:order-1' : ''}`}>
                  <span className="inline-flex self-start items-center px-4 py-1.5 rounded-full bg-violet-600 text-white text-sm font-semibold mb-5">
                    {item.tag}
                  </span>
                  <p className="text-white/70 leading-relaxed text-sm md:text-base">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatYoullLearn;
