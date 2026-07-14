# bob (frontend) review rules

Vite + React 18 + TypeScript multi-tenant UI (`InventroTech/bob`). App code lives under `src/`. Routes are typically under `/app/:tenantSlug`.

## Must flag

- **Secrets in the client:** committing `.env`, non-`VITE_*` secrets, service-role keys, or hard-coded API tokens. Only `VITE_*` may ship to the browser.
- **Token / session leaks:** logging JWTs, Supabase keys, spoof tokens, or access tokens; dumping secrets into Sentry/console.
- **Auth bypass:** new authenticated screens missing `ProtectedRoute` / `ProtectedAppRoute` (or equivalent); skipping Supabase session checks.
- **API client footguns:** new network calls using ad-hoc `fetch` + manual `Authorization` headers instead of `apiClient` / `@/lib/api` services (Bearer + refresh live in `lib/api/client.ts` and `lib/auth/*`).
- **Tenant mistakes:** hard-coded tenant slugs; wrong `/app/:tenantSlug` nesting; treating `localStorage` `tenant_slug` as the source of truth for API tenancy (JWT / membership is primary).
- **SpoofJWT changes:** edits to `lib/spoof.ts` or `pyro_spoof_*` localStorage keys without clear justification (XSS → full account impersonation).

## Conventions

- Prefer `@/` imports for shared code.
- Forms: prefer react-hook-form + zod + `@/components/ui/form`.
- UI: prefer existing shadcn/Radix under `components/ui/` over one-off primitives.
- Auth/token/refresh logic stays in `lib/auth/*` and interceptors — do not duplicate.
- Cross-tenant UI actions need membership/permission awareness via `useTenant` / membership services.

## Tests

- Vitest is available (`npm test`). Flag missing tests for auth, tenant switching, and API client changes; do not block pure UI polish on tests alone (coverage is currently thin).

## Out of scope noise

Do not nitpick unused-vars / `any` style (ESLint allows them). Focus on auth, tenancy, secrets, broken routing, and regressions.
