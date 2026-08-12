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
    <section id="faq" className="site-section--base relative py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-12 items-start">
          {/* Left Column: Heading & Contact CTA */}
          <div className="md:col-span-5 space-y-6">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#ea580c]/15 border border-[#ea580c]/35 text-xs font-semibold uppercase tracking-wider text-[#f97316]">
              QUESTIONS & ANSWERS
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              {section?.title || 'Frequently asked questions'}
            </h2>
            <p className="text-white/65 text-base leading-relaxed">
              {section?.description || 'Got any Questions? Let us know! Reach out and our team will get right back to you.'}
            </p>
            <div className="pt-2">
              <a
                href={safePublicHref(section?.button_link, '/hire')}
                className="inline-flex items-center gap-2 bg-[#0e1322] hover:bg-[#162032] border border-white/20 hover:border-[#ea580c]/60 text-white px-7 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              >
                {section?.button_text || 'Contact us'}
              </a>
            </div>
          </div>

          {/* Right Column: Accordions */}
          <div className="md:col-span-7 space-y-4">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={f.id || f.q || i}
                  className={`rounded-2xl border transition-all duration-300 ${
                    isOpen ? 'border-[#ea580c]/60 bg-[#0e1322] shadow-[0_10px_30px_rgba(0,0,0,0.5)]' : 'border-white/10 bg-[#070a13] hover:border-white/20'
                  }`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="text-base font-semibold text-white">{f.q}</span>
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-[#ea580c] text-white shadow-[0_0_12px_rgba(234,88,12,0.5)]' : 'bg-[#ea580c]/15 border border-[#ea580c]/40 text-[#f97316]'}`}>
                      {isOpen ? <Minus size={15} /> : <Plus size={15} />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 -mt-1">
                      <p className="text-sm text-white/70 leading-relaxed">{f.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
