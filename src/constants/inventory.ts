/** Canonical inventory request statuses used in all dropdowns and filters. */
export const INVENTORY_REQUEST_STATUSES = [
  'DRAFT',
  'PENDING_PM',
  'VENDOR_IDENTIFIED',
  'PAYMENT_PENDING',
  'IN_SHIPPING',
  'FULFILLED',
  'REJECTED',
] as const;

export type InventoryRequestStatus = (typeof INVENTORY_REQUEST_STATUSES)[number];
