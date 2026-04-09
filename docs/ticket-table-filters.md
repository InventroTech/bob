# Ticket table: configurable filters

## Where to set filters

1. Open **Page Builder**, select the page, click the **ticket table** component.
2. In the right panel, open **Table** settings.
3. Go to the **Filters** tab (same place as for lead / inventory tables).
4. Set **Number of Filters** and fill each filter’s **Display name**, **Accessor key**, **Filter type**, and options (manual or API).

**Accessor key** must match the **query parameter name** your list API expects (e.g. what `/analytics/support-ticket/` or your custom endpoint reads).

## Legacy UI vs configurable filters

If **at least one** filter is configured in the **Filters** tab, the ticket table **stops showing** the old built-in block:

- Resolution status  
- Poster status  
- Assigned to  
- Start/end date range  

Only the filters you define in config are shown and sent to the API.

If **Number of Filters** is **0** (no configured filters), the **legacy** filters appear again and behave as before.

## Mapping the old built-in filters to config

Use these accessors if your backend matches the previous support-ticket style API:

| Old UI | Suggested accessor | Notes |
|--------|-------------------|--------|
| Resolution status | `resolution_status` | Multi-select; values depend on your API (e.g. `Open` may map to `null` on the server—confirm with your backend). |
| Poster status | `poster` | Multi-select. |
| Assigned to | `assigned_to` | Single or multi depending on type; special values like “unassigned” / current user must match what your API expects. |
| Start date / time | `created_at` | Use filter type **Date range** or **Date from** / **Date to** so params become `created_at__gte` / `created_at__lte` (see Dynamic Filter help in UI). |

Add any extra fields (e.g. `call_attempts`) the same way: accessor = query param name, options manual or loaded from **Options API URL**.

## API endpoint

The table uses **one** list URL from **API Endpoint** + **API Prefix** (Supabase vs Renderer) for:

- Initial load  
- Search  
- Apply filters  
- Pagination  

Ensure that endpoint understands the query params your accessors produce (Django-style lookups like `field__gte`, `field__icontains`, etc., when using auto lookup).
