import React, { useEffect, useState } from 'react';
import { Edit3, KeyRound, Plus, RefreshCw, ShieldCheck, Trash2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { createAdminUser, deleteAdminUser, fetchAdminUsers, formatApiErrorDetail, resetAdminUserPassword, updateAdminUser } from '../../lib/api';
import { useAdminAuth } from '../AdminAuthContext';

const fieldClass = 'w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-500';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

const emptyForm = {
  id: '',
  name: '',
  email: '',
  role: 'admin',
  is_active: true,
  password: '',
  confirm_password: '',
};

const AdminUsers = () => {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [resetUser, setResetUser] = useState(null);
  const [resetForm, setResetForm] = useState({ password: '', confirm_password: '' });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      const message = err?.response?.status === 403
        ? 'Only super admins can manage admin users.'
        : (formatApiErrorDetail(err?.response?.data?.detail) || err?.message || 'Unable to load admin users');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAdd = () => {
    setFormMode('add');
    setForm(emptyForm);
  };

  const openEdit = (user) => {
    setFormMode('edit');
    setForm({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'admin',
      is_active: user.is_active !== false,
      password: '',
      confirm_password: '',
    });
  };

  const closeForm = () => {
    setFormMode('');
    setForm(emptyForm);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (formMode === 'add' && form.password.length < 8) {
      toast.error('Temporary password must be at least 8 characters');
      return;
    }
    if (formMode === 'add' && form.password !== form.confirm_password) {
      toast.error('Password confirmation does not match');
      return;
    }
    setSaving(true);
    try {
      if (formMode === 'add') {
        await createAdminUser({
          name: form.name,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
          password: form.password,
          confirm_password: form.confirm_password,
        });
        toast.success('Admin added');
      } else {
        await updateAdminUser(form.id, {
          name: form.name,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        });
        toast.success('Admin updated');
      }
      closeForm();
      loadUsers();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || err?.message || 'Unable to save admin');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await updateAdminUser(user.id, {
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active === false,
      });
      toast.success(user.is_active === false ? 'Admin activated' : 'Admin disabled');
      loadUsers();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || err?.message || 'Unable to update status');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to permanently delete admin account "${user.name || user.email}"?`)) {
      return;
    }
    try {
      await deleteAdminUser(user.id);
      toast.success('Admin user deleted');
      loadUsers();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || err?.message || 'Unable to delete admin user');
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    if (!resetUser) return;
    if (resetForm.password.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (resetForm.password !== resetForm.confirm_password) {
      toast.error('Password confirmation does not match');
      return;
    }
    setSaving(true);
    try {
      await resetAdminUserPassword(resetUser.id, resetForm);
      toast.success('Password reset');
      setResetUser(null);
      setResetForm({ password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Unable to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/95 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
            <ShieldCheck size={14} /> Super Admin
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">Admin Users</h1>
          <p className="mt-2 text-sm text-slate-400">Manage admin access without exposing passwords or hashes.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadUsers} className={`${buttonClass} border border-slate-700 text-slate-200 hover:border-violet-500`}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" onClick={openAdd} className={`${buttonClass} bg-violet-600 text-white hover:bg-violet-500`}>
            <Plus size={16} /> Add Admin
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-72 animate-pulse rounded-3xl border border-slate-800 bg-slate-950" />
      ) : error ? (
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-100">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900 text-slate-300">
                <tr>
                  <th className="px-5 py-4">Admin</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4">Last Login</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800 last:border-b-0">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{user.name || 'Admin'}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{user.role}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.is_active === false ? 'bg-rose-500/10 text-rose-200' : 'bg-emerald-500/10 text-emerald-200'}`}>
                        {user.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{formatDate(user.created_at)}</td>
                    <td className="px-5 py-4 text-slate-400">{formatDate(user.last_login)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openEdit(user)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-white hover:border-violet-500">
                          <Edit3 size={14} className="inline" /> Edit
                        </button>
                        <button type="button" onClick={() => setResetUser(user)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-white hover:border-violet-500">
                          <KeyRound size={14} className="inline" /> Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          disabled={user.id === admin?.id}
                          className="rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-100 hover:border-amber-400 disabled:opacity-40"
                        >
                          <UserX size={14} className="inline" /> {user.is_active === false ? 'Activate' : 'Disable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.id === admin?.id}
                          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-rose-100 disabled:opacity-40"
                          title="Delete admin user permanently"
                        >
                          <Trash2 size={14} className="inline" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formMode && (
        <Modal title={formMode === 'add' ? 'Add Admin' : 'Edit Admin'} onClose={closeForm}>
          <form onSubmit={submitForm} className="space-y-4">
            <Input label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Input label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
            <label className="block text-sm text-slate-300">
              Role
              <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className={`${fieldClass} mt-2`}>
                <option value="admin">admin</option>
                <option value="super_admin">super_admin</option>
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} className="h-5 w-5 accent-violet-600" />
              Active account
            </label>
            {formMode === 'add' && (
              <>
                <Input label="Temporary password" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
                <Input label="Confirm temporary password" type="password" value={form.confirm_password} onChange={(value) => setForm((current) => ({ ...current, confirm_password: value }))} />
              </>
            )}
            <FormActions saving={saving} onCancel={closeForm} saveLabel={formMode === 'add' ? 'Add Admin' : 'Save Changes'} />
          </form>
        </Modal>
      )}

      {resetUser && (
        <Modal title={`Reset Password: ${resetUser.name || resetUser.email}`} onClose={() => setResetUser(null)}>
          <form onSubmit={submitReset} className="space-y-4">
            <Input label="New temporary password" type="password" value={resetForm.password} onChange={(value) => setResetForm((current) => ({ ...current, password: value }))} />
            <Input label="Confirm new password" type="password" value={resetForm.confirm_password} onChange={(value) => setResetForm((current) => ({ ...current, confirm_password: value }))} />
            <p className="text-xs text-slate-500">The old password is never shown. Only the new hash is stored.</p>
            <FormActions saving={saving} onCancel={() => setResetUser(null)} saveLabel="Reset Password" />
          </form>
        </Modal>
      )}
    </section>
  );
};

const Input = ({ label, value, onChange, type = 'text' }) => (
  <label className="block text-sm text-slate-300">
    {label}
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} mt-2`} />
  </label>
);

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur">
    <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:text-white">Close</button>
      </div>
      {children}
    </div>
  </div>
);

const FormActions = ({ saving, onCancel, saveLabel }) => (
  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
    <button type="button" onClick={onCancel} className={`${buttonClass} border border-slate-700 text-slate-200 hover:border-slate-500`}>
      Cancel
    </button>
    <button type="submit" disabled={saving} className={`${buttonClass} bg-violet-600 text-white hover:bg-violet-500`}>
      {saving ? 'Saving...' : saveLabel}
    </button>
  </div>
);

const formatDate = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

export default AdminUsers;
