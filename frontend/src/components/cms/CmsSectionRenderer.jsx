import React from 'react';
import CoursesSection from '../Courses';
import Testimonials from '../Testimonials';
import FAQ from '../FAQ';
import OurWorks from '../OurWorks';
import { submitHireRequest } from '../../lib/api';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

const isSafeLink = (value) => {
  const link = String(value || '').trim();
  return link && !/^\s*(javascript|data|vbscript):/i.test(link);
};

const cleanHtml = (value) => String(value || '')
  .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  .replace(/\son\w+=(["']).*?\1/gi, '')
  .replace(/(href|src)=(["'])\s*(javascript|data|vbscript):.*?\2/gi, '$1="#"');

const sectionText = (section, key, fallback = '') => section?.[key] || fallback;

const Shell = ({ children, className = '' }) => (
  <section className={`px-6 py-16 ${className}`}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </section>
);

const HeroSection = ({ section }) => {
  const image = section.image || section.hero_background_image;
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32">
      {image && (
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070314]/70 via-[#070314]/85 to-[#070314]" />
      <div className="relative mx-auto max-w-5xl text-center">
        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">{sectionText(section, 'title')}</h1>
        {(section.subtitle || section.description) && (
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/70">
            {section.subtitle || section.description}
          </p>
        )}
        {section.button_text && isSafeLink(section.button_link) && (
          <a href={section.button_link} className="mt-8 inline-flex rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">
            {section.button_text}
          </a>
        )}
      </div>
    </section>
  );
};

const TextSection = ({ section }) => (
  <Shell>
    {section.title && <h2 className="text-3xl font-bold md:text-5xl">{section.title}</h2>}
    {(section.subtitle || section.description) && (
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/70">{section.subtitle || section.description}</p>
    )}
  </Shell>
);

const ImageTextSection = ({ section }) => (
  <Shell>
    <div className="grid items-center gap-8 md:grid-cols-2">
      {section.image && <img src={section.image} alt={section.title || ''} className="aspect-video w-full rounded-2xl object-cover" />}
      <div>
        <h2 className="text-3xl font-bold md:text-5xl">{section.title}</h2>
        <p className="mt-5 leading-relaxed text-white/70">{section.subtitle || section.description}</p>
      </div>
    </div>
  </Shell>
);

const CardsSection = ({ section }) => (
  <Shell>
    {section.title && <h2 className="text-3xl font-bold md:text-5xl">{section.title}</h2>}
    {section.subtitle && <p className="mt-3 text-white/65">{section.subtitle}</p>}
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {(section.cards || section.items || []).map((item, index) => (
        <article key={item.id || index} className="rounded-2xl border border-violet-500/15 bg-[#100830]/70 p-6">
          {item.image && <img src={item.image} alt={item.title || ''} className="mb-4 aspect-video w-full rounded-xl object-cover" />}
          <h3 className="text-lg font-semibold">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/65">{item.description || item.subtitle}</p>
        </article>
      ))}
    </div>
  </Shell>
);

const GallerySection = ({ section }) => (
  <Shell>
    {section.title && <h2 className="text-3xl font-bold md:text-5xl">{section.title}</h2>}
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(section.items || section.cards || []).map((item, index) => (
        <img key={item.id || index} src={item.image || item.url} alt={item.title || ''} className="aspect-[4/3] w-full rounded-2xl object-cover" />
      ))}
    </div>
  </Shell>
);

const VideoSection = ({ section }) => (
  <Shell>
    {section.title && <h2 className="mb-8 text-3xl font-bold md:text-5xl">{section.title}</h2>}
    {isSafeLink(section.video_url) && (
      <div className="aspect-video overflow-hidden rounded-2xl border border-violet-500/20 bg-black">
        <iframe src={section.video_url} title={section.title || 'Video'} className="h-full w-full" allowFullScreen />
      </div>
    )}
  </Shell>
);

const BeforeAfterSection = ({ section }) => (
  <Shell>
    {section.title && <h2 className="text-3xl font-bold md:text-5xl">{section.title}</h2>}
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      {section.before_image && <img src={section.before_image} alt="Before" className="aspect-video rounded-2xl object-cover" />}
      {section.after_image && <img src={section.after_image} alt="After" className="aspect-video rounded-2xl object-cover" />}
    </div>
  </Shell>
);

const CtaSection = ({ section }) => (
  <Shell>
    <div className="rounded-2xl border border-violet-500/20 bg-violet-600/10 p-8 text-center">
      <h2 className="text-3xl font-bold">{section.title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-white/70">{section.subtitle || section.description}</p>
      {section.button_text && isSafeLink(section.button_link) && (
        <a href={section.button_link} className="mt-6 inline-flex rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500">
          {section.button_text}
        </a>
      )}
    </div>
  </Shell>
);

const ContactFormSection = ({ section }) => {
  const [form, setForm] = React.useState({ name: '', email: '', requirement: '' });
  const [busy, setBusy] = React.useState(false);
  const submit = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      await submitHireRequest(form);
      toast.success('Request sent!');
      setForm({ name: '', email: '', requirement: '' });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to send request.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell>
      <form onSubmit={submit} className="mx-auto max-w-xl rounded-2xl border border-violet-500/20 bg-[#100830]/70 p-7">
        <h2 className="text-2xl font-semibold">{section.title || 'Tell us about your project'}</h2>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="mt-5 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-violet-500" />
        <input value={form.email} type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-violet-500" />
        <textarea value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} placeholder="Your requirement" rows={4} className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-violet-500" />
        <button disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-60">
          {busy ? 'Sending...' : 'Send Request'} <Send size={14} />
        </button>
      </form>
    </Shell>
  );
};

const CmsSectionRenderer = ({ section, slots = {} }) => {
  if (!section?.enabled) return null;
  const type = section.type;
  if (type === 'hero') return <HeroSection section={section} />;
  if (type === 'text' || type === 'content') return <TextSection section={section} />;
  if (type === 'image_text') return <ImageTextSection section={section} />;
  if (type === 'feature_cards' || type === 'cards' || type === 'grid') return <CardsSection section={section} />;
  if (type === 'gallery') return <GallerySection section={section} />;
  if (type === 'video') return <VideoSection section={section} />;
  if (type === 'before_after') return <BeforeAfterSection section={section} />;
  if (type === 'products_showcase') return slots.products || null;
  if (type === 'courses_showcase') return slots.courses || <CoursesSection />;
  if (type === 'works_grid' || type === 'portfolio') return slots.works || <OurWorks />;
  if (type === 'testimonials') return <Testimonials />;
  if (type === 'faq') return <FAQ />;
  if (type === 'cta') return <CtaSection section={section} />;
  if (type === 'contact_form' || type === 'hire_form') return slots.contactForm || <ContactFormSection section={section} />;
  if (type === 'custom_html') {
    return <Shell><div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: cleanHtml(section.html || section.description) }} /></Shell>;
  }
  return <TextSection section={section} />;
};

export default CmsSectionRenderer;
