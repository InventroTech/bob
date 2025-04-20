-- Enable RLS on all core tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_rows ENABLE ROW LEVEL SECURITY;

-- Policy: tenant_users can only see their own tenant memberships
CREATE POLICY "Users can see their own tenant memberships"
  ON public.tenant_users
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: tenant_users can only insert themselves (for invites, you may want to allow owners to add others)
CREATE POLICY "Users can add themselves to tenants"
  ON public.tenant_users
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Only allow SELECT on tenants if user is a member
CREATE POLICY "Users can see their tenants"
  ON public.tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = tenants.id AND tu.user_id = auth.uid()
    )
  );

-- Policy: Only allow SELECT on custom_tables if user is a member of the tenant
CREATE POLICY "Users can see their custom tables"
  ON public.custom_tables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = custom_tables.tenant_id AND tu.user_id = auth.uid()
    )
  );

-- Policy: Only allow SELECT on custom_columns if user is a member of the tenant
CREATE POLICY "Users can see their custom columns"
  ON public.custom_columns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_tables t
      JOIN public.tenant_users tu ON t.tenant_id = tu.tenant_id
      WHERE t.id = custom_columns.table_id AND tu.user_id = auth.uid()
    )
  );

-- Policy: Only allow SELECT on custom_rows if user is a member of the tenant
CREATE POLICY "Users can see their custom rows"
  ON public.custom_rows
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_tables t
      JOIN public.tenant_users tu ON t.tenant_id = tu.tenant_id
      WHERE t.id = custom_rows.table_id AND tu.user_id = auth.uid()
    )
  );

-- (You can add similar policies for INSERT/UPDATE/DELETE, restricting by role, in the next step)
