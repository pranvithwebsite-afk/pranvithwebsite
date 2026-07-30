import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminAuthProvider } from './AdminAuthContext';
import AdminRoute from './AdminRoute';
import AdminLayout from './AdminLayout';

const AdminLogin = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/Dashboard'));
const Website = lazy(() => import('./pages/Website'));
const Products = lazy(() => import('./pages/Products'));
const Coupons = lazy(() => import('./pages/Coupons'));
const AdminServices = lazy(() => import('./pages/Services'));
const Orders = lazy(() => import('./pages/Orders'));
const PaymentAttempts = lazy(() => import('./pages/PaymentAttempts'));
const Customers = lazy(() => import('./pages/Customers'));
const Reports = lazy(() => import('./pages/Reports'));
const Enquiries = lazy(() => import('./pages/Enquiries'));
const Media = lazy(() => import('./pages/Media'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));

const RouteFallback = () => (
  <main className="min-h-screen bg-[var(--bg-main)] text-white">
    <div className="mx-auto max-w-7xl px-6 pt-28">
      <div className="h-10 w-52 animate-pulse rounded-full bg-white/8" />
      <div className="mt-8 h-72 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
    </div>
  </main>
);

const AdminApp = () => (
  <AdminAuthProvider>
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="website" element={<Website />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="products" element={<Products />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="orders" element={<Orders />} />
            <Route path="payments/payment-attempts" element={<PaymentAttempts />} />
            <Route path="customers" element={<Customers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="enquiries" element={<Enquiries />} />
            <Route path="media" element={<Media />} />
            <Route path="admin-users" element={<AdminUsers />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  </AdminAuthProvider>
);

export default AdminApp;
