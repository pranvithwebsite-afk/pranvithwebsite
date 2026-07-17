import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ServicesSection from '../components/ServicesSection';

const serviceContent = {
  commercial: {
    title: 'Commercial Video Production',
    meta: 'Commercial video production by PranvithDOP for brands, products, creators, and digital campaigns.',
    eyebrow: 'Commercial Films',
    heading: 'Premium commercial videos built for attention, trust, and conversion.',
    body: 'From concept to cinematography, lighting, editing, DI, and final delivery, PranvithDOP creates polished commercial films for brands, products, creators, and campaign launches.',
  },
  wedding: {
    title: 'Wedding Cinematography',
    meta: 'Cinematic wedding cinematography with emotional storytelling, drone visuals, audio, and premium editing.',
    eyebrow: 'Wedding Cinematography',
    heading: 'Wedding films shaped around emotion, movement, and memory.',
    body: 'Capture your wedding with cinematic framing, clean audio, drone visuals, and an edit that feels timeless without losing the real emotion of the day.',
  },
  drone: {
    title: 'Drone Cinematography',
    meta: 'Drone cinematography for films, weddings, real estate, commercials, events, and location showcases.',
    eyebrow: 'Aerial Visuals',
    heading: 'Aerial footage that gives your story scale, rhythm, and atmosphere.',
    body: 'Use drone cinematography for establishing shots, event coverage, real estate, travel visuals, brand films, and cinematic transitions.',
  },
};

const ServicePage = ({ type }) => {
  const content = serviceContent[type] || serviceContent.commercial;

  useEffect(() => {
    document.title = `${content.title} | PranvithDOP`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content.meta);
  }, [content]);

  return (
    <main className="page bg-[var(--bg-main)] text-white">
      <Header />
      <section className="relative overflow-hidden px-6 py-24">
        <div className="mx-auto max-w-6xl rounded-3xl border border-violet-500/15 bg-[var(--bg-elevated)] px-6 py-8 text-center shadow-2xl shadow-violet-950/20 md:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-violet-300">{content.eyebrow}</p>
          <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-7xl">{content.heading}</h1>
          <p className="mx-auto mt-7 max-w-3xl text-lg leading-relaxed text-white/70">{content.body}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link to="/hire" className="rounded-full bg-violet-600 px-7 py-3 text-sm font-semibold text-white hover:bg-violet-500">
              Book a project
            </Link>
            <Link to="/works" className="rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10">
              View work
            </Link>
          </div>
        </div>
      </section>
      <ServicesSection />
      <Footer />
    </main>
  );
};

export default ServicePage;
