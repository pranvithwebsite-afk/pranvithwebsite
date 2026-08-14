import { useQuery } from '@tanstack/react-query';
import { fetchCmsPage } from '../lib/api';

const getCachedPage = (pageKey) => {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(`cms_page_${pageKey}`);
    return raw ? JSON.parse(raw) : undefined;
  } catch (e) {
    return undefined;
  }
};

const setCachedPage = (pageKey, data) => {
  if (typeof window === 'undefined' || !data) return;
  try {
    sessionStorage.setItem(`cms_page_${pageKey}`, JSON.stringify(data));
  } catch (e) {}
};

export const useCmsPage = (pageKey) => {
  const query = useQuery({
    queryKey: ['cms-page', pageKey],
    queryFn: async ({ signal }) => {
      const data = await fetchCmsPage(pageKey, { signal });
      if (data) setCachedPage(pageKey, data);
      return data;
    },
    initialData: () => getCachedPage(pageKey),
    placeholderData: (previous) => previous,
    staleTime: 1000 * 60 * 5,
  });
  return {
    page: query.data || null,
    loading: query.isLoading && !query.data,
    error: query.error || null,
    refetch: query.refetch,
  };
};
