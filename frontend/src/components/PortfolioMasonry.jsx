import React, { useState } from 'react';
import { Play, Sparkles } from 'lucide-react';

const portfolioItems = [
  {
    id: 1,
    title: 'Royal Udaipur Destination Wedding',
    category: 'Wedding',
    aspect: 'aspect-[4/5]',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    views: '1.2M Views',
  },
  {
    id: 2,
    title: 'Lamborghini Night Drive Cinema',
    category: 'Commercial',
    aspect: 'aspect-[16/9]',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    views: '850K Views',
  },
  {
    id: 3,
    title: 'Highlands of Iceland Expedition',
    category: 'Travel',
    aspect: 'aspect-[4/3]',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    views: '2.4M Views',
  },
  {
    id: 4,
    title: 'Cyberpunk Tokyo Motion Reel',
    category: 'Reels',
    aspect: 'aspect-[9/16]',
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80',
    views: '4.8M Views',
  },
  {
    id: 5,
    title: 'Heritage Palace Sunset Film',
    category: 'Wedding',
    aspect: 'aspect-[16/9]',
    image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80',
    views: '620K Views',
  },
  {
    id: 6,
    title: 'Fashion Week Milan Showreel',
    category: 'Commercial',
    aspect: 'aspect-[4/5]',
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
    views: '1.9M Views',
  },
];

const categories = ['All', 'Wedding', 'Commercial', 'Travel', 'Reels'];

const PortfolioMasonry = () => {
  const [activeTab, setActiveTab] = useState('All');

  const filteredItems = activeTab === 'All'
    ? portfolioItems
    : portfolioItems.filter((item) => item.category === activeTab);

  return (
    <section className="section-block relative py-24 px-6 bg-[#05070a] overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#60a5fa] text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} className="text-[#3b82f6]" />
            <span>CINEMATIC SHOWCASE</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-[Space_Grotesk]">
            Featured Portfolio
          </h2>
          <p className="mt-4 text-white/65 max-w-xl mx-auto text-base">
            Explore commercial brand films, royal wedding stories, travel expeditions, and viral reel edits.
          </p>

          {/* Filter Tabs */}
          <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === cat
                    ? 'bg-[#3b82f6] text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                    : 'bg-white/5 border border-white/10 text-white/70 hover:border-white/25 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f14] ${item.aspect} transition-all duration-500 hover:border-[#3b82f6]/50 hover:shadow-[0_20px_50px_rgba(59,130,246,0.25)]`}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
              />

              {/* Dark Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/40 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />

              {/* Play Button Icon */}
              <div className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#60a5fa] flex items-center justify-center text-white opacity-90 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                <Play size={22} fill="white" className="ml-1" />
              </div>

              {/* Content Info */}
              <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#60a5fa] mb-1">
                  {item.category} • {item.views}
                </span>
                <h3 className="text-xl font-bold text-white font-[Space_Grotesk] leading-tight">
                  {item.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PortfolioMasonry;
