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
    <footer className="site-footer footer-spectrum relative w-full shrink-0 pt-24 pb-12 bg-transparent overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative z-10 rounded-2xl border border-white/15 bg-[linear-gradient(120deg,rgba(42,13,5,.78),rgba(7,9,14,.72)_48%,rgba(4,28,65,.78))] p-8 md:p-12 backdrop-blur-2xl shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
            {/* Brand Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="brand-orbit h-9 w-9 rounded-full flex items-center justify-center text-white font-extrabold text-[10px]">
                  PD
                </div>
                <span className="text-2xl font-bold tracking-tight text-white font-[Space_Grotesk]">
                  PRANVITH <span className="text-[#ff5a1f]">DOP</span>
                </span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed max-w-sm">
                Cinematic Assets • LUTs • Wedding Films • Editing Tools. Empowering editors and cinematographers around the world.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a href="#" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#60a5fa] transition hover:bg-[#3b82f6] hover:text-white">
                  <Youtube size={16} />
                </a>
                <a href="#" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#60a5fa] transition hover:bg-[#3b82f6] hover:text-white">
                  <Instagram size={16} />
                </a>
              </div>
            </div>

            {/* Products */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white font-[Space_Grotesk] mb-4">Products</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><Link to="/assets" className="hover:text-[#60a5fa] transition">Wedding LUTs</Link></li>
                <li><Link to="/assets" className="hover:text-[#60a5fa] transition">SFX Bundles</Link></li>
                <li><Link to="/assets" className="hover:text-[#60a5fa] transition">Transitions</Link></li>
                <li><Link to="/assets" className="hover:text-[#60a5fa] transition">Album PSDs</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white font-[Space_Grotesk] mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><Link to="/about" className="hover:text-[#60a5fa] transition">About Us</Link></li>
                <li><Link to="/works" className="hover:text-[#60a5fa] transition">Our Works</Link></li>
                <li><Link to="/services" className="hover:text-[#60a5fa] transition">Services</Link></li>
                <li><Link to="/courses" className="hover:text-[#60a5fa] transition">Courses</Link></li>
                <li><Link to="/hire" className="hover:text-[#60a5fa] transition">Contact</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white font-[Space_Grotesk] mb-4">Support</h4>
              <ul className="space-y-2.5 text-sm text-white/60">
                <li><Link to="/privacy#faq" className="hover:text-[#60a5fa] transition">Help Center & FAQ</Link></li>
                <li><Link to="/privacy#terms" className="hover:text-[#60a5fa] transition">Commercial License</Link></li>
                <li><Link to="/privacy#privacy" className="hover:text-[#60a5fa] transition">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 md:flex-row text-xs text-white/50">
            <p>© 2026 PRANVITH DOP. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy#terms" className="hover:text-white transition">Terms of Service</Link>
              <Link to="/privacy#privacy" className="hover:text-white transition">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
