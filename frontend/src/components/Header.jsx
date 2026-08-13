import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { navLinks } from '../data/mock';
import { fetchPublicSettings } from '../lib/api';
import { FALLBACK_IMAGE, handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';

const customNavLinks = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: '/courses' },
  { name: 'About', path: '/about' },
  { name: 'Services', path: '/services' },
  { name: 'Assets', path: '/assets' },
  { name: 'Our Works', path: '/works' },
  { name: 'Hire From Us', path: '/hire' },
];

const Header = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState(null);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    let mounted = true;
    fetchPublicSettings()
      .then((data) => {
        if (mounted && data) setSiteSettings(data);
      })
      .catch((error) => console.warn('[header] Failed to fetch settings', error));
    return () => {
      mounted = false;
    };
  }, []);

  const headerData = useMemo(() => {
    const header = siteSettings?.header || {};
    const siteName = siteSettings?.site_name || 'PRANVITH DOP';
    const logoUrl = header.logo_url || siteSettings?.logo_url || '';
    const logoText = header.logo_badge_text || 'PD';
    
    let primary = header.brand_title_primary || '';
    let accent = header.brand_title_accent || '';

    if (!primary && siteName) {
      const parts = siteName.trim().split(' ');
      if (parts.length > 1) {
        accent = parts.pop();
        primary = parts.join(' ');
      } else {
        primary = siteName;
        accent = '';
      }
    }

    return {
      logoUrl,
      logoText: logoText || 'PD',
      brandPrimary: primary || 'PRANVITH',
      brandAccent: accent || 'DOP',
      ctaText: header.cta_text || 'Buy Bundle',
      ctaLink: header.cta_link || '/assets',
    };
  }, [siteSettings]);

  const isActive = (path) => (
    path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  const refreshHomeIfActive = (event) => {
    if (location.pathname === '/') {
      event.preventDefault();
      window.location.reload();
    }
  };

  return (
    <header className="site-header fixed left-0 right-0 top-0 z-[80] bg-transparent pt-4 md:pt-5 px-4">
      <nav
        className="foureditors-nav mx-auto max-w-7xl flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/75 px-3.5 py-2 backdrop-blur-2xl shadow-[0_14px_50px_rgba(0,0,0,0.72)]"
      >
        <Link to="/" onClick={refreshHomeIfActive} className="flex items-center gap-2.5 shrink-0" data-testid="header-brand">
          {headerData.logoUrl ? (
            <img
              src={safeImageSrc(headerData.logoUrl)}
              alt="Brand logo"
              className="h-9 w-9 rounded-full object-cover border border-white/15"
              onError={handleImageError}
            />
          ) : (
            <div className="brand-orbit h-9 w-9 rounded-full flex items-center justify-center text-white font-extrabold text-[10px]">
              {headerData.logoText}
            </div>
          )}
          <span className="text-xl font-bold tracking-tight text-white font-[Space_Grotesk]">
            {headerData.brandPrimary} {headerData.brandAccent && <span className="text-[#ff5a1f]">{headerData.brandAccent}</span>}
          </span>
        </Link>

        <ul className="hidden lg:flex items-center gap-1">
          {customNavLinks.map((l) => {
            const active = isActive(l.path);
            return (
              <li key={l.name}>
                <Link
                  to={l.path}
                  onClick={l.path === '/' ? refreshHomeIfActive : undefined}
                  className={`rounded-full px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 xl:px-3.5 xl:text-xs ${
                    active
                      ? 'text-white border border-[#ff5a1f]/50 bg-[#ff5a1f]/10'
                      : 'text-white/55 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {l.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            to={safePublicHref(headerData.ctaLink, '/assets')}
            className="inline-flex items-center justify-center rounded-lg border border-[#ff5a1f]/55 bg-[#ff5a1f]/10 text-[#ff8a5c] hover:text-white px-4 py-2 text-[11px] font-semibold uppercase tracking-wider shadow-[0_0_24px_rgba(255,90,31,0.14)] transition hover:bg-[#ff5a1f]"
          >
            {headerData.ctaText}
          </Link>

          <button
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="absolute left-4 right-4 top-[4.75rem] rounded-3xl border border-white/15 bg-[#0b0f14]/95 p-4 shadow-2xl backdrop-blur-2xl lg:hidden">
          <ul className="flex flex-col gap-1">
            {customNavLinks.map((l) => {
              const active = isActive(l.path);
              return (
                <li key={l.name}>
                  <Link
                    to={l.path}
                    onClick={(event) => {
                      setOpen(false);
                      if (l.path === '/') refreshHomeIfActive(event);
                    }}
                    className={`block rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? 'bg-[#ff5a1f]/15 text-[#ff8a5c] font-semibold'
                        : 'text-white/80 hover:bg-white/6 hover:text-white'
                    }`}
                  >
                    {l.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
};

export default Header;
