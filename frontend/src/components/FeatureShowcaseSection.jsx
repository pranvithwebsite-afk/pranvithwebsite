import React from 'react';
import { Layers, Sliders, ArrowDownRight, Sparkles, CheckCircle2 } from 'lucide-react';

const FeatureShowcaseSection = () => {
  return (
    <section className="section-block site-section--base relative py-24 px-6 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Section 1: Create Stunning Videos */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/12 text-xs font-semibold uppercase tracking-wider text-[#93c5fd] mb-4">
            PRESETS & ASSETS
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Create Stunning Videos
          </h2>
          <p className="mt-4 text-white/65 max-w-xl mx-auto text-base">
            Everything you need to produce high-budget cinematic visuals in half the time.
          </p>
        </div>

        {/* Dual Cards */}
        <div className="grid gap-8 md:grid-cols-2 mb-28">
          <div className="relative group overflow-hidden rounded-3xl border border-white/10 bg-[#0e1322] p-8 transition duration-500 hover:border-[#ea580c]/50 hover:shadow-[0_20px_60px_rgba(234,88,12,0.25)]">
            <div className="h-48 w-full rounded-2xl bg-gradient-to-tr from-[#162032] via-[#1a253b] to-[#0d1322] p-6 border border-white/10 mb-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#ea580c]/20 blur-2xl pointer-events-none" />
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-widest text-[#f97316] font-bold">LOG to Rec.709</span>
                <span className="px-3 py-1 rounded-full bg-[#ea580c]/20 border border-[#ea580c]/40 text-xs text-[#f97316] font-mono">LUT PRESET</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-3/4 rounded bg-white/15 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Cinematic Color Grading LUTs</h3>
            <p className="text-white/65 text-sm leading-relaxed">
              Transform flat log footage from Sony, Canon, RED, and Arri into filmic masterpieces with one-click color correction files.
            </p>
          </div>

          <div className="relative group overflow-hidden rounded-3xl border border-white/10 bg-[#0e1322] p-8 transition duration-500 hover:border-[#3b82f6]/50 hover:shadow-[0_20px_60px_rgba(59,130,246,0.25)]">
            <div className="h-48 w-full rounded-2xl bg-gradient-to-br from-[#162032] via-[#1a253b] to-[#0d1322] p-6 border border-white/10 mb-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#3b82f6]/20 blur-2xl pointer-events-none" />
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-widest text-[#60a5fa] font-bold">4K Motion Graphics</span>
                <span className="px-3 py-1 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-xs text-[#60a5fa] font-mono">MOGRT / AE</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-4/5 rounded bg-white/15 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-white/10" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Drag & Drop Motion Presets</h3>
            <p className="text-white/65 text-sm leading-relaxed">
              Animated title cards, lower thirds, glass transitions, and split screen templates pre-configured for instant workflow integration.
            </p>
          </div>
        </div>

        {/* Section 2: Direct Integration */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#ea580c]/15 border border-[#ea580c]/35 text-xs font-semibold uppercase tracking-wider text-[#f97316] mb-4">
            INTEGRATION
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Direct Integration — Drag & Drop Presets Straight Into Your Timeline
          </h2>
        </div>

        {/* Color Grade by Code Split Screen */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Card Left: Color Grade by Code */}
          <div className="card-glow-amber relative rounded-3xl border border-white/10 bg-[#0e1322] p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#ea580c]/20 border border-[#ea580c]/40 flex items-center justify-center text-[#f97316]">
                  <Sliders size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Color Grade by Code</h4>
                  <p className="text-xs text-white/50">Custom Color Science & Neural LUTs</p>
                </div>
              </div>
              <span className="text-xs text-[#f97316] font-mono font-bold">100% Filmic</span>
            </div>

            {/* Mock Curves Box */}
            <div className="h-44 rounded-2xl bg-[#070a13] border border-white/10 p-4 relative overflow-hidden flex flex-col justify-between mb-6">
              <div className="flex justify-between text-xs text-white/40 font-mono">
                <span>RGB Curves</span>
                <span>Gamma: 2.4</span>
              </div>
              {/* Curve Line SVG */}
              <svg className="w-full h-24 stroke-[#ea580c] fill-none stroke-2" viewBox="0 0 300 100">
                <path d="M 0 90 Q 75 80 150 50 T 300 10" />
                <path d="M 0 95 Q 100 85 200 30 T 300 5" className="stroke-[#3b82f6] opacity-60" />
              </svg>
              <div className="flex gap-4 text-xs text-white/60">
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-[#ea580c]" /> Highlights</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-[#3b82f6]" /> Midtones</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> Shadows</span>
              </div>
            </div>

            <p className="text-sm text-white/70 leading-relaxed">
              Designed with professional color science, engineered for real-world lighting conditions, and tested across thousands of commercial edits.
            </p>
          </div>

          {/* Card Right: Software Dropper */}
          <div className="card-glow-blue relative rounded-3xl border border-white/10 bg-[#0e1322] p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-[#60a5fa]">
                  <Layers size={20} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Instant Software Drag & Drop</h4>
                  <p className="text-xs text-white/50">Native .cube, .mogrt, .drfx formats</p>
                </div>
              </div>
              <span className="text-xs text-[#60a5fa] font-mono font-bold">Zero Latency</span>
            </div>

            {/* Drop Target Graphic */}
            <div className="h-44 rounded-2xl border-2 border-dashed border-[#3b82f6]/40 bg-[#070a13]/80 p-4 flex flex-col items-center justify-center text-center mb-6 relative overflow-hidden group">
              <div className="h-12 w-12 rounded-full bg-[#3b82f6]/15 flex items-center justify-center text-[#60a5fa] mb-3 group-hover:scale-110 transition-transform">
                <ArrowDownRight size={24} />
              </div>
              <p className="text-xs font-semibold text-white">Drag preset straight into timeline</p>
              <p className="text-[10px] text-white/40 mt-1">Supports Premiere, DaVinci, FCPX, After Effects</p>
            </div>

            <p className="text-sm text-white/70 leading-relaxed">
              No complex installation plugins required. Simply import into your project media bin and drop onto your footage layers instantly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcaseSection;
