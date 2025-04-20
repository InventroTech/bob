-- Allow INSERT/UPDATE/DELETE on custom_tables only for owners and editors
CREATE POLICY "Tenant editors/owners can create tables"
  ON public.custom_tables
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = custom_tables.tenant_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Tenant editors/owners can update tables"
  ON public.custom_tables
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = custom_tables.tenant_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Tenant editors/owners can delete tables"
  ON public.custom_tables
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = custom_tables.tenant_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('owner', 'editor')
    )
  );

-- Same for custom_columns
CREATE POLICY "Tenant editors/owners can create columns"
  ON public.custom_columns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_tables t
      JOIN public.tenant_users tu ON t.tenant_id = tu.tenant_id
      WHERE t.id = custom_columns.table_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Tenant editors/owners can update columns"
  ON public.custom_columns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_tables t
      JOIN public.tenant_users tu ON t.tenant_id = tu.tenant_id
      WHERE t.id = custom_columns.table_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Tenant editors/owners can delete columns"
  ON public.custom_columns
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_tables t
      JOIN public.tenant_users tu ON t.tenant_id = tu.tenant_id
      WHERE t.id = custom_columns.table_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('owner', 'editor')
    )
  );

-- Same for custom_rows
CREATE POLICY "Tenant editors/owners can create rows"
  ON public.custom_rows
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_tables t
      JOIN public.tenant_users tu ON t.tenant_id = tu.tenant_id
      WHERE t.id = custom_rows.table_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Tenant editors/owners can update rows"
  ON public.custom_rows
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_tables t
      JOIN public.tenant_users tu ON t.tenant_id = tu.tenant_id
      WHERE t.id = custom_rows.table_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Tenant editors/owners can delete rows"
  ON public.custom_rows
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_tables t
      JOIN public.tenant_users tu ON t.tenant_id = tu.tenant_id
      WHERE t.id = custom_rows.table_id
        AND tu.user_id = auth.uid()
        AND tu.role IN ('owner', 'editor')
    )
  );
