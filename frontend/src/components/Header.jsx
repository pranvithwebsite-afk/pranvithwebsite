import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { navLinks } from '../data/mock';
import { useCustomerAuth } from '../auth/CustomerAuthContext';
import { toast } from 'sonner';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onSignOut = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/');
    setOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-5 px-4">
      <nav
        className={`flex items-center justify-between gap-4 md:gap-8 px-3 md:px-5 py-2 rounded-full border border-white/10 backdrop-blur-xl transition-all duration-300 w-full max-w-5xl ${
          scrolled ? 'bg-[#0a0518]/95 shadow-[0_8px_40px_rgba(139,92,246,0.15)]' : 'bg-[#0a0518]/70'
        }`}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="header-brand">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-violet-500/40 bg-gradient-to-br from-rose-500 to-orange-500">
            <img
              src="/assets/brand-profile.png"
              alt="PranvithDOP"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">PranvithDOP</span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => {
            const active = location.pathname === l.path;
            return (
              <li key={l.name}>
                <Link
                  to={l.path}
                  data-testid={`nav-${l.name.toLowerCase().replace(/\s+/g, '-')}`}
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

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/dashboard"
                data-testid="header-dashboard"
                className="inline-flex items-center gap-1.5 text-white/85 hover:text-white px-3 py-2 text-sm font-medium"
              >
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <button
                onClick={onSignOut}
                data-testid="header-signout"
                className="inline-flex items-center gap-1.5 bg-white text-[#0a0518] px-4 py-2 rounded-full text-sm font-semibold hover:bg-violet-100 transition"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="header-signin"
                className="text-white/85 hover:text-white px-3 py-2 text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                data-testid="header-signup"
                className="bg-white text-[#0a0518] px-4 py-2 rounded-full text-sm font-semibold hover:bg-violet-100 transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

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
                  data-testid={`mobile-nav-${l.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="block px-4 py-3 rounded-xl text-white/90 hover:bg-white/5"
                >
                  {l.name}
                </Link>
              </li>
            ))}
            {user ? (
              <>
                <li>
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    data-testid="mobile-dashboard"
                    className="block px-4 py-3 rounded-xl text-white/90 hover:bg-white/5"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <button
                    onClick={onSignOut}
                    data-testid="mobile-signout"
                    className="w-full text-left px-4 py-3 rounded-xl text-rose-300 hover:bg-rose-500/10"
                  >
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    data-testid="mobile-signin"
                    className="block px-4 py-3 rounded-xl text-white/90 hover:bg-white/5"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    data-testid="mobile-signup"
                    className="block w-full mt-1 bg-white text-[#0a0518] px-5 py-3 rounded-xl text-sm font-semibold text-center"
                  >
                    Sign Up
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </header>
  );
};

export default Header;
