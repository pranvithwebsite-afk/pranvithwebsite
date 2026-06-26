import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

const isExternal = (value = '') => /^https?:\/\//i.test(value);

const ServiceCTA = ({ title, buttonText, buttonUrl }) => {
  const href = buttonUrl || '/hire';
  const label = buttonText || 'Contact / WhatsApp';
  const content = (
    <>
      <MessageCircle size={18} />
      {label}
    </>
  );

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-gradient-to-r from-panel-soft to-panel-dark p-8 text-center shadow-[var(--shadow-purple)] sm:p-12">
        <h2 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-white md:text-5xl">
          {title || 'Ready to start your project?'}
        </h2>
        {isExternal(href) ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-accent-purple-strong px-7 py-3 text-sm font-bold text-white transition hover:bg-accent-purple">
            {content}
          </a>
        ) : (
          <Link to={href} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-accent-purple-strong px-7 py-3 text-sm font-bold text-white transition hover:bg-accent-purple">
            {content}
          </Link>
        )}
      </div>
    </section>
  );
};

export default ServiceCTA;
