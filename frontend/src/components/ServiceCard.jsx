import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Camera, Clapperboard, Globe, Heart, Music, Palette, Plane, PlaySquare, Scissors } from 'lucide-react';

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
  const linkTarget = `/services/${service.slug}`;

  return (
    <Link
      to={linkTarget}
      className="group rounded-[22px] border border-[var(--border-soft)] bg-[linear-gradient(145deg,rgba(23,16,37,0.96),rgba(13,8,24,0.98))] p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-purple)]"
      data-testid={`service-card-${service.slug}`}
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[rgba(124,58,237,0.22)] text-purple-200">
        <Icon size={22} />
      </div>
      <h3 className="text-xl font-semibold text-white">{service.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/65">{service.short_description || service.subtitle || service.description}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-purple transition group-hover:text-purple-200">
        View service
        <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  );
};

export default ServiceCard;

