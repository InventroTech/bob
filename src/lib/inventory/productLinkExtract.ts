/** Fetch product name / price / delivery from a pasted storefront URL. */

import { formatClientErrorDetail } from '@/lib/api/errors';

export type ProductLinkExtractResult = {
  ok?: boolean;
  configured?: boolean;
  title?: string | null;
  price?: number | null;
  currency?: string | null;
  image?: string | null;
  available?: boolean | null;
  vendor?: string | null;
  link?: string | null;
  error?: string | null;
  method?: string | null;
  debug?: Record<string, unknown> | null;
};

export async function fetchProductFromLink(input: {
  url: string;
  pincode?: string | null;
}): Promise<ProductLinkExtractResult> {
  const body = {
    url: input.url,
    pincode: input.pincode || null,
  };
  console.log('[product-link-extract] request', body);
  try {
    const { apiClient } = await import('@/lib/api');
    const res = await apiClient.post<ProductLinkExtractResult>(
      '/crm-records/product-link-extract/',
      body,
      { timeout: 45000 }
    );
    const data = res.data ?? {};
    console.log('[product-link-extract] response', {
      httpStatus: res.status,
      ok: data.ok,
      configured: data.configured,
      title: data.title,
      price: data.price,
      currency: data.currency,
      image: data.image,
      vendor: data.vendor,
      error: data.error,
      method: data.method,
      debug: data.debug,
      full: data,
    });
    return data;
  } catch (err) {
    console.error('[product-link-extract] request failed', {
      detail: formatClientErrorDetail(err),
      err,
    });
    throw err;
  }
}

export function looksLikeProductUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
