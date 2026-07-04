import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ServiceOfferGrid from '../components/ServiceOfferGrid';
import ServiceProcess from '../components/ServiceProcess';
import ServiceCTA from '../components/ServiceCTA';
import SafeVideoEmbed, { detectMediaType } from '../components/SafeVideoEmbed';
import { FALLBACK_IMAGE, handleImageError, safeImageSrc } from '../lib/utils';
import { fetchServiceBySlug } from '../lib/api';
import OptimizedImage from '../components/OptimizedImage';

const videoMediaTypes = new Set(['video_file', 'video_url', 'youtube', 'vimeo']);

const ServiceDetail = () => {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchServiceBySlug(slug);
        if (!active) return;
        setService(data);
        setError('');
        document.title = `${data.title || 'Service'} | PranvithDOP`;
      } catch (err) {
        if (!active) return;
        console.error('[service-detail] failed', err?.response?.data?.detail || err?.message || err);
        setError(err?.response?.status === 404 ? 'Service not found.' : 'Service could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-main)] text-white">
        {loading ? (
          <div className="mx-auto max-w-7xl px-6 pt-32">
            <div className="cinematic-card h-[520px] animate-pulse" />
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((item) => <div key={item} className="cinematic-card h-44 animate-pulse" />)}
            </div>
          </div>
        ) : error || !service ? (
          <section className="px-6 py-36 text-center">
            <h1 className="text-4xl font-bold">{error || 'Service not found.'}</h1>
            <Link to="/services" className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-purple-strong px-6 py-3 text-sm font-bold text-white">
              <ArrowLeft size={16} />
              Back to Services
            </Link>
          </section>
        ) : (
          <>
            <section className="relative overflow-hidden px-6 pb-16 pt-32 md:pt-36">
              <div className="cinematic-card mx-auto grid max-w-6xl gap-8 px-6 py-8 md:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12 xl:gap-16">
                <div className="min-w-0 lg:pr-2">
                  <Link to="/services" className="inline-flex items-center gap-2 text-sm font-semibold text-white/65 hover:text-white">
                    <ArrowLeft size={16} />
                    Services
                  </Link>
                  <p className="section-eyebrow mt-8 text-xs">{service.category || 'PranvithDOP Service'}</p>
                  <h1 className="mt-4 max-w-[12ch] text-[clamp(2.625rem,4.8vw,4.5rem)] font-black leading-[0.96] tracking-tight text-white">
                    {service.title}
                  </h1>
                  <p className="mt-5 max-w-2xl text-xl font-semibold leading-snug text-white/86 md:text-2xl">{service.subtitle}</p>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-white/66">{service.short_description}</p>
                </div>
                <div className="min-w-0 overflow-hidden rounded-[22px] border border-purple-300/20 bg-black shadow-[0_0_45px_rgba(124,58,237,0.14)]">
                  {videoMediaTypes.has(detectMediaType(service.banner_url)) ? (
                    <SafeVideoEmbed videoType={detectMediaType(service.banner_url)} videoUrl={service.banner_url} title={service.title} className="rounded-2xl" />
                  ) : (
                    <OptimizedImage
                      src={safeImageSrc(service.banner_url || service.thumbnail_url, FALLBACK_IMAGE)}
                      alt={service.title}
                      priority
                      width={960}
                      height={660}
                      className="aspect-[16/11] h-full w-full object-cover"
                      onError={handleImageError}
                    />
                  )}
                </div>
              </div>
            </section>

            <section className="px-6 py-10">
              <div className="mx-auto max-w-4xl">
                <p className="text-lg leading-9 text-white/72">{service.description}</p>
              </div>
            </section>

            <ServiceOfferGrid offers={service.offers || []} />

            {(service.why_choose || []).length > 0 && (
              <section className="px-6 py-16">
                <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                  <div>
                    <p className="section-eyebrow text-xs">Why Choose Us</p>
                    <h2 className="mt-5 text-4xl font-bold tracking-tight text-white">Practical craft with a cinematic finish.</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {service.why_choose.map((item, index) => (
                      <article key={`${item.title}-${index}`} className="cinematic-card p-6">
                        <CheckCircle2 size={20} className="text-purple-200" />
                        <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-white/62">{item.description}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <ServiceProcess steps={service.process_steps || []} />
            <ServiceCTA title={service.cta_title} buttonText={service.cta_button_text} buttonUrl={service.cta_button_url} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
};

export default ServiceDetail;
