import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Camera, Clapperboard, Globe, Heart, Music, Palette, Plane, PlaySquare, Scissors } from 'lucide-react';
import { FALLBACK_IMAGE, handleImageError, safeImageSrc } from '../lib/utils';

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

const ServiceCard = ({ service, index = 0 }) => {
  const Icon = serviceIcons[service?.icon] || Camera;
  const image = service?.thumbnail_url || service?.banner_url;

  return (
    <Link
      to={`/services/${service.slug}`}
      className="group relative flex min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#090817]/80 shadow-[0_24px_80px_rgba(0,0,0,0.34)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:shadow-[0_28px_90px_rgba(14,165,233,0.16)]"
      data-testid={`service-card-${service.slug}`}
    >
      {image ? (
        <img
          src={safeImageSrc(image, FALLBACK_IMAGE)}
          alt={service.title}
          className="absolute inset-0 h-full w-full object-cover opacity-58 transition duration-500 group-hover:scale-105 group-hover:opacity-72"
          onError={handleImageError}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(14,165,233,0.30),transparent_34%),radial-gradient(circle_at_82%_78%,rgba(124,58,237,0.26),transparent_38%),linear-gradient(135deg,#050710,#0b1225_56%,#050611)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/58 to-black/10" />
      <div className="relative flex h-full min-h-[360px] w-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 backdrop-blur">
            <Icon size={20} />
          </span>
          <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/68 backdrop-blur">
            {service.category || `0${index + 1}`}
          </span>
        </div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-white">{service.title}</h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/70">{service.short_description || service.subtitle}</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
            View service
            <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ServiceCard;
