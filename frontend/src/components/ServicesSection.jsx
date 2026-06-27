import React from 'react';
import { Link } from 'react-router-dom';
import { services as fallbackServices } from '../data/portfolio';
import { safePublicHref } from '../lib/utils';
import { serviceIcons } from './ServiceCard';

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
    <section className="relative px-6 py-24">
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
          {visibleServices.map((service) => {
            const Icon = serviceIcons[service.icon] || fallbackServices[0].icon;
            const linkTarget = service.path || service.button_link || service.link_url || '/hire';

            return (
              <Link
                key={service.title}
                to={safePublicHref(linkTarget)}
                className="cinematic-card group p-6 backdrop-blur transition duration-300 hover:-translate-y-1"
              >
                <div className="cinematic-icon mb-5 flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Icon size={22} />
                </div>
                <h3 className="text-xl font-semibold text-white">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{service.description}</p>
                <span className="mt-6 inline-flex text-sm font-semibold text-accent-purple transition group-hover:text-purple-200">
                  {service.link_label || 'Explore service'}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
