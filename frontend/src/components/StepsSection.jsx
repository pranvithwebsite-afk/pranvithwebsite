import React from 'react';
import { Search, MoveDown, Sparkles, MonitorCheck } from 'lucide-react';

const StepsSection = () => {
  const steps = [
    {
      number: '01',
      icon: <Search className="text-[#ea580c]" size={24} />,
      title: 'Select Your Asset',
      description: 'Choose from hundreds of cinematic LUT packs, title templates, sound FX, and transition assets.',
    },
    {
      number: '02',
      icon: <MoveDown className="text-[#3b82f6]" size={24} />,
      title: 'Drag & Drop to Timeline',
      description: 'Import directly into Premiere Pro, After Effects, DaVinci Resolve, or Final Cut Pro without plugins.',
    },
    {
      number: '03',
      icon: <MonitorCheck className="text-emerald-400" size={24} />,
      title: 'Export in 4K Quality',
      description: 'Render high-impact videos that captivate audiences and elevate your brand presence instantly.',
    },
  ];

  return (
    <section className="section-block site-section--base relative py-24 px-6 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/12 text-xs font-semibold uppercase tracking-wider text-[#93c5fd] mb-4">
            EASY WORKFLOW
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white max-w-2xl mx-auto leading-tight">
            Fast Track Your Video Editing in 3 Easy Steps
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative p-8 rounded-3xl border border-white/10 bg-[#0e1322] backdrop-blur-xl transition-all duration-300 hover:border-white/25 hover:-translate-y-1.5"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  {step.icon}
                </div>
                <span className="text-4xl font-extrabold font-mono text-white/15">
                  {step.number}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
              <p className="text-sm text-white/65 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepsSection;
