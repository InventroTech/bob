-- Add tenant_id column to roles table
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Update the create_roles_table function to include tenant_id
CREATE OR REPLACE FUNCTION public.create_roles_table()
RETURNS void AS $$
BEGIN
  -- Create roles table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    tenant_id uuid REFERENCES public.tenants(id),
    created_at timestamptz NOT NULL DEFAULT now()
  );
  
  -- Enable RLS
  ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
  
  -- Allow all authenticated users to read roles
  DROP POLICY IF EXISTS "Allow authenticated users to select roles" ON public.roles;
  CREATE POLICY "Allow authenticated users to select roles" ON public.roles
  FOR SELECT USING (auth.role() = 'authenticated');
  
  -- Add role column to pages table if it doesn't exist
  ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS role uuid REFERENCES public.roles(id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 