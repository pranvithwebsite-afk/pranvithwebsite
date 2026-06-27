import React from 'react';
import { ArrowRight } from 'lucide-react';
import { audienceCards } from '../data/mock';
import { safePublicHref } from '../lib/utils';

const enabledSorted = (items = []) =>
  [...items].filter((item) => item.enabled !== false).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

const RightForYou = ({ section, buttonLink = '/courses', buttonText = 'Start Now' }) => {
  const cmsCards = enabledSorted(section?.data?.items);
  const cards = cmsCards.length
    ? cmsCards.map((item, index) => ({
        num: item.num || String(index + 1).padStart(2, '0'),
        title: item.title,
        desc: item.description || item.subtitle,
      }))
    : audienceCards;
  const ctaText = section?.data?.cta_text || 'UPGRADE YOUR EDITING SKILLS NOW';
  const ctaButtonText = section?.button_text || buttonText;
  const ctaButtonLink = safePublicHref(section?.button_link || buttonLink, '/courses');

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-6 mb-14">
          <h2 className="text-xs md:text-sm font-semibold tracking-[0.25em] text-white/95 whitespace-nowrap">
            {section?.title || 'IS THIS COURSE RIGHT FOR YOU?'}
          </h2>
          <div className="flex-1 h-px bg-white/15" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card) => (
            <div
              key={card.num}
              className="cinematic-card group relative cursor-pointer p-7 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/0 to-violet-600/0 group-hover:from-violet-600/10 group-hover:to-fuchsia-600/5 rounded-2xl transition-all" />
              <div className="relative">
                <p className="text-2xl font-bold text-white/95 mb-3">{card.num}</p>
                <h3 className="text-xl font-semibold text-white mb-4">{card.title}</h3>
                <p className="text-sm text-white/65 leading-relaxed">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Upgrade CTA bar */}
        <div className="cinematic-card mt-12 flex items-center justify-between gap-4 px-6 py-5 md:px-8 flex-wrap">
          <p className="text-base md:text-lg font-medium text-white">{ctaText}</p>
          <a href={ctaButtonLink} className="group inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-500 transition-colors text-white px-6 py-2.5 rounded-full text-sm font-semibold">
            {ctaButtonText}
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <ArrowRight size={11} />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default RightForYou;
