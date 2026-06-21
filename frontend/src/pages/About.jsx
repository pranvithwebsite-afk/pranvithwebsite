import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Award, Camera, Clock, Film, Plane, Sparkles } from 'lucide-react';
import { gearList } from '../data/portfolio';
import { fetchPublicSettings } from '../lib/api';
import { handleImageError, safeImageSrc } from '../lib/utils';

const stats = [
  { icon: Film, label: 'Film, ad & edit projects', value: '250+' },
  { icon: Camera, label: 'Product and commercial shoots', value: '80+' },
  { icon: Plane, label: 'Aerial/drone sequences', value: '120+' },
  { icon: Clock, label: 'Post-production hours', value: '3,000+' },
];

const defaultAboutSettings = {
  heading: 'DOP, filmmaker, editor, drone pilot, and visual storyteller.',
  subtitle: 'About Pranvith Dop',
  profile_image_url: '/assets/brand-profile.png',
  description: 'PranvithDOP creates cinematic visuals for brands, creators, weddings, products, and digital campaigns. The work combines cinematography, lighting, drone movement, DI, editing, commercial photography, and graphic design into one production-ready pipeline.',
  cta_text: 'Book a project',
  cta_link: '/hire',
  show_about_image: true,
  show_stats: true,
  show_gear: true,
};

const About = () => {
  const [aboutSettings, setAboutSettings] = useState(defaultAboutSettings);

  useEffect(() => {
    let mounted = true;
    fetchPublicSettings()
      .then((settings) => {
        if (!mounted) return;
        setAboutSettings({ ...defaultAboutSettings, ...(settings?.page_settings?.about || {}) });
      })
      .catch(() => {
        if (mounted) setAboutSettings(defaultAboutSettings);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <main className="page bg-[#070314] text-white">
      <Header />
      <section className="relative overflow-hidden px-6 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_0%,rgba(124,58,237,0.22),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          {aboutSettings.show_about_image !== false && (
            <div className="overflow-hidden rounded-3xl border border-violet-500/20 bg-white/[0.04] p-3 shadow-[0_30px_120px_rgba(124,58,237,0.18)]">
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.35),transparent_35%),linear-gradient(145deg,#1e0a45,#070314)]">
                {aboutSettings.profile_image_url ? (
                  <img
                    src={safeImageSrc(aboutSettings.profile_image_url)}
                    alt="PranvithDOP profile"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      handleImageError(event, '');
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070314]/30 via-transparent to-white/5" />
              </div>
            </div>
          )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-violet-300">{aboutSettings.subtitle}</p>
          <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-7xl">
            {aboutSettings.heading}
          </h1>
          <p className="mt-7 text-lg leading-relaxed text-white/70">
            {aboutSettings.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to={aboutSettings.cta_link || '/hire'} className="rounded-full bg-violet-600 px-7 py-3 text-sm font-semibold text-white hover:bg-violet-500">{aboutSettings.cta_text || 'Book a project'}</Link>
            <Link to="/works" className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10">View portfolio</Link>
          </div>
        </div>
      </div>
    </section>

    {aboutSettings.show_stats !== false && <section className="px-6 pb-20">
      <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-3xl border border-violet-500/15 bg-[#100830]/60 p-6 text-center">
              <Icon size={28} className="mx-auto mb-4 text-violet-300" />
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="mt-2 text-xs uppercase tracking-wider text-white/50">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </section>}

    {aboutSettings.show_gear !== false && <section className="px-6 pb-24">
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
    </section>}
      <Footer />
    </main>
  );
};

export default About;
