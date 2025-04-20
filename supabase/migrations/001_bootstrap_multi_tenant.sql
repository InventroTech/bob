-- Tenants (organizations)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Users in each tenant, with roles
CREATE TABLE public.tenant_users (
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

-- User-defined tables (metadata)
CREATE TABLE public.custom_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User-defined columns (metadata)
CREATE TABLE public.custom_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES public.custom_tables(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- e.g. 'text', 'integer', 'boolean', etc.
  ordinal_position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User data (rows)
CREATE TABLE public.custom_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES public.custom_tables(id) ON DELETE CASCADE,
  data jsonb NOT NULL, -- actual row data, keys = column names
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast row lookup by table
CREATE INDEX ON public.custom_rows (table_id);

-- Index for fast column lookup by table
CREATE INDEX ON public.custom_columns (table_id);

-- Index for fast table lookup by tenant
CREATE INDEX ON public.custom_tables (tenant_id);
