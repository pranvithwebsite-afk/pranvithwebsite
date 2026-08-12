import React from 'react';
import { Search, Download, Play, Sliders, Filter, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardPreviewSection = () => {
  return (
    <section className="section-block site-section--base relative py-24 px-6 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#ea580c]/15 border border-[#ea580c]/35 text-xs font-semibold uppercase tracking-wider text-[#f97316] mb-4">
            ASSETS STORE PREVIEW
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Find the right assets for your edit.
          </h2>
          <p className="mt-4 text-white/65 max-w-xl mx-auto text-base">
            Browse our entire library of professional grading LUTs, motion graphics, sound effects, and video courses.
          </p>
        </div>

        {/* Dashboard Mockup Card */}
        <div className="relative mx-auto max-w-5xl rounded-3xl border border-white/15 bg-[#0b0f19]/95 p-6 md:p-8 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.8)]">
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  readOnly
                  value="Cinematic Wedding LUTs..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <span className="px-3 py-1.5 rounded-lg bg-[#3b82f6] text-white text-xs font-medium shrink-0">All Assets</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-xs font-medium shrink-0">LUT Packs</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-xs font-medium shrink-0">Templates</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 text-white/70 text-xs font-medium shrink-0">Sound FX</span>
            </div>
          </div>

          {/* Sample Rows */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/8 hover:border-[#3b82f6]/40 transition">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ea580c] to-[#3b82f6] flex items-center justify-center text-white shrink-0">
                  <Play size={16} fill="white" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white">Air Lagoon Flow — Color Grade LUT</h5>
                  <p className="text-xs text-white/50">Sony S-Log3 / Arri LogC • 4K Rec.709</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">Included</span>
                <Link to="/assets" className="p-2 rounded-xl bg-white/10 hover:bg-[#3b82f6] text-white transition">
                  <Download size={16} />
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/8 hover:border-[#ea580c]/40 transition">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#ea580c] flex items-center justify-center text-white shrink-0">
                  <Sliders size={16} />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white">Premiere Pro Wedding Title Card Presets</h5>
                  <p className="text-xs text-white/50">Animated .mogrt • 4K Resolution</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#f97316] bg-[#ea580c]/10 border border-[#ea580c]/30 px-3 py-1 rounded-full">Popular</span>
                <Link to="/assets" className="p-2 rounded-xl bg-white/10 hover:bg-[#ea580c] text-white transition">
                  <Download size={16} />
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link
              to="/assets"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#60a5fa] hover:text-white transition"
            >
              <span>Explore All 50+ Assets in Store</span>
              <Sparkles size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreviewSection;
