import React, { useEffect, useState } from 'react';
import { fetchAdminCustomers } from '../../lib/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminCustomers()
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Customers</h1>
        <p className="mt-3 text-slate-400">Customer records from the CMS, ready for future CRM and order history tracking.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(loading ? Array.from({ length: 4 }) : customers).map((customer, index) => (
          <div key={customer?.id ?? index} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <h2 className="text-lg font-semibold text-white">{customer?.name ?? 'New Customer'}</h2>
            <p className="mt-2 text-slate-400">Email: {customer?.email ?? 'name@example.com'}</p>
            <p className="mt-3 text-sm text-slate-400">{customer?.notes ?? 'Customer CRM details will appear once available.'}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Customers;
