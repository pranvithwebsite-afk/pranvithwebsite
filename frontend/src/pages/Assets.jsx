import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Download, FileVideo, Music2, Sparkles, Palette, Type } from 'lucide-react';

const assets = [
  { icon: FileVideo, name: 'Cinematic LUTs Pack', count: '50+ presets', color: 'from-violet-600 to-indigo-700' },
  { icon: Music2, name: 'Royalty-Free Music', count: '200+ tracks', color: 'from-fuchsia-600 to-pink-700' },
  { icon: Sparkles, name: 'After Effects Templates', count: '30+ projects', color: 'from-amber-500 to-orange-600' },
  { icon: Palette, name: 'Color Grading Presets', count: '120+ looks', color: 'from-emerald-500 to-teal-700' },
  { icon: Type, name: 'Typography Pack', count: '80+ fonts', color: 'from-sky-500 to-cyan-700' },
  { icon: FileVideo, name: 'Transition Pack', count: '45+ transitions', color: 'from-rose-500 to-red-700' },
];

const Assets = () => {
  return (
    <main className="bg-[#070314] text-white">
      <Header />
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">Editing Assets</h1>
          <p className="mt-7 text-white/70 text-lg leading-relaxed max-w-2xl mx-auto">
            Hand-picked LUTs, templates, sound effects and more &mdash; ready to drop into your timeline.
          </p>
        </div>

        <div className="max-w-6xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assets.map((a) => (
            <div
              key={a.name}
              className="group p-6 rounded-2xl border border-violet-500/15 bg-[#100830]/60 hover:border-violet-500/40 transition"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center mb-5`}>
                <a.icon size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">{a.name}</h3>
              <p className="mt-1 text-sm text-white/55">{a.count}</p>
              <button className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-400 group-hover:gap-3 transition-all">
                <Download size={14} /> Download
              </button>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default Assets;
