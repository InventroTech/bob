import { useQuery } from '@tanstack/react-query';
import { entityTypesApi } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

export function useEntityTypes(enabled = true) {
  return useQuery({
    queryKey: queryKeys.entityTypes.all,
    queryFn: () => entityTypesApi.listEntityTypes(),
    enabled,
  });
}
