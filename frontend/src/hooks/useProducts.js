import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../lib/api';

const getCachedProducts = () => {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem('pranvith_products_cache');
    return raw ? JSON.parse(raw) : undefined;
  } catch (e) {
    return undefined;
  }
};

const setCachedProducts = (data) => {
  if (typeof window === 'undefined' || !data) return;
  try {
    sessionStorage.setItem('pranvith_products_cache', JSON.stringify(data));
  } catch (e) {}
};

export const useProducts = () => {
  const query = useQuery({
    queryKey: ['products'],
    queryFn: async ({ signal }) => {
      const data = await fetchProducts({ signal });
      if (data && Array.isArray(data) && data.length > 0) {
        setCachedProducts(data);
      }
      return data;
    },
    initialData: () => getCachedProducts(),
    placeholderData: (previous) => previous,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const products = Array.isArray(query.data) ? query.data : [];
  const isLoading = query.isLoading && products.length === 0;

  return {
    products,
    loading: isLoading,
    error: query.error || null,
    refetch: query.refetch,
  };
};
