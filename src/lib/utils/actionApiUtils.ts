/**
 * Utilities for action button API calls in custom tables.
 * Supports configurable method, headers, and payload with row data placeholders.
 */

export type ActionApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ActionApiConfig {
  endpoint: string;
  method?: ActionApiMethod | string;
  headers?: string; // JSON string
  payload?: string; // JSON string, use {id} or {propertyName} for row values, __ROW__ for full row
}

/**
 * Replace placeholders in a string with row values.
 * Supports {id} and {propertyName} for any row property.
 */
function replacePlaceholders(template: string, row: Record<string, any>, idKey = 'id'): string {
  let result = template;
  const rowId = row[idKey] ?? row.id ?? row.lead_id ?? row.ticket_id ?? '';
  result = result.replace(/\{id\}/g, String(rowId));
  result = result.replace(/\{([^}]+)\}/g, (_, key) => String(row[key] ?? ''));
  return result;
}

/**
 * Build request config for action API call from column config and row data.
 */
export function buildActionApiRequest(
  config: ActionApiConfig,
  row: Record<string, any>,
  baseUrl: string,
  defaultHeaders: Record<string, string>,
  idKey: 'id' | 'lead_id' | 'ticket_id' = 'id'
): { url: string; method: string; headers: Record<string, string>; body?: string } {
  const method = (config.method || 'POST').toUpperCase() as ActionApiMethod;
  const hasBody = !['GET', 'HEAD'].includes(method);

  // Build URL with placeholder replacement
  let endpoint = config.endpoint.trim();
  endpoint = replacePlaceholders(endpoint, row, idKey);
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  // Merge headers: defaults first, then parsed custom headers
  const headers: Record<string, string> = { ...defaultHeaders };
  if (config.headers?.trim()) {
    try {
      const custom = JSON.parse(config.headers) as Record<string, string>;
      Object.assign(headers, custom);
    } catch {
      // Invalid JSON - ignore
    }
  }

  // Build body
  let body: string | undefined;
  if (hasBody) {
    if (!config.payload?.trim() || config.payload.trim() === '__ROW__') {
      body = JSON.stringify(row);
    } else {
      try {
        const payloadStr = replacePlaceholders(config.payload, row, idKey);
        let parsed = JSON.parse(payloadStr) as Record<string, unknown>;
        // Replace any "__ROW__" value in the parsed object with the full row
        const replaceRowRef = (obj: any): any => {
          if (obj === '__ROW__') return row;
          if (Array.isArray(obj)) return obj.map(replaceRowRef);
          if (obj && typeof obj === 'object') {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(obj)) {
              out[k] = replaceRowRef(v);
            }
            return out;
          }
          return obj;
        };
        parsed = replaceRowRef(parsed) as Record<string, unknown>;
        body = JSON.stringify(parsed);
      } catch {
        const payloadStr = replacePlaceholders(config.payload, row, idKey);
        body = payloadStr;
      }
    }
  }

  return { url, method, headers, body };
}
