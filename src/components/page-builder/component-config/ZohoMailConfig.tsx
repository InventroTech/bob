import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Page-builder notes for the opt-in Zoho Mail parsing widget.
 * No per-widget settings — drop it only on tenants that need shipment-email parsing.
 */
export function ZohoMailConfig() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zoho Mail Parsing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          Connects a tenant ops inbox and fills empty tracking fields from shipment emails.
        </p>
        <p>
          This widget is opt-in: add it only on pages for tenants that should use Zoho Mail
          parsing. Other tenants will not see it unless it is placed on their page.
        </p>
      </CardContent>
    </Card>
  );
}
