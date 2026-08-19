import type { FormModalFieldConfig } from '@/components/page-builder/inventory-form-edit-modal/types';

/**
 * Field order/layout for Unmannd All Requests item modal (matches design mock).
 * Image+Item → Status/Qty/Cost → Price/Negotiated/Vendor →
 * Date/Priority/Dept/Shipment Type → Specs+Link → Project → Comments
 */
export const DEFAULT_UNMANND_FORM_MODAL_FIELDS: FormModalFieldConfig[] = [
  { key: 'item_name_freeform', label: 'Item', enabled: false },
  { key: 'status', label: 'Status', enabled: false },
  { key: 'quantity_required', label: 'Quantity', enabled: true },
  { key: 'estimated_cost', label: 'Estimated Cost', enabled: false },
  { key: 'line_total', label: 'Price', enabled: false },
  { key: 'negotiated_value', label: 'Negotiated Value', enabled: true },
  { key: 'vendor', label: 'Vendor', enabled: true },
  { key: 'request_date', label: 'Requested Date', enabled: false },
  { key: 'urgency_level', label: 'Priority', enabled: false },
  { key: 'department', label: 'Department', enabled: false },
  { key: 'category', label: 'Shipment Type', enabled: false },
  { key: 'specifications', label: 'Specifications', enabled: true },
  { key: 'product_link', label: 'Product Link', enabled: true, link: true },
  { key: 'project_purpose', label: 'Project', enabled: false },
  { key: 'comments', label: 'Comments', enabled: true },
];

/** Merge configured fields onto Unmannd defaults (keep mock order + any extras at end). */
export function mergeUnmanndFormModalFields(
  configured?: FormModalFieldConfig[] | null
): FormModalFieldConfig[] {
  if (!configured?.length) return [...DEFAULT_UNMANND_FORM_MODAL_FIELDS];
  const byKey = new Map(configured.map((f) => [f.key, f]));
  const merged = DEFAULT_UNMANND_FORM_MODAL_FIELDS.map((def) => {
    const override = byKey.get(def.key);
    if (!override) return def;
    byKey.delete(def.key);
    // Keep mock labels (Item, Shipment Type, Product Link, …); preserve enabled/link from config.
    return { ...def, ...override, label: def.label };
  });
  for (const extra of byKey.values()) {
    if (extra.key === 'cart_id') continue;
    merged.push(extra);
  }
  return merged;
}
