import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CalendarDays, CheckCircle2, MapPin, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { submitHireRequest } from '../lib/api';
import { useCmsPage } from '../hooks/useCmsPage';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  project_type: '',
  budget: '',
  project_date: '',
  location: '',
  message: '',
};

const defaultBenefits = [
  'Cinematic wedding, commercial, drone, and brand storytelling',
  'DOP-led planning for light, movement, locations, and edit mood',
  'Editing, DI, product photography, and creative design support',
  'Clear project scope, timeline, and delivery expectations',
  'Flexible packages for shoots, campaigns, reels, and full films',
];

const projectTypes = ['Commercial Ad', 'Wedding Cinematography', 'Drone Shoot', 'Product Shoot', 'Film / Music Video', 'Editing / DI', 'Other'];

const section = (sections, idOrType) =>
  (sections || []).find((item) => item.section_id === idOrType || item.type === idOrType);

const Hire = () => {
  const { page } = useCmsPage('hire');
  const sections = page?.sections || [];
  const hero = section(sections, 'hero') || {};
  const services = section(sections, 'services') || {};
  const formSection = section(sections, 'enquiry-form') || section(sections, 'contact_form') || {};
  const benefits = Array.isArray(services.data?.items) && services.data.items.length
    ? services.data.items.filter((item) => item.enabled !== false).map((item) => item.description || item.title).filter(Boolean)
    : defaultBenefits;
  const showForm = page?.settings?.show_enquiry_form !== false && formSection.enabled !== false;

  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please enter your name, email, and project message');
      return;
    }
    try {
      setBusy(true);
      const res = await submitHireRequest(form);
      toast.success(res?.message || 'Request sent!');
      setForm(initialForm);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to send. Try again.';
      toast.error(typeof msg === 'string' ? msg : 'Failed to send request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page bg-[#070314] text-white">
      <Header />
      <section className="relative overflow-hidden px-6 pb-24 pt-12">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-16 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className={`relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 ${showForm ? 'lg:grid-cols-[0.9fr_1.1fr]' : ''}`}>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-violet-100">
              <Sparkles size={14} /> {hero.subtitle || 'Book PranvithDOP'}
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              {hero.title || 'Build a film, campaign, or visual story with cinematic intent.'}
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/68">
              {hero.description || 'Tell us about your shoot, brand film, wedding, reel, product campaign, or edit. We will shape the look, schedule, and creative plan around the story you want people to feel.'}
            </p>

            <div className="mt-8 grid gap-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/78">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-violet-300" />
                  {benefit}
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <CalendarDays className="text-violet-300" size={22} />
                <p className="mt-3 text-sm font-semibold text-white">Plan the shoot</p>
                <p className="mt-1 text-xs leading-5 text-white/55">Share your date, location, budget, and visual references.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <MapPin className="text-sky-300" size={22} />
                <p className="mt-3 text-sm font-semibold text-white">Shoot anywhere</p>
                <p className="mt-1 text-xs leading-5 text-white/55">Available for local, destination, commercial, and drone projects.</p>
              </div>
            </div>
          </div>

          {showForm && (
            <form
              onSubmit={submit}
              className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#13092f]/90 via-[#0b061b]/95 to-[#070314]/95 p-6 shadow-2xl shadow-violet-950/30 backdrop-blur md:p-8"
            >
              <h2 className="text-2xl font-semibold text-white">{formSection.title || 'Start a project enquiry'}</h2>
              <p className="mt-2 text-sm text-white/55">{formSection.description || 'A few details are enough. We will follow up with the right next step.'}</p>

              <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput label="Name" value={form.name} onChange={(value) => updateField('name', value)} placeholder="Your name" />
                <FormInput label="Email" type="email" value={form.email} onChange={(value) => updateField('email', value)} placeholder="you@example.com" />
                <FormInput label="Phone" value={form.phone} onChange={(value) => updateField('phone', value)} placeholder="+91 ..." />
                <label className="block">
                  <span className="mb-1.5 block text-xs text-white/65">Project type</span>
                  <select value={form.project_type} onChange={(event) => updateField('project_type', event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#120824] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400">
                    <option value="">Select type</option>
                    {projectTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <FormInput label="Budget" value={form.budget} onChange={(value) => updateField('budget', value)} placeholder="Approx budget" />
                <FormInput label="Shoot / project date" type="date" value={form.project_date} onChange={(value) => updateField('project_date', value)} />
                <FormInput label="Location" value={form.location} onChange={(value) => updateField('location', value)} placeholder="City, venue, or destination" className="sm:col-span-2" />
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs text-white/65">Message</span>
                  <textarea value={form.message} onChange={(event) => updateField('message', event.target.value)} rows={5} className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400" placeholder="Tell us the story, format, deliverables, references, and timeline..." />
                </label>
              </div>

              <button type="submit" disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? 'Sending...' : formSection.button_text || 'Send Project Enquiry'} <Send size={15} />
              </button>
            </form>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
};

const FormInput = ({ label, type = 'text', value, onChange, placeholder = '', className = '' }) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-xs text-white/65">{label}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400" placeholder={placeholder} />
  </label>
);

export default Hire;
