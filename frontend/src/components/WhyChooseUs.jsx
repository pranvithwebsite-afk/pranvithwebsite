import React from 'react';
import { Zap, Shield, Cloud, Infinity } from 'lucide-react';

const features = [
  {
    icon: <Zap className="text-[#3b82f6]" size={24} />,
    title: 'Instant Download',
    description: 'High-speed cloud download link sent directly to your email immediately after checkout.',
  },
  {
    icon: <Shield className="text-[#60a5fa]" size={24} />,
    title: 'Lifetime Updates',
    description: 'Get all future asset revisions and new LUT preset additions free of charge forever.',
  },
  {
    icon: <Cloud className="text-[#3b82f6]" size={24} />,
    title: 'Commercial License',
    description: 'Royalty-free commercial license for personal, client, YouTube, and broadcast projects.',
  },
  {
    icon: <Infinity className="text-[#60a5fa]" size={24} />,
    title: '24×7 Support',
    description: 'Dedicated editing assistance, format installation guides, and timeline troubleshooting.',
  },
];

const WhyChooseUs = () => {
  return (
    <section className="section-block relative py-24 px-6 bg-[#05070a] overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-xs font-semibold uppercase tracking-wider text-[#60a5fa] mb-4">
            PRO EDITOR GUARANTEE
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-[Space_Grotesk]">
            Why Choose Us
          </h2>
          <p className="mt-4 text-white/65 max-w-xl mx-auto text-base">
            Engineered by professional cinematographers for serious video creators.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="group relative rounded-3xl border border-white/10 bg-[#0b0f14] p-8 transition-all duration-300 hover:border-[#3b82f6]/50 hover:-translate-y-1.5 hover:shadow-[0_15px_40px_rgba(59,130,246,0.2)]"
            >
              <div className="h-12 w-12 rounded-2xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 font-[Space_Grotesk]">
                {item.title}
              </h3>
              <p className="text-sm text-white/65 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
