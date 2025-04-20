-- Policy: allow authenticated users to create tenants
CREATE POLICY "Allow authenticated users to insert tenants"
  ON public.tenants
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- (Optional) allow users to update their own tenant name if needed
CREATE POLICY "Allow tenant owners to update tenants"
  ON public.tenants
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = tenants.id
        AND tu.user_id = auth.uid()
        AND tu.role = 'owner'
    )
  ); 