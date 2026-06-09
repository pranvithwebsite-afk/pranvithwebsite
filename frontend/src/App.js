import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Courses from './pages/Courses';
import About from './pages/About';
import Assets from './pages/Assets';
import Hire from './pages/Hire';
import Works from './pages/Works';
import AssetLanding from './pages/AssetLanding';
import ThankYou from './pages/ThankYou';
import CustomerLogin from './pages/Login';
import CustomerRegister from './pages/Register';
import CustomerDashboard from './pages/Dashboard';
import { Toaster } from './components/ui/sonner';
import { AdminAuthProvider } from './admin/AdminAuthContext';
import { CustomerAuthProvider } from './auth/CustomerAuthContext';
import AdminRoute from './admin/AdminRoute';
import CustomerProtectedRoute from './auth/CustomerProtectedRoute';
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/pages/Login';
import AdminDashboard from './admin/pages/Dashboard';
import Website from './admin/pages/Website';
import Products from './admin/pages/Products';
import Orders from './admin/pages/Orders';
import Customers from './admin/pages/Customers';
import Media from './admin/pages/Media';
import Settings from './admin/pages/Settings';

function App() {
  return (
    <div className="App bg-[#070314] min-h-screen text-white">
      <BrowserRouter>
        <AdminAuthProvider>
          <CustomerAuthProvider>
            <Routes>
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="website" element={<Website />} />
                  <Route path="products" element={<Products />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="media" element={<Media />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>

              {/* Public site */}
              <Route path="/" element={<Home />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/about" element={<About />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/assets/:slug" element={<AssetLanding />} />
              <Route path="/thank-you/:slug" element={<ThankYou />} />
              <Route path="/works" element={<Works />} />
              <Route path="/hire" element={<Hire />} />

              {/* Customer auth */}
              <Route path="/login" element={<CustomerLogin />} />
              <Route path="/register" element={<CustomerRegister />} />

              {/* Protected customer dashboard */}
              <Route element={<CustomerProtectedRoute />}>
                <Route path="/dashboard" element={<CustomerDashboard />} />
              </Route>
            </Routes>
          </CustomerAuthProvider>
        </AdminAuthProvider>
      </BrowserRouter>
      <Toaster theme="dark" />
    </div>
  );
}

export default App;
