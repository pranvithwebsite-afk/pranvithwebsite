import React, { createContext, useContext, useEffect, useMemo } from 'react';

const PublicPageLoaderContext = createContext({
  setPageLoading: () => {},
});

export const usePublicPageLoading = (loading) => {
  const { setPageLoading } = useContext(PublicPageLoaderContext);

  useEffect(() => {
    setPageLoading(loading);
  }, [loading, setPageLoading]);
};

const PublicPageLoaderProvider = ({ children }) => {
  const contextValue = useMemo(() => ({ setPageLoading: () => {} }), []);

  return (
    <PublicPageLoaderContext.Provider value={contextValue}>
      {children}
    </PublicPageLoaderContext.Provider>
  );
};

export default PublicPageLoaderProvider;
