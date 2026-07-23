import { useQuery } from '@tanstack/react-query';
import { fetchServices } from '../lib/api';

export const useServices = () => {
  const query = useQuery({
    queryKey: ['services'],
    queryFn: ({ signal }) => fetchServices({ signal }),
    placeholderData: (previous) => previous,
  });
  return { services: query.data || [], loading: query.isLoading, error: query.error || null, refetch: query.refetch };
};
