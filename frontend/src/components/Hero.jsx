import React from 'react';
import { ArrowRight, Play, Sparkles } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative pt-32 pb-12 overflow-hidden">
      {/* radial glow */}
      <div className="absolute inset-0 radial-purple pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-medium mb-7 backdrop-blur">
          <Sparkles size={12} />
          <span>Master Video Editing — Beginner to Pro</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-7 fade-in-up">
          <span className="text-white">Video Editing</span>{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300">
            Mastery
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-white/70 text-base md:text-lg leading-relaxed mb-10">
          Master the art of video editing with our comprehensive courses.
          From beginner basics to advanced techniques, learn professional
          editing skills that transform your creative vision into stunning reality.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button className="group inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-500 transition-colors text-white px-7 py-3.5 rounded-full text-sm font-semibold shadow-[0_8px_30px_rgba(139,92,246,0.45)]">
            Start Course
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <ArrowRight size={12} />
            </span>
          </button>
          <button className="inline-flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/15 text-white px-7 py-3.5 rounded-full text-sm font-semibold transition">
            Join Community
          </button>
        </div>

        {/* Animated dotted line decoration */}
        <div className="hidden md:flex items-center justify-center gap-2 mt-4 -mx-10 opacity-60">
          <div className="h-px w-40 bg-gradient-to-r from-transparent to-violet-500/60" />
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <div className="w-[420px]" />
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <div className="h-px w-40 bg-gradient-to-l from-transparent to-violet-500/60" />
        </div>

        {/* Hero feature visual */}
        <div className="relative mt-16 max-w-5xl mx-auto">
          <div className="absolute -inset-6 bg-violet-600/20 blur-3xl rounded-3xl" />
          <div className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-br from-[#1a0a3a] via-[#0f0625] to-[#0a0518] p-1 overflow-hidden">
            <div className="relative aspect-[16/8] rounded-[20px] overflow-hidden bg-gradient-to-br from-[#1e0a45] to-[#0a0518]">
              {/* Background image */}
              <img
                src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1600&q=80"
                alt="video editor"
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a0a3a]/90 via-transparent to-[#1a0a3a]/90" />

              <div className="relative h-full flex items-center justify-between px-6 md:px-14">
                {/* Left: Pr Logo */}
                <div className="flex items-center gap-4 md:gap-8">
                  <div className="w-24 h-24 md:w-36 md:h-36 rounded-2xl bg-[#1a0c4f] flex items-center justify-center shadow-2xl ring-1 ring-violet-400/30">
                    <span className="text-violet-300 text-4xl md:text-6xl font-bold">Pr</span>
                  </div>
                  <ArrowRight className="text-lime-400" size={40} strokeWidth={3} />
                </div>

                {/* Center: Heading */}
                <div className="hidden md:block text-center">
                  <h3 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
                    <span className="block bg-clip-text text-transparent bg-gradient-to-r from-lime-300 to-emerald-400">
                      LEARN
                    </span>
                    <span className="block text-white/90 my-1">AND</span>
                    <span className="block bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-yellow-400">
                      EARN
                    </span>
                  </h3>
                </div>

                {/* Right: Stack of cards */}
                <div className="hidden md:flex flex-col gap-2">
                  {['Edit', 'Color', 'Export'].map((label, i) => (
                    <div
                      key={label}
                      className={`px-4 py-2 rounded-lg bg-white/8 border border-white/15 backdrop-blur text-xs font-semibold tracking-wider ${
                        i === 1 ? 'translate-x-3' : ''
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Play overlay button */}
              <button className="absolute bottom-5 left-1/2 -translate-x-1/2 md:hidden w-14 h-14 rounded-full bg-violet-600/90 flex items-center justify-center">
                <Play size={22} className="text-white ml-1" fill="white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
