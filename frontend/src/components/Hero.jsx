import React from 'react';
import { ArrowRight } from 'lucide-react';
import { safePublicHref } from '../lib/utils';
import HeroLightSticks from './HeroLightSticks';

const fallbackHero = {
  badge_text: "India's Premium Editing Assets",
  hero_title: 'CREATE CINEMATIC STORIES',
  hero_subtitle: 'Transform raw footage into Hollywood-grade visual art with our curated LUTs, SFX bundles, and motion presets.',
  primary_button_text: 'Explore Assets',
  primary_button_link: '/assets',
  secondary_button_text: 'Watch Showreel',
  secondary_button_link: '/courses',
};

const cleanText = (value) => (typeof value === 'string' && value.trim() ? value : undefined);
const compactObject = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));

const Hero = ({ pageData, loading = false, fallbackAllowed = false }) => {
  const hasCmsHero = !!pageData;
  const cmsHero = pageData
    ? compactObject({
        badge_text: cleanText(pageData.badgeText),
        hero_title: cleanText(pageData.headline),
        hero_subtitle: cleanText(pageData.subheadline),
        primary_button_text: cleanText(pageData.buttonText),
        primary_button_link: cleanText(pageData.buttonUrl),
        secondary_button_text: cleanText(pageData.secondaryButtonText),
        secondary_button_link: cleanText(pageData.secondaryButtonUrl),
      })
    : {};

  const hero = hasCmsHero ? { ...fallbackHero, ...cmsHero } : (fallbackAllowed ? fallbackHero : fallbackHero);

  const titleText = String(hero.hero_title || 'CREATE CINEMATIC STORIES').trim();

  const renderHeading = () => {
    if (titleText.includes('\n')) {
      const lines = titleText.split('\n').map((l) => l.trim()).filter(Boolean);
      return lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {idx === lines.length - 1 ? (
            <span className="spectrum-text">{line}</span>
          ) : (
            line
          )}
          {idx < lines.length - 1 && <br />}
        </React.Fragment>
      ));
    }

    const words = titleText.split(' ').filter(Boolean);
    if (words.length <= 1) {
      return <span className="spectrum-text">{titleText}</span>;
    }
    if (words.length === 3) {
      return (
        <>
          {words[0]} <br />
          {words[1]} <br />
          <span className="spectrum-text">{words[2]}</span>
        </>
      );
    }
    const lastWord = words[words.length - 1];
    const prefix = words.slice(0, -1).join(' ');
    return (
      <>
        {prefix} <span className="spectrum-text">{lastWord}</span>
      </>
    );
  };

  return (
    <section className="hero-spectrum home-hero relative min-h-0 lg:min-h-screen pt-20 lg:pt-28 pb-6 lg:pb-16 px-4 sm:px-6 lg:px-8 bg-black flex items-start lg:items-center justify-center overflow-hidden w-full max-w-full">
      <HeroLightSticks />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="hero-spectrum__grid absolute inset-0 pointer-events-none" />
        <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-[#ff4d00]/20 blur-3xl pointer-events-none" />
        <div className="absolute -right-32 top-1/4 h-[32rem] w-[32rem] rounded-full bg-[#0877ff]/18 blur-3xl pointer-events-none" />
      </div>

      {/* Main Responsive Grid Container */}
      <div className="relative z-10 mx-auto max-w-[86rem] w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 xl:gap-10 items-center">
        {/* Left Column: Heading & CTAs */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left w-full max-w-full lg:max-w-2xl mx-auto lg:mx-0">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/40 border border-[#ff5a1f]/45 text-[#ff8a5c] text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a1f] animate-pulse" />
            <span>{hero.badge_text || "India's Premium Editing Assets"}</span>
          </div>

          {/* Dynamic 3-Line Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-[0.92] tracking-tight font-[Space_Grotesk] uppercase">
            {renderHeading()}
          </h1>

          {/* Paragraph */}
          <p className="text-white/70 text-sm sm:text-base lg:text-lg max-w-xl leading-relaxed">
            {hero.hero_subtitle || 'Transform raw footage into Hollywood-grade visual art with our curated LUTs, SFX bundles, and motion presets.'}
          </p>

          {/* Dual Action Buttons */}
          <div className="flex items-center gap-3.5 sm:gap-4 flex-wrap pt-2 sm:pt-4">
            <a
              href={safePublicHref(hero.primary_button_link, '/assets')}
              className="group inline-flex items-center gap-3 border border-[#ff5a1f]/60 bg-[#ff5a1f] hover:bg-[#ff6a2f] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg text-xs sm:text-sm font-bold tracking-wider uppercase shadow-[0_10px_35px_rgba(255,77,0,0.28)] transition duration-300 hover:-translate-y-0.5"
            >
              <span>{hero.primary_button_text || 'Explore Assets'}</span>
              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight size={12} />
              </span>
            </a>
            <a
              href={safePublicHref(hero.secondary_button_link, '/courses')}
              className="inline-flex items-center gap-2 bg-black/50 hover:bg-white/5 border border-white/15 hover:border-[#1683ff] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg text-xs sm:text-sm font-bold tracking-wider uppercase transition duration-200"
            >
              <span>{hero.secondary_button_text || 'Watch Showreel'}</span>
            </a>
          </div>

          {/* Software Bar */}
          <div className="pt-6 sm:pt-8 border-t border-white/10">
            <p className="text-[10px] sm:text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">
              Compatible With All Major NLEs
            </p>
            <div className="flex items-center gap-4 sm:gap-6 text-xs font-semibold text-white/60 flex-wrap">
              <span className="hover:text-[#60a5fa] transition">Premiere Pro</span>
              <span>•</span>
              <span className="hover:text-[#60a5fa] transition">After Effects</span>
              <span>•</span>
              <span className="hover:text-[#60a5fa] transition">DaVinci Resolve</span>
              <span>•</span>
              <span className="hover:text-[#60a5fa] transition">Final Cut</span>
            </div>
          </div>
        </div>

        <div className="hidden lg:block lg:col-span-5 min-h-[520px] xl:min-h-[640px]" aria-hidden="true">
        </div>
      </div>
    </section>
  );
};

export default Hero;
