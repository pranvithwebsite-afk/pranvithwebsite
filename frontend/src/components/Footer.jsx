import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { footerLinks } from '../data/mock';
import { toast } from 'sonner';
import { fetchPublicSettings, subscribeNewsletter } from '../lib/api';

const footerDefaults = {
  brand_title: 'PranvithDOP',
  description: 'Empowering creators with AI-driven tools and professional video editing resources.\nJoin the future of content creation.',
  youtube_link: '#',
  instagram_link: '#',
  explore_links: footerLinks.explore,
  contact_location: footerLinks.contact.location,
  contact_email: footerLinks.contact.email,
  contact_phone: footerLinks.contact.phone,
  newsletter_heading: 'Stay Updated',
  newsletter_description: 'Subscribe to our newsletter for the latest AI tools and editing tips.',
  subscribe_button_text: 'Subscribe',
};

const Footer = () => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [settingsFooter, setSettingsFooter] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchPublicSettings()
      .then((settings) => {
        if (mounted) setSettingsFooter(settings?.footer || null);
      })
      .catch(() => {
        if (mounted) setSettingsFooter(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const footer = useMemo(() => ({ ...footerDefaults, ...(settingsFooter || {}) }), [settingsFooter]);
  const exploreLinks = Array.isArray(footer.explore_links) && footer.explore_links.length
    ? footer.explore_links.filter((link) => link.enabled !== false)
    : footerDefaults.explore_links;

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
    <footer className="relative border-t border-purple-300/15">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <h4 className="text-2xl font-bold text-white">{footer.brand_title}</h4>
            <p className="mt-4 whitespace-pre-line text-sm text-white/65 leading-relaxed max-w-xs">{footer.description}</p>
            <div className="mt-6 flex items-center gap-3">
              <a href={footer.youtube_link || '#'} aria-label="YouTube" className="w-9 h-9 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-300/20 flex items-center justify-center transition">
                <Youtube size={16} />
              </a>
              <a href={footer.instagram_link || '#'} aria-label="Instagram" className="w-9 h-9 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-300/20 flex items-center justify-center transition">
                <Instagram size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-base font-semibold text-white mb-5">Explore</h4>
            <ul className="space-y-3">
              {exploreLinks.map((l) => (
                <li key={`${l.name}-${l.path}`}>
                  <Link to={l.path || '#'} className="text-sm text-white/65 hover:text-[#c4b5fd] transition">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-base font-semibold text-white mb-5">Contact</h4>
            <ul className="space-y-3 text-sm text-white/65">
              <li className="flex items-center gap-3">
                <MapPin size={16} className="text-purple-200" />
                {footer.contact_location}
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-purple-200" />
                {footer.contact_email}
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-purple-200" />
                {footer.contact_phone}
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-base font-semibold text-white mb-5">{footer.newsletter_heading}</h4>
            <p className="text-sm text-white/65 mb-4">{footer.newsletter_description}</p>
            <form onSubmit={onSubscribe} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2.5 rounded-lg bg-purple-500/10 border border-purple-300/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-300/35"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 transition-colors text-white text-sm font-semibold"
              >
                {busy ? 'Subscribing...' : footer.subscribe_button_text}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-purple-300/15 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/55">© {new Date().getFullYear()} {footer.brand_title}. All rights reserved.</p>
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
