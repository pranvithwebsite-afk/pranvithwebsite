import React, { useEffect, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { faqs as mockFaqs } from '../data/mock';
import { fetchFAQs } from '../lib/api';
import { dedupeFaqs, safePublicHref } from '../lib/utils';

const normalizeCmsFaqs = (items = []) => items
  .filter((item) => item.enabled !== false)
  .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
  .map((item, index) => ({
    id: item.id || `${item.question || item.title}-${index}`,
    q: item.question || item.title,
    a: item.answer || item.description,
  }))
  .filter((item) => item.q && item.a);

const FAQ = ({ section }) => {
  const [faqs, setFaqs] = useState(() => section ? normalizeCmsFaqs(section.data?.items) : dedupeFaqs(mockFaqs));
  const [open, setOpen] = useState(0);

  useEffect(() => {
    if (section) {
      setFaqs(normalizeCmsFaqs(section.data?.items));
      return undefined;
    }
    (async () => {
      try {
        const data = await fetchFAQs();
        if (Array.isArray(data) && data.length) setFaqs(dedupeFaqs(data));
      } catch (e) {
        // fallback
      }
    })();
  }, [section]);

  if (section && faqs.length === 0) return null;

  return (
    <section id="faq" className="site-section--soft relative py-24">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-300/20 text-xs text-purple-200">
            F.A.Q.
          </span>
          <h2 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            {section?.title || 'Have Questions?'}
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-300">
              {section?.subtitle || "We've Answered Them."}
            </span>
          </h2>
          <p className="mt-5 text-white/65 max-w-md mx-auto">
            {section?.description || 'From tools to timelines to placements, get full clarity before you take the next step.'}
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.id || f.q || i}
                className={`rounded-2xl border transition-all ${
                  isOpen ? 'border-purple-300/35 bg-purple-500/15' : 'border-purple-300/20 bg-[rgba(23,16,37,0.72)] hover:border-purple-300/35'
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-base md:text-lg font-medium text-white">{f.q}</span>
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-purple-600 text-white' : 'bg-purple-500/15 text-white/70'}`}>
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 -mt-1">
                    <p className="text-sm text-white/65 leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-14">
          <p className="text-white/65 text-sm mb-4">Still have questions? We&apos;re here to help!</p>
          <a href={safePublicHref(section?.button_link, '/hire')} className="inline-flex items-center gap-2 bg-[var(--accent-secondary)] hover:bg-[var(--accent-secondary-hover)] transition-colors text-[#031014] px-8 py-3 rounded-full text-sm font-semibold">
            {section?.button_text || 'Contact Us'}
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
