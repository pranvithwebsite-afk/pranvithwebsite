import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import PublicPageLoaderProvider from './components/PublicPageLoader';
import Home from './pages/Home';
import Courses from './pages/Courses';
import About from './pages/About';
import Assets from './pages/Assets';
import Hire from './pages/Hire';
import Works from './pages/Works';
import Privacy from './pages/Privacy';
import ServicePage from './pages/ServicePage';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import AssetLanding from './pages/AssetLanding';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import { Toaster } from './components/ui/sonner';
import { AdminAuthProvider } from './admin/AdminAuthContext';
import AdminRoute from './admin/AdminRoute';
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/pages/Login';
import AdminDashboard from './admin/pages/Dashboard';
import Website from './admin/pages/Website';
import Products from './admin/pages/Products';
import AdminServices from './admin/pages/Services';
import Orders from './admin/pages/Orders';
import Customers from './admin/pages/Customers';
import Enquiries from './admin/pages/Enquiries';
import Media from './admin/pages/Media';
import Settings from './admin/pages/Settings';
import AdminUsers from './admin/pages/AdminUsers';

function App() {
  return (
    <div className="App bg-[#070314] min-h-screen text-white">
      <BrowserRouter>
        <AdminAuthProvider>
          <PublicPageLoaderProvider>
            <ScrollToTop />
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
          </PublicPageLoaderProvider>
        </AdminAuthProvider>
      </BrowserRouter>
      <Toaster theme="dark" />
    </div>
  );
}

export default App;
