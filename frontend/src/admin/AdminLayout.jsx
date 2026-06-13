import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Bell, LogOut, User, X } from 'lucide-react';
import navItems from './nav';
import { useAdminAuth } from './AdminAuthContext';

const AdminLayout = () => {
  const [open, setOpen] = useState(false);
  const { admin, logout } = useAdminAuth();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close admin navigation"
        />
      )}

      <div className="flex min-h-screen">
        <aside
          id="admin-navigation"
          className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-72 max-w-[85vw] shrink-0 flex-col border-r border-slate-800 bg-slate-950 p-4 shadow-2xl shadow-black/40 transition-transform duration-200 ease-out sm:w-80 lg:sticky lg:top-0 lg:h-screen lg:max-w-none lg:translate-x-0 lg:shadow-none ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between">
            <Link to="/admin/dashboard" className="text-xl font-semibold tracking-tight text-white">
              PranvithDOP CMS
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close admin navigation"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="mt-8 flex-1 space-y-1 overflow-y-auto" aria-label="Admin navigation">
            <div className="space-y-1 rounded-3xl bg-slate-900 p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                        isActive ? 'bg-violet-600/20 text-white' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`
                    }
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 pb-16">
          <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur-xl lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 lg:hidden"
                  onClick={() => setOpen(true)}
                  aria-label="Open admin navigation"
                  aria-controls="admin-navigation"
                  aria-expanded={open}
                >
                  <Menu size={18} />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white lg:text-sm lg:font-normal lg:text-slate-500">
                    <span className="lg:hidden">PranvithDOP CMS</span>
                    <span className="hidden lg:inline">Welcome back,</span>
                  </p>
                  <p className="hidden truncate text-base font-semibold text-white lg:block">{admin?.name || 'Admin'}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 sm:inline-flex"
                  title="Notifications"
                >
                  <Bell size={18} />
                </button>
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 sm:inline-flex"
                  title="Profile"
                >
                  <User size={18} />
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-800 bg-rose-600/10 px-3 text-sm text-rose-300 hover:bg-rose-600/20 sm:px-4"
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
