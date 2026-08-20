import { useQuery } from '@tanstack/react-query';
import { fetchServices } from '../lib/api';

const getCachedServices = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem('pranvith_services_cache');
    return raw ? JSON.parse(raw) : undefined;
  } catch (e) {
    return undefined;
  }
};

const setCachedServices = (data) => {
  if (typeof window === 'undefined' || !data) return;
  try {
    sessionStorage.setItem('pranvith_services_cache', JSON.stringify(data));
  } catch (e) {}
};

export const useServices = () => {
  const query = useQuery({
    queryKey: ['services'],
    queryFn: async ({ signal }) => {
      const data = await fetchServices({ signal });
      if (data && Array.isArray(data) && data.length > 0) {
        setCachedServices(data);
      }
      return data;
    },
    initialData: () => getCachedServices(),
    placeholderData: (previous) => previous,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const services = Array.isArray(query.data) ? query.data : [];
  const isLoading = query.isLoading && services.length === 0;

  return {
    services,
    loading: isLoading,
    error: query.error || null,
    refetch: query.refetch,
  };
};
