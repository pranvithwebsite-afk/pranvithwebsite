import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const ServiceOfferGrid = ({ offers = [] }) => {
  if (!offers.length) return null;

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="section-eyebrow text-xs">What We Offer</p>
        <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, index) => (
            <article key={`${offer.title}-${index}`} className="cinematic-card p-6">
              <CheckCircle2 size={20} className="text-purple-200" />
              <h3 className="mt-5 text-lg font-semibold text-white">{offer.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/65">{offer.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceOfferGrid;
