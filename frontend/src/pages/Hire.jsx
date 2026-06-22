import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { submitHireRequest } from '../lib/api';
import CmsPageRenderer from '../components/cms/CmsPageRenderer';
import { useCmsPage } from '../hooks/useCmsPage';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  project_type: '',
  budget: '',
  project_date: '',
  location: '',
  message: '',
};

const projectTypes = ['Commercial Ad', 'Wedding Cinematography', 'Drone Shoot', 'Product Shoot', 'Film / Music Video', 'Editing / DI', 'Other'];

const HireForm = () => {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please enter your name, email, and project message');
      return;
    }
    try {
      setBusy(true);
      const res = await submitHireRequest(form);
      toast.success(res?.message || 'Request sent!');
      setForm(initialForm);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="px-6 py-16">
      <form onSubmit={submit} className="mx-auto max-w-4xl rounded-2xl border border-violet-500/20 bg-[#0b061b]/95 p-6 shadow-2xl shadow-violet-950/30 md:p-8">
        <h2 className="text-2xl font-semibold text-white">Start a project enquiry</h2>
        <p className="mt-2 text-sm text-white/55">A few details are enough. We will follow up with the right next step.</p>
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(value) => updateField('name', value)} placeholder="Your name" />
          <Input label="Email" type="email" value={form.email} onChange={(value) => updateField('email', value)} placeholder="you@example.com" />
          <Input label="Phone" value={form.phone} onChange={(value) => updateField('phone', value)} placeholder="+91 ..." />
          <label className="block">
            <span className="mb-1.5 block text-xs text-white/65">Project type</span>
            <select value={form.project_type} onChange={(event) => updateField('project_type', event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#120824] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400">
              <option value="">Select type</option>
              {projectTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <Input label="Budget" value={form.budget} onChange={(value) => updateField('budget', value)} placeholder="Approx budget" />
          <Input label="Shoot / project date" type="date" value={form.project_date} onChange={(value) => updateField('project_date', value)} />
          <Input label="Location" value={form.location} onChange={(value) => updateField('location', value)} placeholder="City, venue, or destination" className="sm:col-span-2" />
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs text-white/65">Message</span>
            <textarea value={form.message} onChange={(event) => updateField('message', event.target.value)} rows={5} className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400" placeholder="Tell us the story, format, deliverables, references, and timeline..." />
          </label>
        </div>
        <button type="submit" disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60">
          {busy ? 'Sending...' : 'Send Project Enquiry'} <Send size={15} />
        </button>
      </form>
    </section>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder = '', className = '' }) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-xs text-white/65">{label}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400" placeholder={placeholder} />
  </label>
);

const Hire = () => {
  const { page, loading } = useCmsPage('hire');
  const showForm = page?.settings?.show_enquiry_form !== false;
  return (
    <main className="page min-h-screen bg-[#070314] text-white">
      <Header />
      {loading ? (
        <div className="px-6 py-24 text-center text-white/55">Loading...</div>
      ) : page?.sections?.length ? (
        <CmsPageRenderer page={page} sectionChildren={showForm ? { contact_form: <HireForm /> } : {}} />
      ) : (
        showForm && <HireForm />
      )}
      <Footer />
    </main>
  );
};

export default Hire;
