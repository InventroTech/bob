import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  billingService,
  type BillingReport,
  type BillingReportParams,
} from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

function billingReportKey(params: BillingReportParams) {
  return queryKeys.billing.report({
    month: params.month,
    ...(params.cycleDays != null ? { cycleDays: params.cycleDays } : {}),
  });
}

/**
 * Auto-fetch membership billing for a month.
 * Role rates are intentionally omitted from the query key so editing rates
 * does not refetch until the caller refreshes via mutation/refetch.
 */
export function useBillingReport(
  month: string,
  roleRates: Record<string, string> = {},
  enabled = true,
) {
  const roleRatesRef = useRef(roleRates);
  roleRatesRef.current = roleRates;

  return useQuery({
    queryKey: billingReportKey({ month }),
    queryFn: (): Promise<BillingReport> =>
      billingService.getMembershipBilling({
        month,
        roleRates: roleRatesRef.current,
      }),
    enabled: enabled && Boolean(month),
  });
}

/**
 * Explicit billing fetch (e.g. Refresh with current role rates).
 * Writes into the same cache key as {@link useBillingReport}.
 */
export function useBillingReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: BillingReportParams): Promise<BillingReport> =>
      billingService.getMembershipBilling(params),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(billingReportKey(variables), data);
    },
  });
}
