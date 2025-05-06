-- Create card_sets table
CREATE TABLE public.card_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create cards table
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_set_id uuid REFERENCES public.card_sets(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.card_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Create policies for card_sets
CREATE POLICY "Allow authenticated users to select card sets" ON public.card_sets
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert card sets" ON public.card_sets
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update card sets" ON public.card_sets
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete card sets" ON public.card_sets
FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for cards
CREATE POLICY "Allow authenticated users to select cards" ON public.cards
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert cards" ON public.cards
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update cards" ON public.cards
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete cards" ON public.cards
FOR DELETE USING (auth.role() = 'authenticated'); 