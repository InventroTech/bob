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

/** Canonical inventory item statuses for dropdowns and filters. */
export const INVENTORY_ITEM_STATUSES = [
  'IN_STOCK',
  'OUT_OF_STOCK',
  'RESERVED',
  'DISCONTINUED',
  'ON_ORDER',
] as const;

/** Canonical inventory cart statuses for dropdowns and filters. */
export const INVENTORY_CART_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'ORDERED',
] as const;

/** Allowed status options per entity type (for status dropdown in record modals etc.). */
export const ALLOWED_STATUSES: Record<string, readonly string[]> = {
  inventory_item: INVENTORY_ITEM_STATUSES,
  inventory_request: INVENTORY_REQUEST_STATUSES,
  inventory_cart: INVENTORY_CART_STATUSES,
};
