/** Pure helpers for the lead table module. */

import { formatCalendarDate, formatTableDateShort } from '@/lib/utils/timeUtils';
import { PLACEHOLDER_REGEX } from './constants';
import type { LeadTableProps } from './types';

// Status color mapping - matching design colors
export const getStatusColor = (status: string, statusColors?: Record<string, string>) => {
  if (statusColors && statusColors[status]) {
    return statusColors[status];
  }
  
  // Default fallback colors - matching design
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'critical':
      return 'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/55 dark:text-orange-100 dark:border-orange-700';
    case 'standard':
      return 'bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/55 dark:text-sky-100 dark:border-sky-700';
    case 'paid':
    case 'active':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'on_hold':
    case 'on hold':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'auto pay not set':
    case 'autopay_setup_no_layout':
    case 'auto_pay_not_set_up':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'in trial':
    case 'in_trial':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'trial expired':
    case 'trial_expired':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'in_queue':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'assigned':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'call_later':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'scheduled':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'won':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'lost':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'closed':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'resolved':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'wip':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'open':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const toVendorStorageName = (name: string): string =>
  String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

// Convert raw email/id into a user-friendly display name
export const getDisplayName = (email: string | null): string => {
  if (!email) return 'Unassigned';
  
  // If it's already a name (not an email), return as is
  if (!email.includes('@')) return email;
  
  // Extract name from email
  const namePart = email.split('@')[0];
  
  // Convert to title case and replace dots/underscores with spaces
  const displayName = namePart
    .replace(/[._]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return displayName;
};

// Format UTC date string into relative time (IST timezone)
export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  // Parse the UTC timestamp
  let utcDate: Date;
  
  if (dateString.includes('T')) {
    utcDate = new Date(dateString);
  } else if (dateString.includes(' ')) {
    utcDate = new Date(dateString + ' UTC');
  } else {
    utcDate = new Date(dateString);
  }
  
  if (isNaN(utcDate.getTime())) {
    return 'Invalid date';
  }
  
  // Convert UTC to IST (Mumbai) - IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utcDate.getTime() + istOffset);
  
  // Get current time in IST
  const nowUtc = new Date();
  const nowIst = new Date(nowUtc.getTime() + istOffset);
  
  // Calculate difference
  const diffInMilliseconds = nowIst.getTime() - istDate.getTime();
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  
  if (diffInSeconds < 0) {
    return 'Just now';
  }
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

// Safely walk nested objects using dot-delimited paths (e.g. user_metadata.assigned_to)
export const getNestedValue = (source: any, path: string): any => {
  if (!source || !path) return undefined;

  return path
    .split('.')
    .map(segment => segment.trim())
    .filter(Boolean)
    .reduce((current: any, key) => {
      if (current === undefined || current === null) {
        return undefined;
      }
      return current[key];
    }, source);
};

// Apply placeholder substitutions and URL-encode each resolved value
export const applyPlaceholderTemplate = (
  template: string,
  resolver: (token: string) => string | undefined
): string => {
  return template.replace(PLACEHOLDER_REGEX, (_match, token) => {
    const resolved = resolver(token);
    if (resolved === undefined || resolved === null) {
      return '';
    }
    return encodeURIComponent(String(resolved));
  });
};

// Transform backend record to table row based on optional column config
export const transformLeadData = (lead: any, config?: LeadTableProps['config']) => {
  // If configuration is provided, use it to transform data
  if (config?.columns) {
    const transformedLead: any = { ...lead };
    
    // Apply transformations for configured columns
    config.columns.forEach(col => {
      const value = lead.data?.[col.key] !== undefined ? lead.data?.[col.key] : lead[col.key];
      const entityType = String(config?.entityType || '');
      const useSlashTableDate =
        entityType.startsWith('inventory_') || entityType === 'unmannd_request';
      const calendarKeys = new Set([
        'request_date',
        'requested_date',
        'required_date',
        'requirement_date',
        'eta',
      ]);
      const formatTableDate = (raw: string) =>
        useSlashTableDate ? formatTableDateShort(raw) : formatCalendarDate(raw);
      
      // Use custom transform if provided
      if (col.transform) {
        transformedLead[col.key] = col.transform(value, lead);
      } else {
        // Apply default transformations based on field type
        switch (col.type) {
          case 'date': {
            if (value === null || value === undefined) {
              transformedLead[col.key] = 'N/A';
              break;
            }
            // Request / requirement / inventory / unmannd: calendar day in table.
            const useCalendarDate =
              entityType.startsWith('inventory_') ||
              entityType === 'unmannd_request' ||
              col.key === 'request_date' ||
              col.key === 'requested_date' ||
              col.key === 'required_date' ||
              col.key === 'requirement_date' ||
              col.key === 'created_at';
            transformedLead[col.key] = useCalendarDate
              ? formatTableDate(String(value))
              : formatRelativeTime(String(value));
            break;
          }
          default: {
            // Even if Page Builder marks these as text, keep the same format as Request Date.
            if (
              calendarKeys.has(col.key) &&
              value !== null &&
              value !== undefined &&
              String(value).trim() !== ''
            ) {
              transformedLead[col.key] = formatTableDate(String(value));
            } else {
              transformedLead[col.key] = value !== null && value !== undefined ? value : 'N/A';
            }
          }
        }
      }
    });
    
    // Always include user_profile_link for Praja ID clickability
    transformedLead.user_profile_link = lead.data?.user_profile_link || lead.user_profile_link || '#';
    
    // Always include whatsapp_link for phone number clickability
    transformedLead.whatsapp_link = lead.data?.whatsapp_link || lead.whatsapp_link || '';
    
    // Always include poster field from records JSONB data
    transformedLead.poster = lead.data?.poster || lead.poster || null;

    // Profile avatars in the name column (ShortProfileCard) read row.display_pic_url; API often stores it only on JSONB data
    transformedLead.display_pic_url =
      lead.display_pic_url ||
      lead.data?.display_pic_url ||
      transformedLead.display_pic_url ||
      null;

    // Inventory / procurement item thumbnails (Item name column)
    transformedLead.product_image =
      lead.product_image ||
      lead.data?.product_image ||
      transformedLead.product_image ||
      null;
    if (!transformedLead.vendor) {
      transformedLead.vendor = lead.data?.vendor || lead.vendor || null;
    }
    
    return transformedLead;
  }
  
  // Fallback: minimal transformation for default columns only
  return {
    ...lead,
    lead_stage: lead.data?.lead_stage || lead.data?.lead_status || lead.lead_stage || 'in_queue',
    name: lead.data?.name || 'N/A', // name is now in data column
    praja_id: lead.data?.praja_id || lead.data?.user_id || lead.id || 'N/A',
    affiliated_party: lead.data?.affiliated_party || 'N/A',
    phone_number: lead.data?.phone_number || lead.data?.phone_no || lead.phone || 'N/A',
    whatsapp_link: lead.data?.whatsapp_link || lead.whatsapp_link || '',
    user_profile_link: lead.data?.user_profile_link || lead.user_profile_link || '#',
    poster: lead.data?.poster || lead.poster || null, // Add poster field from records JSONB data
    display_pic_url: lead.display_pic_url || lead.data?.display_pic_url || null,
    product_image: lead.product_image || lead.data?.product_image || null,
  };
};

export type InventoryTableKind =
  | 'procurement'
  | 'my_request'
  | 'pending_approval'
  | 'vendor_identified'
  | 'rejected'
  | 'inventory';

const INVENTORY_TABLE_KIND_DEFAULT_TITLES: Record<InventoryTableKind, string> = {
  procurement: 'All Requests',
  my_request: 'My Requests',
  pending_approval: 'Pending Approvals',
  vendor_identified: 'Vendor Identified',
  rejected: 'Rejected',
  inventory: '',
};

/** Saved Page Builder configs often copy "All Requests" onto every inventory table. */
export function isGenericInventoryTableTitle(title: string | undefined | null): boolean {
  const t = String(title || '').trim().toLowerCase();
  return !t || t === 'all leads' || t === 'all request' || t === 'all requests';
}

export function resolveInventoryTableDisplayTitle(options: {
  configuredTitle?: string | null;
  inventoryTableKind?: InventoryTableKind | string | null;
  pageDisplayName?: string | null;
}): string | undefined {
  const configured = String(options.configuredTitle || '').trim();
  const kind = String(options.inventoryTableKind || '').trim() as InventoryTableKind;
  const pageName = String(options.pageDisplayName || '').trim();

  if (isGenericInventoryTableTitle(configured)) {
    const kindDefault = kind ? INVENTORY_TABLE_KIND_DEFAULT_TITLES[kind] : '';
    if (kindDefault) return kindDefault;
    if (pageName) return pageName;
    return undefined;
  }
  return configured || undefined;
}

/** Map Page Builder table widget types to inventory page kinds. */
export const TABLE_COMPONENT_KIND_MAP: Record<string, InventoryTableKind> = {
  procurementTable: 'procurement',
  myRequestTable: 'my_request',
  pendingApprovalTable: 'pending_approval',
  vendorIdentifiedTable: 'vendor_identified',
  rejectedTable: 'rejected',
  inventoryTable: 'inventory',
};

export function isInventoryLikeTableConfig(
  config: Record<string, unknown> | undefined | null
): boolean {
  if (!config) return false;
  const entityType = String(config.entityType || '').trim();
  const forceEntityType = String(
    (config.forceQueryParams as Record<string, string> | undefined)?.entity_type || ''
  ).trim();
  const apiEndpoint = String(config.apiEndpoint || '').trim();
  if (entityType === 'inventory_request' || entityType === 'unmannd_request') return true;
  if (forceEntityType === 'inventory_request' || forceEntityType === 'unmannd_request') return true;
  if (/(?:^|[?&])entity_type=(?:unmannd_request|inventory_request)(?:&|$)/i.test(apiEndpoint)) {
    return true;
  }
  const columns = config.columns;
  if (Array.isArray(columns)) {
    return columns.some((col: { key?: string }) =>
      ['item_name_freeform', 'item_name', 'quantity_required', 'urgency_level'].includes(
        String(col?.key || '')
      )
    );
  }
  return false;
}

export function inferInventoryTableKindFromPageName(pageName: string): InventoryTableKind | undefined {
  const n = pageName.trim().toLowerCase();
  if (!n) return undefined;
  if (n === 'all request' || n === 'all requests' || n === 'all leads') return 'procurement';
  if (n.includes('my request')) return 'my_request';
  if (n.includes('pending approval')) return 'pending_approval';
  if (n.includes('vendor identified')) return 'vendor_identified';
  if (n === 'rejected' || n.startsWith('rejected ')) return 'rejected';
  if (n.includes('in cart') || n.includes('ordered') || n.includes('delivered')) return 'inventory';
  return undefined;
}

export function resolveTableComponentInventoryKind(
  componentType: string,
  pageName: string,
  config: Record<string, unknown> | undefined | null
): InventoryTableKind | undefined {
  const fromType = TABLE_COMPONENT_KIND_MAP[componentType];
  if (fromType) return fromType;
  if (componentType === 'leadTable' && isInventoryLikeTableConfig(config)) {
    return inferInventoryTableKindFromPageName(pageName) ?? 'inventory';
  }
  if (componentType === 'inventoryTable') return 'inventory';
  return undefined;
}

/** Normalize saved table config title using page name + widget type (handles generic leadTable). */
export function enrichInventoryTableConfig(
  componentType: string,
  pageName: string,
  config: Record<string, unknown> | undefined | null
): Record<string, unknown> {
  const base = config ? { ...config } : {};
  const inventoryLike =
    Boolean(TABLE_COMPONENT_KIND_MAP[componentType]) || isInventoryLikeTableConfig(base);
  if (!inventoryLike) return base;

  const trimmedPageName = pageName.trim();
  const inventoryTableKind =
    resolveTableComponentInventoryKind(componentType, trimmedPageName, base) ??
    inferInventoryTableKindFromPageName(trimmedPageName);

  const title = resolveInventoryTableDisplayTitle({
    configuredTitle: base.title as string | undefined,
    inventoryTableKind,
    pageDisplayName: trimmedPageName,
  });

  const { inventoryTableKind: _staleKind, ...withoutStaleKind } = base;

  return {
    ...withoutStaleKind,
    ...(trimmedPageName ? { pageDisplayName: trimmedPageName } : {}),
    pageComponentType: componentType,
    ...(title ? { title } : {}),
  };
}

/** Only the All Requests page uses the branded ALL REQUEST toolbar label. */
export function formatInventoryTableToolbarTitle(
  title: string | undefined,
  inventoryTableKind?: InventoryTableKind | string | null
): string | undefined {
  if (!title) return undefined;
  const kind = String(inventoryTableKind || '').trim();
  if (kind === 'procurement' && isGenericInventoryTableTitle(title)) {
    return 'ALL REQUEST';
  }
  return title;
}

/** Resolve toolbar title using sidebar page name (authoritative) + widget type. */
export function resolveInventoryPageTitle(options: {
  configuredTitle?: string | null;
  pageDisplayName?: string | null;
  inventoryTableKind?: InventoryTableKind | string | null;
  pageComponentType?: string | null;
}): string | undefined {
  const pageName = String(options.pageDisplayName || '').trim();
  const kindFromPageName = inferInventoryTableKindFromPageName(pageName);
  const kind =
    kindFromPageName ||
    TABLE_COMPONENT_KIND_MAP[String(options.pageComponentType || '')] ||
    String(options.inventoryTableKind || '').trim();

  return resolveInventoryTableDisplayTitle({
    configuredTitle: options.configuredTitle,
    inventoryTableKind: kind,
    pageDisplayName: pageName,
  });
}
