import { useEffect, useState } from 'react';
import { fetchPageBySlug } from '../lib/api';

export const usePageData = (slug) => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        const data = await fetchPageBySlug(slug);
        setPage(data);
        setError(null);
      } catch (err) {
        setError(err);
        setPage(null);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [slug]);

  return { page, loading, error };
};
