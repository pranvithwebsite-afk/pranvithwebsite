import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, Youtube, Instagram } from 'lucide-react';
import { footerLinks } from '../data/mock';
import { toast } from 'sonner';
import { subscribeNewsletter } from '../lib/api';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    try {
      setBusy(true);
      const res = await subscribeNewsletter(email);
      toast.success(res?.message || 'Subscribed!');
      setEmail('');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Subscription failed. Try again.';
      toast.error(typeof msg === 'string' ? msg : 'Subscription failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="relative border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* About */}
          <div>
            <h4 className="text-2xl font-bold text-white">PranvithDOP</h4>
            <p className="mt-4 text-sm text-white/65 leading-relaxed max-w-xs">
              Empowering creators with AI-driven tools and professional video editing resources.
              Join the future of content creation.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a href="#" aria-label="YouTube" className="w-9 h-9 rounded-full bg-white/5 hover:bg-violet-600 border border-white/10 flex items-center justify-center transition">
                <Youtube size={16} />
              </a>
              <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/5 hover:bg-violet-600 border border-white/10 flex items-center justify-center transition">
                <Instagram size={16} />
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-base font-semibold text-white mb-5">Explore</h4>
            <ul className="space-y-3">
              {footerLinks.explore.map((l) => (
                <li key={l.name}>
                  <Link to={l.path} className="text-sm text-white/65 hover:text-violet-400 transition">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-base font-semibold text-white mb-5">Contact</h4>
            <ul className="space-y-3 text-sm text-white/65">
              <li className="flex items-center gap-3">
                <MapPin size={16} className="text-violet-400" />
                {footerLinks.contact.location}
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-violet-400" />
                {footerLinks.contact.email}
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-violet-400" />
                {footerLinks.contact.phone}
              </li>
            </ul>
          </div>

          {/* Stay updated */}
          <div>
            <h4 className="text-base font-semibold text-white mb-5">Stay Updated</h4>
            <p className="text-sm text-white/65 mb-4">Subscribe to our newsletter for the latest AI tools and editing tips.</p>
            <form onSubmit={onSubscribe} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-violet-500/60"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 transition-colors text-white text-sm font-semibold"
              >
                {busy ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/55">© {new Date().getFullYear()} PranvithDOP. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-white/55">
            <Link to="/privacy#terms" className="hover:text-white">Terms</Link>
            <Link to="/privacy#privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
