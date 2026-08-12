import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const plans = [
  {
    name: 'Starter',
    price: 'Rs. 999',
    period: 'one-time',
    description: 'Perfect for beginner editors and social media reel creators.',
    highlight: false,
    features: [
      '10 Cinematic Wedding LUTs',
      '50 Sound Effects Essentials',
      '10 Transition Presets',
      'HD Resolution Support',
      'Standard Commercial License',
    ],
    buttonText: 'Get Starter',
  },
  {
    name: 'Pro',
    price: 'Rs. 2,999',
    period: 'one-time',
    description: 'The complete toolkit for professional wedding & commercial editors.',
    highlight: true,
    badge: 'MOST POPULAR',
    features: [
      '50+ All-Access Cinema LUTs',
      '500+ Studio Mastered SFX',
      '100+ 4K MOGRT & AE Transitions',
      'Album PSD Collection Included',
      'Lifetime Free Revisions & Updates',
      'Extended Broadcast License',
      'Priority 24/7 Support',
    ],
    buttonText: 'Get Pro Access',
  },
  {
    name: 'Ultimate',
    price: 'Rs. 5,999',
    period: 'one-time',
    description: 'Full asset suite + 1-on-1 editing mentorship and custom LUT creation.',
    highlight: false,
    features: [
      'Everything in Pro Suite',
      '1-on-1 Color Grading Mentorship',
      'Custom LUT Request for Your Camera',
      '1000+ Raw Log Footage Samples',
      'Direct WhatsApp VIP Support',
    ],
    buttonText: 'Get Ultimate',
  },
];

const PricingSection = () => {
  return (
    <section className="section-block relative py-24 px-6 bg-[#05070a] overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-xs font-semibold uppercase tracking-wider text-[#60a5fa] mb-4">
            TRANSPARENT PRICING
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-[Space_Grotesk]">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-white/65 max-w-xl mx-auto text-base">
            No subscriptions. One-time payment for lifetime download access.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 items-stretch">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                plan.highlight
                  ? 'border-2 border-[#3b82f6] bg-gradient-to-b from-[#0b0f14] via-[#111827] to-[#0b0f14] shadow-[0_20px_60px_rgba(59,130,246,0.35)] scale-105 z-10'
                  : 'border border-white/10 bg-[#0b0f14] hover:border-white/20'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white text-[11px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                  {plan.badge}
                </div>
              )}

              <div>
                <h3 className="text-2xl font-bold text-white mb-2 font-[Space_Grotesk]">
                  {plan.name}
                </h3>
                <p className="text-xs text-white/60 mb-6 leading-relaxed">
                  {plan.description}
                </p>

                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-white font-[Space_Grotesk]">
                    {plan.price}
                  </span>
                  <span className="text-xs text-white/40 ml-2">/ {plan.period}</span>
                </div>

                {/* Feature List */}
                <div className="space-y-3 mb-8">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-white/80">
                      <div className="h-5 w-5 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-[#60a5fa] shrink-0">
                        <Check size={12} />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to="/assets"
                className={`w-full py-4 rounded-xl text-sm font-semibold text-center transition-all duration-300 block ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white shadow-[0_8px_25px_rgba(59,130,246,0.4)]'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {plan.buttonText}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
