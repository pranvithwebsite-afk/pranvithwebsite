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
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(124,58,237,0.13),rgba(255,255,255,0.04))] p-8 text-center shadow-[0_30px_100px_rgba(14,165,233,0.12)] sm:p-12">
        <h2 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-white md:text-5xl">
          {title || 'Ready to start your project?'}
        </h2>
        {isExternal(href) ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-7 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">
            {content}
          </a>
        ) : (
          <Link to={href} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-7 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">
            {content}
          </Link>
        )}
      </div>
    </section>
  );
};

export default ServiceCTA;
