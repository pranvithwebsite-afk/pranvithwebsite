import React, { useEffect, useState } from 'react';
import { fetchAdminDashboardStats } from '../../lib/api';

const metrics = [
  { key: 'totalRevenue', label: 'Total Revenue', prefix: '₹' },
  { key: 'totalOrders', label: 'Total Orders' },
  { key: 'totalProducts', label: 'Total Products' },
  { key: 'totalCustomers', label: 'Total Customers' },
];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminDashboardStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-violet-400">Dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">CMS Overview</h1>
            <p className="mt-2 text-slate-400">
              WordPress-style admin foundation with protected admin routes, role-aware structure, and CMS collections.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-slate-300">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Current role</p>
            <p className="mt-2 text-lg font-medium text-white">Super Admin</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const value = stats?.[metric.key] ?? '-';
          return (
            <div key={metric.key} className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-sm shadow-slate-950/10">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{metric.label}</p>
              <p className="mt-4 text-3xl font-semibold text-white">
                {metric.prefix || ''}
                {loading ? '…' : value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
          <h2 className="text-lg font-semibold text-white">CMS vision</h2>
          <p className="mt-3 text-slate-400">
            This admin panel is built to manage pages, products, orders, customers, media assets and site settings from one central interface.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
          <h2 className="text-lg font-semibold text-white">Scalable modules</h2>
          <p className="mt-3 text-slate-400">
            The structure is ready to expand into courses, blog posts, coupons, testimonials, integrations, and more.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
          <h2 className="text-lg font-semibold text-white">Built on MongoDB</h2>
          <p className="mt-3 text-slate-400">
            Admin access is secured with token authentication and MongoDB collections for CMS entities.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
