import { useQuery } from '@tanstack/react-query';
import { getRecipes } from '@/services/graphql';

export function useRecipes(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['recipes', limit, offset],
    queryFn: () => getRecipes({ limit, offset }),
  });
}
