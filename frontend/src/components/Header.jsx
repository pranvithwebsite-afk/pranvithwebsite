import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { navLinks } from '../data/mock';
import { FALLBACK_IMAGE, handleImageError } from '../lib/utils';

const Header = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);

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
    <header className="site-header fixed left-0 right-0 top-0 z-[80] bg-transparent pt-4 md:pt-5">
      <nav
        className="site-container flex items-center justify-between gap-3 rounded-full border border-[var(--border-soft)] bg-[rgba(0,49,53,0.78)] px-3 py-2 backdrop-blur-[18px] transition-all duration-300 md:gap-8 md:px-5"
      >
        <Link to="/" onClick={refreshHomeIfActive} className="flex items-center gap-2 shrink-0" data-testid="header-brand">
          <div className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-[#964734] to-[#0FA4AF] ring-2 ring-[#0FA4AF]/45 shadow-[0_0_26px_rgba(15,164,175,0.35)]">
            <img
              src={FALLBACK_IMAGE}
              alt="PranvithDOP"
              width="36"
              height="36"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.16)]">PranvithDOP</span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => {
            const active = isActive(l.path);
            return (
              <li key={l.name}>
                <Link
                  to={l.path}
                  onClick={l.path === '/' ? refreshHomeIfActive : undefined}
                  data-testid={`nav-${l.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-[rgba(15,164,175,0.22)] text-accent-purple-strong font-semibold'
                      : 'text-white/78 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {l.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          className="rounded-full border border-white/10 bg-white/5 p-2 text-white shadow-[0_0_20px_rgba(15,164,175,0.15)] transition hover:bg-white/10 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="absolute left-4 right-4 top-[4.75rem] rounded-3xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-3 shadow-[0_22px_70px_rgba(0,49,53,0.85)] backdrop-blur-xl md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((l) => {
              const active = isActive(l.path);
              return (
                <li key={l.name}>
                  <Link
                    to={l.path}
                    onClick={(event) => {
                      setOpen(false);
                      if (l.path === '/') refreshHomeIfActive(event);
                    }}
                    data-testid={`mobile-nav-${l.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`block rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                      active
                        ? 'bg-[rgba(15,164,175,0.22)] text-accent-purple-strong font-semibold'
                        : 'text-white/86 hover:bg-white/6 hover:text-white'
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
