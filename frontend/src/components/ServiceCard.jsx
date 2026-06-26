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
      className="group rounded-3xl border border-[var(--border-cyan)] bg-[var(--panel-blue)] p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-[var(--accent-cyan)] hover:bg-cyan-500/10"
      data-testid={`service-card-${service.slug}`}
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-200">
        <Icon size={22} />
      </div>
      <h3 className="text-xl font-semibold text-white">{service.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/65">{service.short_description || service.subtitle || service.description}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition group-hover:text-white">
        View service
        <ArrowUpRight size={16} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  );
};

export default ServiceCard;

