-- Create support_ticket table
CREATE TABLE IF NOT EXISTS public.support_ticket (
  id SERIAL PRIMARY KEY,
  ticket_date timestamptz DEFAULT now(),
  user_id text,
  name text,
  phone text,
  source text,
  subscription_status text,
  atleast_paid_once boolean DEFAULT false,
  reason text,
  other_reasons jsonb DEFAULT '[]'::jsonb, -- Store as JSON array
  badge text,
  poster text,
  tenant_id text,
  layout_status text,
  resolution_status text DEFAULT 'Pending',
  resolution_time text,
  cse_name text,
  cse_remarks text,
  cse_called_date timestamptz,
  call_status text DEFAULT 'Call Waiting',
  call_duration text DEFAULT '0s',
  call_attempts integer DEFAULT 0,
  rm_name text,
  completed_at timestamptz,
  snooze_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_ticket ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_ticket_tenant_id ON public.support_ticket(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_resolution_status ON public.support_ticket(resolution_status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_user_id ON public.support_ticket(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_created_at ON public.support_ticket(created_at);

-- RLS Policies
CREATE POLICY "Users can view tickets in their tenant" ON public.support_ticket
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = support_ticket.tenant_id::uuid
    AND tu.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert tickets in their tenant" ON public.support_ticket
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = support_ticket.tenant_id::uuid
    AND tu.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tickets in their tenant" ON public.support_ticket
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = support_ticket.tenant_id::uuid
    AND tu.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = support_ticket.tenant_id::uuid
    AND tu.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tickets in their tenant" ON public.support_ticket
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = support_ticket.tenant_id::uuid
    AND tu.user_id = auth.uid()
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS on_support_ticket_updated ON public.support_ticket;
CREATE TRIGGER on_support_ticket_updated
BEFORE UPDATE ON public.support_ticket
FOR EACH ROW
EXECUTE FUNCTION public.handle_support_ticket_updated_at(); 