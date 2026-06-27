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
      className="cinematic-card group p-6 backdrop-blur transition duration-300 hover:-translate-y-1"
      data-testid={`service-card-${service.slug}`}
    >
      <div className="cinematic-icon mb-5 flex h-12 w-12 items-center justify-center rounded-2xl">
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
