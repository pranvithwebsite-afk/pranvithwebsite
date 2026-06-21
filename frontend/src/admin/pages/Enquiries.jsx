import React, { useEffect, useState } from 'react';
import { CalendarDays, Mail, MapPin, Phone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteAdminEnquiry,
  fetchAdminEnquiries,
  updateAdminEnquiryStatus,
} from '../../lib/api';

const statusOptions = ['new', 'contacted', 'completed'];

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEnquiries = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminEnquiries();
      setEnquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Could not load enquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  const changeStatus = async (id, status) => {
    try {
      const res = await updateAdminEnquiryStatus(id, status);
      setEnquiries((items) => items.map((item) => (item.id === id ? res.enquiry : item)));
      toast.success('Enquiry updated');
    } catch (err) {
      toast.error('Could not update enquiry');
    }
  };

  const removeEnquiry = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try {
      await deleteAdminEnquiry(id);
      setEnquiries((items) => items.filter((item) => item.id !== id));
      toast.success('Enquiry deleted');
    } catch (err) {
      toast.error('Could not delete enquiry');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-violet-300/80">Client enquiries</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Hire Requests</h1>
        <p className="mt-2 text-sm text-white/55">Review project leads from the Hire From Us form.</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-white/60">
          Loading enquiries...
        </div>
      ) : enquiries.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-white/60">
          No enquiries yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {enquiries.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-5 shadow-lg shadow-black/20"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-white">{item.name}</h2>
                    <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium capitalize text-violet-100">
                      {item.project_type || 'Project'}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium capitalize text-white/70">
                      {item.status || 'new'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/60">
                    <span className="inline-flex items-center gap-2"><Mail size={14} />{item.email}</span>
                    {item.phone && <span className="inline-flex items-center gap-2"><Phone size={14} />{item.phone}</span>}
                    {item.location && <span className="inline-flex items-center gap-2"><MapPin size={14} />{item.location}</span>}
                    {item.project_date && <span className="inline-flex items-center gap-2"><CalendarDays size={14} />{item.project_date}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={item.status || 'new'}
                    onChange={(e) => changeStatus(item.id, e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#120824] px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeEnquiry(item.id)}
                    className="rounded-lg border border-red-400/20 bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
                    aria-label="Delete enquiry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="mt-5 whitespace-pre-line rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/75">
                {item.message || item.requirement}
              </p>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/45">
                {item.budget && <span>Budget: {item.budget}</span>}
                {item.created_at && <span>Received: {new Date(item.created_at).toLocaleString()}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Enquiries;
