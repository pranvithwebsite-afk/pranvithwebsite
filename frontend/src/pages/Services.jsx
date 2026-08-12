import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Film, RefreshCw } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroLightSticks from '../components/HeroLightSticks';
import ServiceCard from '../components/ServiceCard';
import { useServices } from '../hooks/useServices';

const Services = () => {
  const { services, loading, error, refetch } = useServices();

  useEffect(() => {
    document.title = 'Services | PranvithDOP';
  }, []);

  const hasServices = services.length > 0;
  const servicesError = error ? 'Services could not be loaded.' : '';

  return (
    <>
      <Header />
      <main className="services-page page min-h-screen bg-transparent text-white">
        <div className="services-page-bg" aria-hidden="true">
          <HeroLightSticks />
        </div>
        <section className="relative overflow-hidden px-6 pb-14 pt-32 md:pt-36">
          <div className="cinematic-card mx-auto max-w-6xl px-6 py-8 md:px-10">
            <div className="relative mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <p className="section-eyebrow inline-flex items-center gap-2 text-xs">
                  <Film size={15} />
                  Services
                </p>
                <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">Cinematic services for stories, brands, and creators.</h1>
                <p className="mt-6 text-lg leading-8 text-white/68">
                  Production, post-production, social content, and web experiences built with a polished PranvithDOP visual language.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="mx-auto max-w-7xl">
            {loading ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="cinematic-card h-[360px] animate-pulse" />
                ))}
              </div>
            ) : servicesError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/8 p-10 text-center">
                <p className="text-white/72">{servicesError}</p>
                <button type="button" onClick={() => refetch()} className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 px-5 py-2 text-sm font-semibold text-white hover:bg-white/8">
                  <RefreshCw size={16} />
                  Retry
                </button>
              </div>
            ) : hasServices ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" data-testid="services-grid">
                {services.map((service, index) => (
                  <ServiceCard key={service.id || service.slug} service={service} index={index} />
                ))}
              </div>
            ) : (
              <div className="cinematic-card p-12 text-center">
                <h2 className="text-2xl font-semibold text-white">No services published yet.</h2>
                <p className="mt-3 text-white/60">Please check back soon or send a project enquiry.</p>
                <Link to="/hire" className="mt-6 inline-flex rounded-full bg-accent-purple-strong px-6 py-3 text-sm font-bold text-white hover:bg-accent-purple">
                  Contact PranvithDOP
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Services;
