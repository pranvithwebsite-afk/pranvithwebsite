import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const AdminConfirmContext = createContext(null);

const defaultOptions = {
  title: 'Confirm action',
  message: 'Please confirm this action.',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger',
};

export const AdminConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const [loading, setLoading] = useState(false);

  const close = useCallback(() => {
    if (loading) return;
    setDialog(null);
  }, [loading]);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        ...defaultOptions,
        ...(options || {}),
        resolve,
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (!dialog || loading) return;
    dialog.resolve(false);
    setDialog(null);
  }, [dialog, loading]);

  const handleConfirm = useCallback(async () => {
    if (!dialog || loading) return;
    setLoading(true);
    try {
      const result = typeof dialog.onConfirm === 'function'
        ? await dialog.onConfirm()
        : true;
      if (result !== false) {
        dialog.resolve(true);
        setDialog(null);
      }
    } catch {
      // Caller handles user-facing errors.
    } finally {
      setLoading(false);
    }
  }, [dialog, loading]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <AdminConfirmContext.Provider value={value}>
      {children}
      {dialog && (
        <AdminConfirmModal
          dialog={dialog}
          loading={loading}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
          onClose={close}
        />
      )}
    </AdminConfirmContext.Provider>
  );
};

export const useAdminConfirm = () => {
  const context = useContext(AdminConfirmContext);
  if (!context) {
    throw new Error('useAdminConfirm must be used inside AdminConfirmProvider');
  }
  return context.confirm;
};

const AdminConfirmModal = ({ dialog, loading, onCancel, onConfirm, onClose }) => {
  const danger = dialog.variant !== 'neutral';
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 shadow-2xl shadow-black/60">
        <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.22),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${danger ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-violet-400/30 bg-violet-500/10 text-violet-200'}`}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{dialog.title}</h2>
                {dialog.subtitle ? <p className="mt-2 text-sm text-slate-400">{dialog.subtitle}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:text-white disabled:opacity-50"
              aria-label="Close confirmation"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="space-y-4 p-6">
          {dialog.itemName ? (
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200">Selected</p>
              <p className="mt-2 break-words text-sm font-medium text-white">{dialog.itemName}</p>
            </div>
          ) : null}
          <p className="text-sm leading-7 text-slate-300">{dialog.message}</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:opacity-60"
            >
              {dialog.cancelText || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-violet-600 hover:bg-violet-500'}`}
            >
              {loading ? (dialog.loadingText || 'Deleting...') : (dialog.confirmText || 'Confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

