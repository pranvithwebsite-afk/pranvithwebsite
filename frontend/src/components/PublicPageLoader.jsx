import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

const PublicPageLoaderContext = createContext({
  setPageLoading: () => {},
});

const isAdminPath = (pathname = '') => pathname.startsWith('/admin');

export const usePublicPageLoading = (loading) => {
  const { setPageLoading } = useContext(PublicPageLoaderContext);
  const [id] = useState(() => Math.random().toString(36).slice(2));

  useEffect(() => {
    setPageLoading(id, loading);
    return () => setPageLoading(id, false);
  }, [id, loading, setPageLoading]);
};

const PublicPageLoaderProvider = ({ children }) => {
  const location = useLocation();
  const adminRoute = isAdminPath(location.pathname);
  const [pageLoading, setPageLoadingState] = useState({});
  const [routeArmed, setRouteArmed] = useState(false);
  const [showLoader, setShowLoader] = useState(() => !isAdminPath(window.location.pathname));
  const [loaderLeaving, setLoaderLeaving] = useState(false);

  const setPageLoading = useCallback((id, loading) => {
    setPageLoadingState((current) => {
      if (!loading) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: true };
    });
  }, []);

  useEffect(() => {
    if (adminRoute) {
      setShowLoader(false);
      setLoaderLeaving(false);
      setRouteArmed(true);
      setPageLoadingState({});
      return undefined;
    }

    setShowLoader(true);
    setLoaderLeaving(false);
    setRouteArmed(false);

    const armTimer = window.setTimeout(() => setRouteArmed(true), 0);
    const fallbackTimer = window.setTimeout(() => {
      setPageLoadingState({});
    }, 4500);

    return () => {
      window.clearTimeout(armTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [adminRoute, location.key, location.pathname]);

  useEffect(() => {
    if (adminRoute || !showLoader || !routeArmed || Object.keys(pageLoading).length > 0) return undefined;

    setLoaderLeaving(true);
    const exitTimer = window.setTimeout(() => setShowLoader(false), 180);
    return () => window.clearTimeout(exitTimer);
  }, [adminRoute, pageLoading, routeArmed, showLoader]);

  const contextValue = useMemo(() => ({ setPageLoading }), [setPageLoading]);

  return (
    <PublicPageLoaderContext.Provider value={contextValue}>
      {children}
      {!adminRoute && showLoader && <LoadingScreen isLeaving={loaderLeaving} />}
    </PublicPageLoaderContext.Provider>
  );
};

export default PublicPageLoaderProvider;
