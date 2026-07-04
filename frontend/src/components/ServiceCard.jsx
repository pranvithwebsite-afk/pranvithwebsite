import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Camera, Clapperboard, Globe, Heart, Music, Palette, Plane, PlaySquare, Scissors } from 'lucide-react';
import { FALLBACK_IMAGE, handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';

export const serviceIcons = {
  Camera,
  Clapperboard,
  Globe,
  Heart,
  Music,
  Palette,
  Plane,
  PlaySquare,
  Scissors,
};

export const getServiceImageUrl = (service = {}) =>
  service.thumbnail_url
  || service.image_url
  || service.media_url
  || service.poster_url
  || service.banner_url
  || '';

const ServiceCard = ({ service, index = 0, linkTarget: customLinkTarget }) => {
  const Icon = typeof service?.icon === 'function' ? service.icon : (serviceIcons[service?.icon] || Camera);
  const linkTarget = safePublicHref(customLinkTarget || service.path || service.button_link || service.link_url || `/services/${service.slug}`, '/hire');
  const imageUrl = getServiceImageUrl(service);
  const description = service.short_description || service.subtitle || service.description || '';
  const isExternal = /^https?:\/\//i.test(linkTarget);
  const cardContent = (
    <>
      <div className="relative">
        {imageUrl ? (
          <img
            src={safeImageSrc(imageUrl, FALLBACK_IMAGE)}
            alt={service.title}
            className="h-[170px] w-full object-cover sm:h-[180px] lg:h-[190px]"
            onError={handleImageError}
          />
        ) : (
          <div className="h-[170px] w-full bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.45),transparent_48%),linear-gradient(145deg,rgba(18,16,32,0.96),rgba(43,18,76,0.92)_58%,rgba(10,10,18,0.98))] sm:h-[180px] lg:h-[190px]" />
        )}
        <div className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-[rgba(14,12,25,0.78)] text-white shadow-[0_16px_32px_rgba(0,0,0,0.28)] backdrop-blur-md">
          <Icon size={20} />
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-white">{service.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/65">{description}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-purple transition group-hover:text-purple-200">
          View service
          <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </>
  );

  if (isExternal) {
    return (
      <a
        href={linkTarget}
        className="cinematic-card group overflow-hidden p-0 backdrop-blur transition duration-300 hover:-translate-y-1"
        data-testid={`service-card-${service.slug || index}`}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link
      to={linkTarget}
      className="cinematic-card group overflow-hidden p-0 backdrop-blur transition duration-300 hover:-translate-y-1"
      data-testid={`service-card-${service.slug || index}`}
    >
      {cardContent}
    </Link>
  );
};

export default ServiceCard;
