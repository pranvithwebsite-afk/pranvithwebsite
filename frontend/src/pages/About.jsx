import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Award, Camera, Clock, Film, Plane, Sparkles } from 'lucide-react';
import { gearList } from '../data/portfolio';
import { handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';
import { useCmsPage } from '../hooks/useCmsPage';

const statIcons = [Film, Camera, Plane, Clock];
const defaultStats = [
  { label: 'Film, ad & edit projects', value: '250+' },
  { label: 'Product and commercial shoots', value: '80+' },
  { label: 'Aerial/drone sequences', value: '120+' },
  { label: 'Post-production hours', value: '3,000+' },
];

const findSection = (sections, idOrType) =>
  (sections || []).find((section) => section.section_id === idOrType || section.type === idOrType);

const About = () => {
  const { page } = useCmsPage('about');
  const sections = page?.sections || [];
  const hero = findSection(sections, 'hero') || findSection(sections, 'image_text') || {};
  const statsSection = findSection(sections, 'stats') || {};
  const stats = Array.isArray(statsSection.data?.items) && statsSection.data.items.length
    ? statsSection.data.items.filter((item) => item.enabled !== false).map((item) => ({ value: item.title, label: item.description }))
    : defaultStats;

  return (
    <main className="page bg-[#070314] text-white">
      <Header />
      <section className="relative overflow-hidden px-6 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_0%,rgba(124,58,237,0.22),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          {hero.enabled !== false && (
            <div className="overflow-hidden rounded-3xl border border-violet-500/20 bg-white/[0.04] p-3 shadow-[0_30px_120px_rgba(124,58,237,0.18)]">
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.35),transparent_35%),linear-gradient(145deg,#1e0a45,#070314)]">
                {hero.media_url ? (
                  <img
                    src={safeImageSrc(hero.media_url)}
                    alt="PranvithDOP profile"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      handleImageError(event, '');
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : <div className="h-full w-full" />}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070314]/30 via-transparent to-white/5" />
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-violet-300">{hero.subtitle || page?.subtitle || 'About Pranvith Dop'}</p>
            <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-7xl">
              {hero.title || page?.title || 'DOP, filmmaker, editor, drone pilot, and visual storyteller.'}
            </h1>
            <p className="mt-7 text-lg leading-relaxed text-white/70">
              {hero.description || 'PranvithDOP creates cinematic visuals for brands, creators, weddings, products, and digital campaigns.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to={safePublicHref(hero.button_link, '/hire')} className="rounded-full bg-violet-600 px-7 py-3 text-sm font-semibold text-white hover:bg-violet-500">{hero.button_text || 'Book a project'}</Link>
              <Link to="/works" className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10">View portfolio</Link>
            </div>
          </div>
        </div>
      </section>

      {statsSection.enabled !== false && (
        <section className="px-6 pb-20">
          <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = statIcons[index % statIcons.length];
              return (
                <div key={`${stat.label}-${index}`} className="rounded-3xl border border-violet-500/15 bg-[#100830]/60 p-6 text-center">
                  <Icon size={28} className="mx-auto mb-4 text-violet-300" />
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-white/50">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <Sparkles className="mb-5 text-violet-300" />
            <h2 className="text-3xl font-bold text-white">Creative positioning</h2>
            <p className="mt-4 leading-relaxed text-white/70">
              Built for clients who need more than footage: visual direction, cinematic lighting, clean edit structure, tasteful color, and final assets ready for web, social, campaigns, and events.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <Award className="mb-5 text-violet-300" />
            <h2 className="text-3xl font-bold text-white">Gear & workflow</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {gearList.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default About;
