import { useQuery } from '@tanstack/react-query';
import { membershipService } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';

export function useMembershipRoles(enabled = true) {
  return useQuery({
    queryKey: queryKeys.membership.roles,
    queryFn: () => membershipService.getRoles(),
    enabled,
  });
}

export function useMembershipUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.membership.users,
    queryFn: () => membershipService.getUsers(),
    enabled,
  });
}

export function useMembershipHierarchy(enabled = true) {
  return useQuery({
    queryKey: queryKeys.membership.hierarchy,
    queryFn: () => membershipService.getUsersForHierarchy(),
    enabled,
  });
}
