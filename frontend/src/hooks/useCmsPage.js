import { useEffect, useState } from 'react';
import { fetchCmsPage } from '../lib/api';

export const useCmsPage = (pageKey) => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchCmsPage(pageKey)
      .then((data) => {
        if (!mounted) return;
        setPage(data);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setPage(null);
        setError(err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [pageKey]);

  return { page, loading, error };
};
