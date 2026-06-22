import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { navLinks } from '../data/mock';
import { FALLBACK_IMAGE, handleImageError } from '../lib/utils';

const Header = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const refreshHomeIfActive = (event) => {
    if (location.pathname === '/') {
      event.preventDefault();
      window.location.reload();
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-[80] flex justify-center px-4 pt-4 md:pt-5">
      <nav
        className={`flex w-full max-w-[1160px] items-center justify-between gap-3 rounded-full border border-white/10 px-3 py-2 ring-1 ring-violet-500/10 backdrop-blur-xl transition-all duration-300 md:gap-8 md:px-5 ${
          scrolled
            ? 'bg-[#090612]/85 shadow-[0_18px_70px_rgba(124,58,237,0.28)]'
            : 'bg-[#090612]/65 shadow-[0_18px_60px_rgba(124,58,237,0.20)]'
        }`}
      >
        <Link to="/" onClick={refreshHomeIfActive} className="flex items-center gap-2 shrink-0" data-testid="header-brand">
          <div className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-rose-500 to-orange-500 ring-2 ring-violet-400/45 shadow-[0_0_26px_rgba(139,92,246,0.32)]">
            <img
              src={FALLBACK_IMAGE}
              alt="PranvithDOP"
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.16)]">PranvithDOP</span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => {
            const active = location.pathname === l.path;
            return (
              <li key={l.name}>
                <Link
                  to={l.path}
                  onClick={l.path === '/' ? refreshHomeIfActive : undefined}
                  data-testid={`nav-${l.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-violet-500/12 text-violet-300 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.16),0_0_22px_rgba(124,58,237,0.18)]'
                      : 'text-white/78 hover:bg-white/5 hover:text-white hover:shadow-[0_0_22px_rgba(124,58,237,0.16)]'
                  }`}
                >
                  {l.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          className="rounded-full border border-white/10 bg-white/5 p-2 text-white shadow-[0_0_20px_rgba(124,58,237,0.12)] transition hover:bg-white/10 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="absolute left-4 right-4 top-[4.75rem] rounded-3xl border border-white/10 bg-[#090612]/90 p-3 shadow-[0_22px_70px_rgba(124,58,237,0.28)] ring-1 ring-violet-500/10 backdrop-blur-xl md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((l) => {
              const active = location.pathname === l.path;
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
                        ? 'bg-violet-500/15 text-violet-200 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.16)]'
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
