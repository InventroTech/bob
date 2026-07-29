# BOB

BOB is the Pyro admin / page-builder frontend: a Vite + React SPA that talks to a Render REST API and Supabase Auth. There is no application backend in this repo.

```text
Browser (this repo)
  ├── Supabase Auth (+ some tables)
  ├── Render REST API  (VITE_RENDER_API_URL)
  └── WebSocket realtime (optional)
```

## Stack

- React 18 + TypeScript (strict)
- Vite
- Tailwind CSS + shadcn/ui
- TanStack React Query
- React Router
- Axios (`src/lib/api`)
- Supabase Auth

## Setup

**Requirements:** Node.js 20+ and npm.

```sh
git clone <repo-url>
cd bob
npm install
```

Copy or create a `.env` with:

| Variable | Purpose |
|----------|---------|
| `VITE_RENDER_API_URL` | Backend API base URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

Then:

```sh
npm run dev      # http://localhost:8080
```

### Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

Deployed as a SPA (e.g. Vercel). `vercel.json` rewrites all routes to `index.html`.

## Project structure

```text
src/
├── features/            # Product domains — pages + hooks live here
│   ├── auth/
│   ├── jobs/            # Reference feature (copy this pattern)
│   ├── billing/
│   ├── inventory/
│   ├── membership/
│   ├── crm/
│   ├── analytics/
│   ├── ats/
│   ├── page-builder/
│   ├── tenant-app/
│   └── dashboard/
├── components/
│   ├── ui/              # Shared design system
│   ├── layout/          # Admin shell (Sidebar, DashboardLayout)
│   ├── page-builder/    # Builder widgets (split into folders)
│   └── ATScomponents/   # ATS widgets
├── lib/api/             # Only place for HTTP to the backend
│   ├── client.ts        # Shared axios + auth interceptors
│   ├── config.ts
│   ├── queryKeys.ts
│   └── services/        # One module per domain
├── hooks/               # Auth, tenant, realtime, route guards
├── layout/              # Tenant custom-app layout
└── types/
```

`App.tsx` wires providers and all routes (importing pages from `src/features/`).

## Architecture rules

**Data flow**

```text
UI (feature page / component)
  → feature hook (React Query) when needed
  → lib/api/services/<domain>.ts
  → apiClient
  → Render API
```

- Put HTTP in `src/lib/api/services/`, not in components.
- Do not call `fetch` or read `import.meta.env.VITE_*` in UI code.
- Prefer React Query hooks in `src/features/<domain>/hooks/`.
- Pages live under `src/features/<domain>/pages/` only.

**Reference feature:** `src/features/jobs/` — thin pages, shared UI shell, adapters, API services.

Large widgets are split as:

```text
types.ts + utils.ts + useX.ts + XView.tsx + index.tsx
```

Example: `@/components/page-builder/lead-table`.

### Features

| Feature | Responsibility |
|---------|----------------|
| `auth` | Login, signup, OAuth, custom-app login |
| `jobs` | Background + Pyro job runners |
| `billing` | Billing report |
| `inventory` | Inventory request / PM / receive |
| `membership` | Users, hierarchy, lead-type assignment |
| `crm` | Entity types, lead groups, call matrix |
| `analytics` | Team dashboard |
| `ats` | Hiring jobs |
| `page-builder` | Page builder, my pages, ops programs |
| `tenant-app` | `/app/:slug` tenant UI |
| `dashboard` | Home, profile, 404 |

### Adding a feature

1. Create `src/features/<name>/` with `pages/` (and hooks if needed).
2. Add `src/lib/api/services/<name>.ts` using `apiClient`.
3. Export from `src/lib/api/index.ts` if useful.
4. Register routes in `src/App.tsx`.
5. Add a Sidebar item when needed (use `roles` for ACL).

## License

Private.
