import { useQuery } from '@tanstack/react-query';
import { fetchCmsPage } from '../lib/api';

export const useCmsPage = (pageKey) => {
  const query = useQuery({
    queryKey: ['cms-page', pageKey],
    queryFn: ({ signal }) => fetchCmsPage(pageKey, { signal }),
    // Do not show a blank route when reconnecting or retrying.
    placeholderData: (previous) => previous,
  });
  return { page: query.data || null, loading: query.isLoading, error: query.error || null, refetch: query.refetch };
};
