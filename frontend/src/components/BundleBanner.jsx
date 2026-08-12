import React from 'react';
import { Download, Infinity, Layers, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const BundleBanner = () => {
  return (
    <section className="section-block relative py-20 px-6 bg-[#05070a] overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="relative rounded-3xl border border-[#3b82f6]/40 bg-gradient-to-r from-[#0b0f14] via-[#111827] to-[#0b0f14] p-8 md:p-14 overflow-hidden shadow-[0_25px_80px_rgba(59,130,246,0.3)]">
          {/* Ambient Lighting */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#3b82f6]/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#60a5fa]/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="max-w-2xl">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#3b82f6]/15 border border-[#3b82f6]/40 text-xs font-bold uppercase tracking-wider text-[#60a5fa] mb-5">
                LIMITED TIME ALL-ACCESS BUNDLE
              </span>

              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-[Space_Grotesk] leading-tight mb-5">
                Everything a Professional <br className="hidden sm:inline" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#60a5fa] via-[#3b82f6] to-white">
                  Editor Needs
                </span>
              </h2>

              <p className="text-white/70 text-base md:text-lg leading-relaxed mb-8">
                Get unlimited instant access to our complete vault of cinematic LUTs, SFX sound libraries, motion templates, and masterclass courses.
              </p>

              {/* Highlights */}
              <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-[#60a5fa]">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white font-[Space_Grotesk]">1500+</h4>
                    <p className="text-xs text-white/50">Assets Included</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-[#60a5fa]">
                    <Infinity size={18} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white font-[Space_Grotesk]">Lifetime</h4>
                    <p className="text-xs text-white/50">Free Updates</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-[#60a5fa]">
                    <Download size={18} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white font-[Space_Grotesk]">Instant</h4>
                    <p className="text-xs text-white/50">Download</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Box */}
            <div className="shrink-0 text-center lg:text-right bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <span className="text-xs uppercase tracking-widest text-white/60 font-semibold">ULTIMATE EDITORS PASS</span>
              <div className="my-3">
                <span className="text-4xl font-extrabold text-white font-[Space_Grotesk]">Rs. 2,999</span>
                <span className="text-sm text-white/40 line-through ml-2">Rs. 9,999</span>
              </div>
              <Link
                to="/assets"
                className="inline-flex items-center justify-center gap-3 w-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white px-8 py-4 rounded-xl text-sm font-semibold shadow-[0_10px_35px_rgba(59,130,246,0.42)] transition hover:scale-105"
              >
                <span>Get Ultimate Bundle</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BundleBanner;
