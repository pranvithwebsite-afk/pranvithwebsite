import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { navLinks } from '../data/mock';

const Header = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-5 px-4">
      <nav
        className={`flex items-center justify-between gap-4 md:gap-8 px-3 md:px-5 py-2 rounded-full border border-white/10 backdrop-blur-xl transition-all duration-300 w-full max-w-5xl ${
          scrolled ? 'bg-[#0a0518]/95 shadow-[0_8px_40px_rgba(139,92,246,0.15)]' : 'bg-[#0a0518]/70'
        }`}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-violet-500/40 bg-gradient-to-br from-rose-500 to-orange-500">
            <img
              src="https://customer-assets.emergentagent.com/job_bb-redesign/artifacts/n2h83zkv_IMG_7675.PNG"
              alt="PranavithDOP"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">PranavithDOP</span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => {
            const active = location.pathname === l.path;
            return (
              <li key={l.name}>
                <Link
                  to={l.path}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    active ? 'text-violet-400' : 'text-white/85 hover:text-white'
                  }`}
                >
                  {l.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          onClick={() => alert('Sign In is a demo button (frontend only)')}
          className="hidden md:inline-flex bg-white text-[#0a0518] px-5 py-2 rounded-full text-sm font-semibold hover:bg-violet-100 transition"
        >
          Sign In
        </button>

        <button className="md:hidden text-white" onClick={() => setOpen(!open)} aria-label="menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="absolute top-20 left-4 right-4 bg-[#0d0720]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <li key={l.name}>
                <Link
                  to={l.path}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-xl text-white/90 hover:bg-white/5"
                >
                  {l.name}
                </Link>
              </li>
            ))}
            <li>
              <button className="w-full mt-2 bg-white text-[#0a0518] px-5 py-3 rounded-xl text-sm font-semibold">
                Sign In
              </button>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Header;
