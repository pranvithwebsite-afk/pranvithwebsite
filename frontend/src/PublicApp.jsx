import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
const CameraAIWidget = lazy(() => import('./components/camera-ai/CameraAIWidget'));

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
const NotFound = lazy(() => import('./pages/NotFound'));

const RouteFallback = () => (
  <main className="site-gradient-bg min-h-screen text-white">
    <div className="mx-auto max-w-7xl px-6 pt-28">
      <div className="h-10 w-52 animate-pulse rounded-full bg-white/8" />
      <div className="mt-8 h-72 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
    </div>
  </main>
);

const PublicApp = () => (
  <div className="public-site min-h-screen">
    <Suspense fallback={<RouteFallback />}>
      <Routes>
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
      <Route path="/contact" element={<Hire />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/privacy-policy" element={<Privacy />} />
      <Route path="/terms" element={<Privacy />} />
      <Route path="/commercial-video-production" element={<ServicePage type="commercial" />} />
      <Route path="/wedding-cinematography" element={<ServicePage type="wedding" />} />
      <Route path="/drone-cinematography" element={<ServicePage type="drone" />} />
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    <Suspense fallback={null}><CameraAIWidget /></Suspense>
  </div>
);

export default PublicApp;
