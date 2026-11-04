import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AdminAuthProvider } from './AdminAuthContext';
import AdminRoute from './AdminRoute';
import AdminLayout from './AdminLayout';

const AdminLogin = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/Dashboard'));
const Website = lazy(() => import('./pages/Website'));
const Reels = lazy(() => import('./pages/Reels'));
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
const SocialMediaManager = lazy(() => import('./pages/SocialMediaManager'));

const RouteFallback = () => (
  <main className="min-h-screen bg-[var(--bg-main)] text-white">
    <div className="mx-auto max-w-7xl px-6 pt-28">
      <div className="h-10 w-52 animate-pulse rounded-full bg-white/8" />
      <div className="mt-8 h-72 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
    </div>
  </main>
);

const AdminApp = () => {
  useEffect(() => {
    // Dynamically set Admin Web App Manifest and Apple Home Screen meta tags
    const manifestEl = document.querySelector('link[rel="manifest"]');
    const prevManifest = manifestEl ? manifestEl.getAttribute('href') : '/manifest.json';
    if (manifestEl) {
      manifestEl.setAttribute('href', '/admin-manifest.json');
    }

    const appleIconEl = document.querySelector('link[rel="apple-touch-icon"]');
    const prevAppleIcon = appleIconEl ? appleIconEl.getAttribute('href') : '/apple-touch-icon.png';
    if (appleIconEl) {
      appleIconEl.setAttribute('href', '/admin-apple-touch-icon.png');
    }

    const appleTitleEl = document.getElementById('apple-app-title');
    const prevAppleTitle = appleTitleEl ? appleTitleEl.getAttribute('content') : 'PranvithDOP';
    if (appleTitleEl) {
      appleTitleEl.setAttribute('content', 'Pranvith DOP Admin');
    }

    const themeEl = document.querySelector('meta[name="theme-color"]');
    const prevTheme = themeEl ? themeEl.getAttribute('content') : '#05070b';
    if (themeEl) {
      themeEl.setAttribute('content', '#020617');
    }

    const prevTitle = document.title;
    if (!prevTitle || prevTitle.includes('PranvithDOP — Video Editing')) {
      document.title = 'Pranvith DOP Admin';
    }

    document.body.classList.add('admin-pwa-mode');

    return () => {
      document.body.classList.remove('admin-pwa-mode');
      if (manifestEl && prevManifest) manifestEl.setAttribute('href', prevManifest);
      if (appleIconEl && prevAppleIcon) appleIconEl.setAttribute('href', prevAppleIcon);
      if (appleTitleEl && prevAppleTitle) appleTitleEl.setAttribute('content', prevAppleTitle);
      if (themeEl && prevTheme) themeEl.setAttribute('content', prevTheme);
      if (prevTitle) document.title = prevTitle;
    };
  }, []);

  return (
    <AdminAuthProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="website" element={<Website />} />
              <Route path="reels" element={<Reels />} />
              <Route path="social-media" element={<SocialMediaManager />} />
              <Route path="social-automation" element={<SocialMediaManager />} />
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
};

export default AdminApp;
