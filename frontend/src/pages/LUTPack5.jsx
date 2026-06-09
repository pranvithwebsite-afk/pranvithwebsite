import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ChevronRight, CheckCircle, ShieldCheck, Sparkles, Monitor, FileText, Award, Download, ArrowRight } from 'lucide-react';

const PAYMENT_LINK = 'https://rzp.io/rzp/yThuB5K';

const features = [
  'Professional Cinematic Look',
  'Works Instantly',
  'Saves Editing Time',
  'Beginner Friendly',
  'Professional Color Science',
  'Compatible With Major Editing Software',
];

const includes = [
  '10 LUT Files for cinematic grading',
  'Installation Guide',
  'Usage Instructions',
  'Future Updates',
];

const compatibility = [
  'Adobe Premiere Pro',
  'DaVinci Resolve',
  'Final Cut Pro',
  'After Effects',
];

const faqs = [
  {
    q: 'Can I use these LUTs with any editing software?',
    a: 'Yes. This LUT pack is compatible with Premiere Pro, DaVinci Resolve, Final Cut Pro, After Effects and any editor that supports 3D LUT imports.',
  },
  {
    q: 'Do I need advanced editing skills to use these LUTs?',
    a: 'No. These LUTs are beginner friendly and designed to work instantly. A simple import and one-click application is all you need.',
  },
  {
    q: 'Will the LUTs work with my footage?',
    a: 'Absolutely. The pack is calibrated for cinematographic color science and works well with RAW, LOG, and standard video formats.',
  },
  {
    q: 'How do I receive the files after purchase?',
    a: 'After payment, you will be redirected to a thank-you page with instant download access and instructions for installation.',
  },
  {
    q: 'Will I get updates if new LUTs are released?',
    a: 'Yes. Future updates are included with your purchase, and you will receive notification details on the thank-you page.',
  },
];

const LUTPack5 = () => {
  return (
    <main className="bg-[#070314] text-white min-h-screen">
      <Header />
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-white/55 mb-8">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight size={14} />
            <Link to="/assets" className="hover:text-white">Assets</Link>
            <ChevronRight size={14} />
            <span className="text-white/85">LUT Pack 5</span>
          </nav>

          <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-gradient-to-br from-[#090712] via-[#0d0820] to-[#0a0518] p-8 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_420px] items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/15 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-violet-300 mb-6">
                  <Sparkles size={16} /> Premium LUT Pack
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Pranavith Cinematic LUT Pack 5</h1>
                <p className="mt-6 max-w-2xl text-white/70 leading-relaxed text-sm md:text-base">
                  Give your videos the cinematic grade used by professional filmmakers. This LUT pack is crafted for dramatic color, punchy contrast, and fast, polished edits.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="rounded-3xl bg-white/5 border border-white/10 px-6 py-5 text-white">
                    <p className="text-sm uppercase tracking-[0.3em] text-white/50">One-time price</p>
                    <p className="mt-3 text-4xl font-extrabold text-violet-300">₹10.00</p>
                  </div>
                  <a
                    href={PAYMENT_LINK}
                    target="_self"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-3xl bg-violet-600 px-8 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-violet-500"
                  >
                    Buy Now
                    <ArrowRight size={18} />
                  </a>
                </div>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-[#090712] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                <div className="text-sm uppercase tracking-[0.35em] text-white/40">What you get</div>
                <ul className="mt-6 space-y-4">
                  {includes.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                        <CheckCircle size={16} />
                      </span>
                      <span className="text-sm text-white/75">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold tracking-tight mb-8">Before & After</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <ComparisonCard title="Before Color Grade" description="Original footage with flat tone and no cinematic punch." />
            <ComparisonCard title="After Color Grade" description="Fine-tuned cinematic color, contrast, and polished filmic tone." accent />
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-6">Features & Benefits</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {features.map((item) => (
                  <div key={item} className="rounded-3xl border border-white/10 bg-[#0d0820]/90 p-6 text-sm text-white/75 transition hover:border-violet-500/30 hover:bg-[#11101f]">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                      <Sparkles size={18} />
                    </div>
                    <p className="font-semibold text-white">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-[#090712] p-8">
              <div className="inline-flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-white/40 mb-6">
                <ShieldCheck size={16} /> Trusted quality
              </div>
              <p className="text-white/70 leading-relaxed">
                Pranavith Cinematic LUT Pack 5 is built with pro-level color science and tested on commercial films, wedding edits, and content reels. It is crafted to save time while elevating every frame.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-[2rem] border border-white/10 bg-[#0b0920] p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-white/40">Compatibility</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">Works with your editor</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {compatibility.map((item) => (
                  <div key={item} className="rounded-3xl border border-white/10 bg-[#090712]/80 px-4 py-4 text-center text-sm text-white/75">
                    <span className="block font-semibold text-white mb-1">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold tracking-tight mb-8">Market Comparison</h2>
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0820]/90">
            <table className="min-w-full text-left text-sm text-white/75">
              <thead className="border-b border-white/10 bg-[#090712]/95 text-white/85">
                <tr>
                  <th className="px-6 py-4">Feature</th>
                  <th className="px-6 py-4">Our LUT Pack</th>
                  <th className="px-6 py-4">Typical Market LUT Packs</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Price', '₹10 one-time', '₹499+'],
                  ['Support', 'Direct email support', 'Limited or no support'],
                  ['Ease of Use', 'One-click install', 'Requires manual setup'],
                  ['Quality', 'Cinematic color science', 'Generic grades'],
                  ['Updates', 'Included with purchase', 'Extra charge'],
                ].map(([label, ours, market]) => (
                  <tr key={label} className="border-b border-white/10 last:border-b-0">
                    <td className="px-6 py-4 text-white/85 font-medium">{label}</td>
                    <td className="px-6 py-4">{ours}</td>
                    <td className="px-6 py-4">{market}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold tracking-tight mb-8">Frequently Asked Questions</h2>
          <div className="grid gap-4">
            {faqs.map((item) => (
              <div key={item.q} className="rounded-3xl border border-white/10 bg-[#0a0518]/90 p-6">
                <p className="font-semibold text-white">{item.q}</p>
                <p className="mt-3 text-white/70 leading-relaxed text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-[2rem] border border-violet-500/20 bg-gradient-to-br from-[#110d24] via-[#090712] to-[#0a0418] p-10 text-center">
            <span className="inline-flex items-center justify-center rounded-full bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-violet-300 mb-6">
              Get Instant Access
            </span>
            <h2 className="text-4xl font-bold tracking-tight text-white">Lock in the cinematic grade today</h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/70 leading-relaxed">
              Buy Pranavith Cinematic LUT Pack 5 and get professional-grade color tools that make your edits look premium from the first frame.
            </p>
            <a
              href={PAYMENT_LINK}
              target="_self"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-10 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-violet-500"
            >
              Buy Now
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

const ComparisonCard = ({ title, description, accent }) => (
  <div className={`rounded-[2rem] border ${accent ? 'border-violet-500/20 bg-[#18102c]' : 'border-white/10 bg-[#0d0820]'} p-8`}>
    <div className="text-xs uppercase tracking-[0.35em] text-white/40 mb-4">{title}</div>
    <div className="h-[260px] rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70 flex flex-col justify-between">
      <div>
        <div className="mb-3 h-28 rounded-3xl bg-white/5" />
        <p className="text-sm leading-relaxed">{description}</p>
      </div>
      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
        <Monitor size={14} /> Placeholder preview
      </span>
    </div>
  </div>
);

export default LUTPack5;
