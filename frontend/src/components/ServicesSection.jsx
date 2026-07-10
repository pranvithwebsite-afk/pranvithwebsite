import React from 'react';
import { services as fallbackServices } from '../data/portfolio';
import ServiceCard from './ServiceCard';

const enabledSorted = (items = []) =>
  [...items].filter((item) => item.enabled !== false).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

const ServicesSection = ({ section }) => {
  const cmsItems = enabledSorted(section?.data?.items || section?.items || section?.data?.cards || section?.cards);

  // If there's a section from CMS, but no items, render nothing.
  if (section && cmsItems.length === 0) {
    return null;
  }
  
  // Use CMS items if available, otherwise use hardcoded fallback data.
  const visibleServices = cmsItems.length > 0 ? cmsItems : fallbackServices;

  return (
    <section className="section-block px-6">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(124,58,237,0.1),transparent_40%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <p className="section-eyebrow text-xs">{section?.data?.eyebrow || 'Services'}</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
            {section?.title || 'Production services for brands, creators, and once-in-a-lifetime stories.'}
          </h2>
          {(section?.subtitle || section?.description) && (
            <p className="mt-4 text-sm leading-relaxed text-white/65">{section.subtitle || section.description}</p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleServices.map((service, index) => (
            <ServiceCard
              key={service.id || service.slug || service.title}
              service={service}
              index={index}
              linkTarget={service.path || service.button_link || service.link_url || '/hire'}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
