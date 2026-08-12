import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { handleImageError, safeImageSrc } from '../lib/utils';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);

const CourseCard = ({ course }) => (
  <article className="cinematic-card group relative overflow-hidden transition-all duration-300 hover:-translate-y-1">
    <div className="relative aspect-[16/10] overflow-hidden">
      <img
        src={safeImageSrc(course.image)}
        alt={course.title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={handleImageError}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/30 to-transparent" />
      <div className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] px-3 py-1 text-[11px] font-bold tracking-wider text-white">
        {course.discount}
      </div>
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-[#60a5fa]" />
        {course.lectures} Lectures
      </div>
    </div>

    <div className="p-4 sm:p-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#93c5fd]">{course.tag}</p>
      <h3 className="mb-2 line-clamp-2 text-lg font-semibold leading-snug text-white">{course.title}</h3>
      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-white/60">{course.description}</p>
      <div className="mb-5 flex items-center gap-2 text-xs text-white/70">
        <CheckCircle2 size={14} className="text-[#60a5fa]" />
        No Prior Experience Needed
      </div>
      <div className="mb-5 h-px bg-white/10" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-2xl font-bold text-white">{formatPrice(course.price)}</span>
          <span className="ml-2 text-sm text-white/45 line-through">{formatPrice(course.oldPrice)}</span>
        </div>
        <Link
          to={course.link}
          aria-label={`View ${course.title}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white transition"
        >
          <ChevronRight size={18} />
        </Link>
      </div>
    </div>
  </article>
);

export default CourseCard;
