import React, { Suspense, lazy } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import PublicPageLoaderProvider from './components/PublicPageLoader';
import { Toaster } from 'sonner';
import { AdminAuthProvider } from './admin/AdminAuthContext';
import AdminRoute from './admin/AdminRoute';
import AdminLayout from './admin/AdminLayout';

const Home = lazy(() => import('./pages/Home'));
const Courses = lazy(() => import('./pages/Courses'));
const About = lazy(() => import('./pages/About'));
const Assets = lazy(() => import('./pages/Assets'));
const AssetLanding = lazy(() => import('./pages/AssetLanding'));
const Hire = lazy(() => import('./pages/Hire'));
const Works = lazy(() => import('./pages/Works'));
const Privacy = lazy(() => import('./pages/Privacy'));
const ServicePage = lazy(() => import('./pages/ServicePage'));
const Services = lazy(() => import('./pages/Services'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentFailed = lazy(() => import('./pages/PaymentFailed'));

const AdminLogin = lazy(() => import('./admin/pages/Login'));
const AdminDashboard = lazy(() => import('./admin/pages/Dashboard'));
const Website = lazy(() => import('./admin/pages/Website'));
const Products = lazy(() => import('./admin/pages/Products'));
const AdminServices = lazy(() => import('./admin/pages/Services'));
const Orders = lazy(() => import('./admin/pages/Orders'));
const Customers = lazy(() => import('./admin/pages/Customers'));
const Enquiries = lazy(() => import('./admin/pages/Enquiries'));
const Media = lazy(() => import('./admin/pages/Media'));
const Settings = lazy(() => import('./admin/pages/Settings'));
const AdminUsers = lazy(() => import('./admin/pages/AdminUsers'));

const RouteFallback = () => (
  <main className="min-h-screen bg-[var(--bg-main)] text-white">
    <div className="mx-auto max-w-7xl px-6 pt-28">
      <div className="h-10 w-52 animate-pulse rounded-full bg-white/8" />
      <div className="mt-8 h-72 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
    </div>
  </main>
);

function App() {
  return (
    <div className="App bg-[var(--bg-main)] min-h-screen text-white">
      <BrowserRouter>
        <AdminAuthProvider>
          <PublicPageLoaderProvider>
            <ScrollToTop />
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
                    <Route path="orders" element={<Orders />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="enquiries" element={<Enquiries />} />
                    <Route path="media" element={<Media />} />
                    <Route path="admin-users" element={<AdminUsers />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Route>

                {/* Public site */}
                <Route path="/" element={<Home />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/about" element={<About />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/assets/:slug" element={<AssetLanding />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/:slug" element={<ServiceDetail />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-failed" element={<PaymentFailed />} />
                <Route path="/works" element={<Works />} />
                <Route path="/hire" element={<Hire />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/privacy-policy" element={<Privacy />} />
                <Route path="/terms" element={<Privacy />} />
                <Route path="/commercial-video-production" element={<ServicePage type="commercial" />} />
                <Route path="/wedding-cinematography" element={<ServicePage type="wedding" />} />
                <Route path="/drone-cinematography" element={<ServicePage type="drone" />} />
              </Routes>
            </Suspense>
          </PublicPageLoaderProvider>
        </AdminAuthProvider>
      </BrowserRouter>
      <Toaster theme="dark" />
    </div>
  );
}

export default App;
