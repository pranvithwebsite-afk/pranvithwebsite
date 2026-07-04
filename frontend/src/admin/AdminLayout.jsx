import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, KeyRound, LogOut, Menu, ShieldCheck, User, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import navItems from './nav';
import { useAdminAuth } from './AdminAuthContext';
import { changeAdminPassword } from '../lib/api';
import { AdminConfirmProvider } from './components/AdminConfirmProvider';

const AdminLayout = () => {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { admin, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setProfileOpen(false);
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

  useEffect(() => {
    if (!profileOpen) return undefined;
    const handlePointerDown = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [profileOpen]);

  const openAdminUsers = () => {
    setProfileOpen(false);
    navigate('/admin/admin-users');
  };

  return (
    <AdminConfirmProvider>
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
                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setProfileOpen((value) => !value)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-violet-500 hover:bg-slate-800"
                      title="Profile"
                      aria-label="Open admin profile"
                      aria-expanded={profileOpen}
                    >
                      <User size={18} />
                    </button>
                    {profileOpen && (
                      <AdminProfileDropdown
                        admin={admin}
                        onChangePassword={() => {
                          setProfileOpen(false);
                          setPasswordOpen(true);
                        }}
                        onManageAdmins={openAdminUsers}
                        onLogout={logout}
                      />
                    )}
                  </div>
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
        {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
      </div>
    </AdminConfirmProvider>
  );
};

const AdminProfileDropdown = ({ admin, onChangePassword, onManageAdmins, onLogout }) => (
  <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/50">
    <div className="border-b border-slate-800 bg-gradient-to-br from-violet-600/20 via-slate-900 to-slate-950 p-5">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10 text-violet-100">
        <ShieldCheck size={22} />
      </div>
      <p className="mt-4 text-lg font-semibold text-white">{admin?.name || 'Admin'}</p>
      <p className="mt-1 break-all text-sm text-slate-400">{admin?.email || 'admin'}</p>
    </div>
    <div className="space-y-3 p-4 text-sm">
      <InfoRow label="Role" value={admin?.role || 'admin'} />
      <InfoRow label="Status" value={admin?.is_active === false ? 'Inactive' : 'Active'} accent={admin?.is_active === false ? 'rose' : 'emerald'} />
      <button type="button" onClick={onChangePassword} className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 px-4 py-3 text-left font-semibold text-white hover:border-violet-500 hover:bg-slate-900">
        <KeyRound size={16} /> Change Password
      </button>
      <button type="button" onClick={onManageAdmins} className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 px-4 py-3 text-left font-semibold text-white hover:border-violet-500 hover:bg-slate-900">
        <Users size={16} /> Manage Admins
      </button>
      <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-2xl border border-rose-500/30 px-4 py-3 text-left font-semibold text-rose-100 hover:border-rose-400 hover:bg-rose-500/10">
        <LogOut size={16} /> Logout
      </button>
    </div>
  </div>
);

const InfoRow = ({ label, value, accent }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
    <span className="text-slate-500">{label}</span>
    <span className={`font-semibold ${accent === 'emerald' ? 'text-emerald-300' : accent === 'rose' ? 'text-rose-300' : 'text-slate-200'}`}>{value}</span>
  </div>
);

const ChangePasswordModal = ({ onClose }) => {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.current_password) {
      toast.error('Current password is required');
      return;
    }
    if (form.new_password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (form.new_password !== form.confirm_password) {
      toast.error('Password confirmation does not match');
      return;
    }
    setSaving(true);
    try {
      await changeAdminPassword(form);
      toast.success('Password changed');
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur">
      <form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Change Password</h2>
            <p className="mt-1 text-sm text-slate-500">Your password is verified and stored only as a secure hash.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 hover:text-white" aria-label="Close change password">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">
          <PasswordField label="Current password" value={form.current_password} onChange={(value) => update('current_password', value)} />
          <PasswordField label="New password" value={form.new_password} onChange={(value) => update('new_password', value)} />
          <PasswordField label="Confirm new password" value={form.confirm_password} onChange={(value) => update('confirm_password', value)} />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-500">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Password'}
          </button>
        </div>
      </form>
    </div>
  );
};

const PasswordField = ({ label, value, onChange }) => (
  <label className="block text-sm text-slate-300">
    {label}
    <input
      type="password"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="new-password"
      className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500"
    />
  </label>
);

export default AdminLayout;
