import React from 'react';
import { Sparkles, Film, Award, Users, Star } from 'lucide-react';

const MarqueeTicker = () => {
  const items = [
    { icon: <Film size={16} />, text: '100,000+ VIDEOS EDITED' },
    { icon: <Sparkles size={16} />, text: '50+ PREMIUM LUTS & PRESETS' },
    { icon: <Star size={16} className="text-amber-400" />, text: '4.9/5 RATED BY CREATORS' },
    { icon: <Users size={16} />, text: '50,000+ ACTIVE EDITORS' },
    { icon: <Award size={16} />, text: 'INDUSTRY STANDARD QUALITY' },
  ];

  return (
    <section className="py-6 border-y border-white/10 bg-[#070a13]/80 backdrop-blur overflow-hidden relative">
      <div className="flex w-max animate-marquee space-x-12">
        {[...items, ...items, ...items].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 text-xs font-bold tracking-[0.25em] text-white/80 uppercase shrink-0">
            <span className="text-[#ea580c]">{item.icon}</span>
            <span>{item.text}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6] ml-6" />
          </div>
        ))}
      </div>
    </section>
  );
};

export default MarqueeTicker;
