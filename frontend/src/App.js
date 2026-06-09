import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Courses from './pages/Courses';
import About from './pages/About';
import Assets from './pages/Assets';
import Hire from './pages/Hire';
import Works from './pages/Works';
import LUTPack5 from './pages/LUTPack5';
import ThankYouLUTPack5 from './pages/ThankYouLUTPack5';
import { Toaster } from './components/ui/sonner';
import { AdminAuthProvider } from './admin/AdminAuthContext';
import AdminRoute from './admin/AdminRoute';
import AdminLayout from './admin/AdminLayout';
import Login from './admin/pages/Login';
import Dashboard from './admin/pages/Dashboard';
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
          <Routes>
            <Route path="/admin/login" element={<Login />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="website" element={<Website />} />
                <Route path="products" element={<Products />} />
                <Route path="orders" element={<Orders />} />
                <Route path="customers" element={<Customers />} />
                <Route path="media" element={<Media />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/about" element={<About />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/assets/lut-pack-5" element={<LUTPack5 />} />
            <Route path="/thank-you/lut-pack-5" element={<ThankYouLUTPack5 />} />
            <Route path="/works" element={<Works />} />
            <Route path="/hire" element={<Hire />} />
          </Routes>
        </AdminAuthProvider>
      </BrowserRouter>
      <Toaster theme="dark" />
    </div>
  );
}

export default App;
