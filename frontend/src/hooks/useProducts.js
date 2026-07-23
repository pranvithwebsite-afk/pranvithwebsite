import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../lib/api';

export const useProducts = () => {
  const query = useQuery({
    queryKey: ['products'],
    queryFn: ({ signal }) => fetchProducts({ signal }),
    placeholderData: (previous) => previous,
  });
  return { products: query.data || [], loading: query.isLoading, error: query.error || null, refetch: query.refetch };
};
