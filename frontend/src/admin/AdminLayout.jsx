import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, Bell, LogOut, User } from 'lucide-react';
import navItems from './nav';
import { useAdminAuth } from './AdminAuthContext';

const AdminLayout = () => {
  const [open, setOpen] = useState(false);
  const { admin, logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex h-full flex-col lg:flex-row">
        <aside className="fixed left-0 top-0 z-20 h-full w-full border-b border-slate-800 bg-slate-950/95 p-4 backdrop-blur-xl lg:relative lg:h-auto lg:w-80 lg:border-r lg:border-b-0 lg:bg-slate-950/100">
          <div className="flex items-center justify-between lg:justify-start">
            <Link to="/admin/dashboard" className="text-xl font-semibold tracking-tight text-white">
              BBEdits CMS
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 lg:hidden"
              onClick={() => setOpen((prev) => !prev)}
            >
              <Menu size={18} />
            </button>
          </div>

          <div className={`${open ? 'block' : 'hidden'} mt-8 space-y-1 lg:block`}>
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
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="lg:ml-80 flex-1 pb-16">
          <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur-xl lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 lg:hidden"
                  onClick={() => setOpen((prev) => !prev)}
                >
                  <Menu size={18} />
                </button>
                <div>
                  <p className="text-sm text-slate-500">Welcome back,</p>
                  <p className="text-base font-semibold text-white">{admin?.name || 'Admin'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  title="Notifications"
                >
                  <Bell size={18} />
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  title="Profile"
                >
                  <User size={18} />
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-rose-600/10 px-4 py-2 text-sm text-rose-300 hover:bg-rose-600/20"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="space-y-6 p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
