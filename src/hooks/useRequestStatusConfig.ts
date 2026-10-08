import { useEffect, useSyncExternalStore } from 'react';
import {
  getRequestStatusConfig,
  getRequestStatusConfigVersion,
  loadRequestStatusConfig,
  REQUEST_STATUS_ENTITY_TYPES,
  subscribeRequestStatusConfig,
  type RequestStatusConfig,
} from '@/lib/inventory/requestStatus';

/**
 * Status options + pages for a procurement / inventory entity type.
 * Returns the built-in defaults until the backend config loads (or if it fails).
 */
export function useRequestStatusConfig(entityType?: string | null): RequestStatusConfig {
  useSyncExternalStore(subscribeRequestStatusConfig, getRequestStatusConfigVersion);

  useEffect(() => {
    if (entityType && REQUEST_STATUS_ENTITY_TYPES.has(entityType)) {
      void loadRequestStatusConfig(entityType);
    }
  }, [entityType]);

  return getRequestStatusConfig(entityType);
}
