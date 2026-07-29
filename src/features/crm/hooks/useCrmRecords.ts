import { useQuery } from '@tanstack/react-query';
import { crmRecordsApi } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

type ListRecordsParams = Parameters<typeof crmRecordsApi.listRecords>[0];

export function useCrmRecords(params: ListRecordsParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.crmRecords.list(params),
    queryFn: () => crmRecordsApi.listRecords(params),
    enabled: enabled && Boolean(params.entity_type),
  });
}
