import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { submitHireRequest } from '../lib/api';

const benefits = [
  'Vetted, course-trained video editors',
  'Wedding, reels, YouTube and brand specialists',
  'Fast 24–48 hour turnaround',
  'Affordable packages from ₹1,499',
  'Unlimited revisions until happy',
];

const Hire = () => {
  const [form, setForm] = useState({ name: '', email: '', requirement: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.requirement) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      setBusy(true);
      const res = await submitHireRequest(form);
      toast.success(res?.message || 'Request sent!');
      setForm({ name: '', email: '', requirement: '' });
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to send. Try again.';
      toast.error(typeof msg === 'string' ? msg : 'Failed to send request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="bg-[#070314] text-white">
      <Header />
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              Hire From{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-300">
                Our Editors
              </span>
            </h1>
            <p className="mt-6 text-white/70 leading-relaxed">
              Need a professional editor for your wedding, brand or YouTube channel? Tell us about your project
              and we will match you with the right PranavithDOP-trained editor.
            </p>
            <ul className="mt-8 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-white/80">
                  <CheckCircle2 size={18} className="text-violet-400 mt-0.5 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <form
            onSubmit={submit}
            className="p-7 md:p-9 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#120830]/80 to-[#070314]/70 backdrop-blur"
          >
            <h3 className="text-xl font-semibold text-white mb-6">Tell us about your project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/65 mb-1.5">Your Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs text-white/65 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-white/65 mb-1.5">Your requirement</label>
                <textarea
                  value={form.requirement}
                  onChange={(e) => setForm({ ...form, requirement: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/60 resize-none"
                  placeholder="e.g. 5-minute wedding teaser, cinematic style..."
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 transition-colors text-white py-3 rounded-lg text-sm font-semibold"
              >
                Send Request <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default Hire;
