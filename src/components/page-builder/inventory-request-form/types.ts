/** Types for the inventory request form module. */

export type EcommerceSource = {
  id: string;
  label: string;
  vendorName?: string;
  hostIncludes?: readonly string[];
  profile?: 'core' | 'extended' | string;
};

export type PriceQuote = {
  id: string;
  source: string;
  source_label: string;
  link: string;
  price: number | '';
  currency: 'INR' | 'USD';
  title?: string;
  image?: string;
  live?: boolean;
  /** Marketplace delivery / ETA text, e.g. "FREE delivery Fri, 24 Jul". */
  delivery_date?: string;
};

export type LivePriceCompareResult = {
  source?: string;
  title?: string | null;
  price?: number | null;
  currency?: string;
  link?: string;
  image?: string | null;
  available?: boolean;
  error?: string | null;
  delivery_date?: string | null;
};

export type LivePriceCompareResponse = {
  results?: LivePriceCompareResult[];
  cheapest?: LivePriceCompareResult | null;
  errors?: string[];
  amazon_paapi_configured?: boolean;
  vendors?: EcommerceSource[];
  profile?: string | null;
  error?: string;
};

export type PriceCompareVendorsResponse = {
  defaults?: { profile?: string };
  vendors?: Array<{
    id?: string;
    label?: string;
    vendor_name?: string;
    hosts?: string[];
    profile?: string;
  }>;
};

export type RequestCategory = 'Domestic' | 'International' | '';

export interface InventoryRequestFormConfig {
  /** Entity type to save (e.g. inventory_request). */
  entityType?: string;
  /** Initial status for new records (e.g. NEW_REQUEST). */
  initialStatus?: string;
  /** Friendly initial status label stored as data.status_text. */
  initialStatusText?: string;
  /** @deprecated Use initialStatus */
  defaultStatus?: string;
  /** Options shown in the Priority / Urgency picker. Saved as `urgency_level`. */
  urgencyOptions?: Array<{ value: string; label: string }>;
  /**
   * After successful create, navigate to the role page whose name matches this
   * (default: "My Request" / "My Requests").
   */
  redirectAfterSubmitPageName?: string;
}

export interface VendorOption {
  id: number;
  name: string;
}

export type InventoryItemSuggestion = {
  id: number;
  name: string;
  data: Record<string, unknown>;
};

export interface FormItem {
  id: string;
  item_name_freeform: string;
  /** Extra product specs (length, connector, model, etc.) used to refine live price search. */
  specifications: string;
  quantity_required: number | '';
  required_date: string;
  product_link: string;
  /** Product thumbnail URL from marketplace page (og:image / JSON-LD). */
  product_image: string;
  vendor: string;
  estimated_cost: string | number | '';
  price_currency: 'INR' | 'USD';
  urgency_level: string;
  comments: string;
  /** Manual quotes from Amazon / Robu / other sites for side-by-side comparison. */
  price_quotes: PriceQuote[];
}

export type SpecFacet = {
  key: string;
  label: string;
  options: string[];
};

export interface InventoryRequestFormProps {
  config?: InventoryRequestFormConfig;
  variant?: 'default' | 'procurement';
}
