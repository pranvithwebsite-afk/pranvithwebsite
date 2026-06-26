import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  const [showLoader, setShowLoader] = useState(() => !isAdminPath(window.location.pathname));
  const [loaderLeaving, setLoaderLeaving] = useState(false);

  const setPageLoading = useCallback((id, loading) => {
    return undefined;
  }, []);

  useEffect(() => {
    if (isAdminPath(window.location.pathname)) {
      setShowLoader(false);
      return undefined;
    }

    const leaveTimer = window.setTimeout(() => setLoaderLeaving(true), 220);
    const hideTimer = window.setTimeout(() => setShowLoader(false), 420);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  const contextValue = useMemo(() => ({ setPageLoading }), [setPageLoading]);

  return (
    <PublicPageLoaderContext.Provider value={contextValue}>
      {children}
      {showLoader && <LoadingScreen isLeaving={loaderLeaving} />}
    </PublicPageLoaderContext.Provider>
  );
};

export default PublicPageLoaderProvider;
