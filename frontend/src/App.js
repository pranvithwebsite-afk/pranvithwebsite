import React, { Suspense, lazy, useEffect, useRef } from 'react';
import './App.css';
import { BrowserRouter, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import PublicPageLoaderProvider from './components/PublicPageLoader';
import { Toaster } from 'sonner';
import PublicApp from './PublicApp';
import { initializeMetaPixel, trackPageView } from './utils/metaPixel';

const AdminApp = lazy(() => import('./admin/AdminApp'));

const RouteFallback = () => (
  <main className="min-h-screen bg-[var(--bg-main)] text-white">
    <div className="mx-auto max-w-7xl px-6 pt-28">
      <div className="h-10 w-52 animate-pulse rounded-full bg-white/8" />
      <div className="mt-8 h-72 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
    </div>
  </main>
);

const AppRouter = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <Suspense fallback={<RouteFallback />}>
      {isAdminRoute ? <AdminApp /> : <PublicApp />}
    </Suspense>
  );
};

const MetaPixelTracker = () => {
  const location = useLocation();
  const trackedLocationKeys = useRef(new Set());

  useEffect(() => {
    initializeMetaPixel();
    if (trackedLocationKeys.current.has(location.key)) return;
    trackedLocationKeys.current.add(location.key);
    trackPageView();
  }, [location.key]);

  return null;
};

function App() {
  return (
    <div className="App min-h-screen text-white">
      <BrowserRouter>
        <PublicPageLoaderProvider>
          <ScrollToTop />
          <MetaPixelTracker />
          <AppRouter />
        </PublicPageLoaderProvider>
      </BrowserRouter>
      <Toaster theme="dark" />
    </div>
  );
}

export default App;
