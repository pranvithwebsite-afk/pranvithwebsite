import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CalendarDays, CheckCircle2, MapPin, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { submitHireRequest } from '../lib/api';
import { usePageData } from '../hooks/usePageData';

const defaultBenefits = [
  'Cinematic wedding, commercial, drone, and brand storytelling',
  'DOP-led planning for light, movement, locations, and edit mood',
  'Editing, DI, product photography, and creative design support',
  'Clear project scope, timeline, and delivery expectations',
  'Flexible packages for shoots, campaigns, reels, and full films',
];

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

const projectTypes = [
  'Commercial Ad',
  'Wedding Cinematography',
  'Drone Shoot',
  'Product Shoot',
  'Film / Music Video',
  'Editing / DI',
  'Other',
];

const Hire = () => {
  const { page } = usePageData('hire');
  const intro = page?.sections?.intro || {};
  const benefits = page?.sections?.benefits || defaultBenefits;

  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
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

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-violet-100">
              <Sparkles size={14} /> Book PranvithDOP
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              {intro.headline || (
                <>
                  Build a film, campaign, or visual story with{' '}
                  <span className="bg-gradient-to-r from-violet-300 to-sky-300 bg-clip-text text-transparent">
                    cinematic intent.
                  </span>
                </>
              )}
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/68">
              {intro.description || 'Tell us about your shoot, brand film, wedding, reel, product campaign, or edit. We will shape the look, schedule, and creative plan around the story you want people to feel.'}
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

          <form
            onSubmit={submit}
            className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#13092f]/90 via-[#0b061b]/95 to-[#070314]/95 p-6 shadow-2xl shadow-violet-950/30 backdrop-blur md:p-8"
          >
            <h2 className="text-2xl font-semibold text-white">Start a project enquiry</h2>
            <p className="mt-2 text-sm text-white/55">A few details are enough. We will follow up with the right next step.</p>

            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/65">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/65">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/65">Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  placeholder="+91 ..."
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/65">Project type</span>
                <select
                  value={form.project_type}
                  onChange={(e) => updateField('project_type', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#120824] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                >
                  <option value="">Select type</option>
                  {projectTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/65">Budget</span>
                <input
                  value={form.budget}
                  onChange={(e) => updateField('budget', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  placeholder="Approx budget"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/65">Shoot / project date</span>
                <input
                  type="date"
                  value={form.project_date}
                  onChange={(e) => updateField('project_date', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs text-white/65">Location</span>
                <input
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  placeholder="City, venue, or destination"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs text-white/65">Message</span>
                <textarea
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400"
                  placeholder="Tell us the story, format, deliverables, references, and timeline..."
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Sending...' : 'Send Project Enquiry'} <Send size={15} />
            </button>
          </form>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default Hire;
