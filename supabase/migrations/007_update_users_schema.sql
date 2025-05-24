-- Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS public.users 
    DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Update users table schema
ALTER TABLE public.users
    DROP COLUMN IF EXISTS id,
    ADD COLUMN IF NOT EXISTS uid uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz,
    ADD COLUMN IF NOT EXISTS raw_app_meta_data jsonb,
    ADD COLUMN IF NOT EXISTS raw_user_meta_data jsonb,
    ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index on uid
CREATE INDEX IF NOT EXISTS users_uid_idx ON public.users(uid);

-- Create index on email
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view users in their tenant" ON public.users;

CREATE POLICY "Users can view users in their tenant"
ON public.users
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tenant_users tu
        WHERE tu.tenant_id = users.tenant_id
        AND tu.user_id = auth.uid()
    )
);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION create_user(
    p_name TEXT,
    p_email TEXT,
    p_tenant_id UUID,
    p_role_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- Check if the current user is a tenant owner
    IF NOT EXISTS (
        SELECT 1 FROM public.tenant_users tu
        WHERE tu.tenant_id = p_tenant_id
        AND tu.user_id = auth.uid()
        AND tu.role = 'owner'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only tenant owners can create users'
        );
    END IF;

    -- Insert into public.users
    INSERT INTO public.users (
        name,
        email,
        tenant_id,
        role_id,
        created_at
    )
    VALUES (
        p_name,
        p_email,
        p_tenant_id,
        p_role_id,
        now()
    )
    RETURNING uid INTO v_user_id;

    -- Return success response
    v_result := jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'uid', v_user_id,
            'name', p_name,
            'email', p_email
        )
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        -- Return error response
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Create function to link auth users to public users
CREATE OR REPLACE FUNCTION link_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if there's a matching user in public.users
    IF EXISTS (
        SELECT 1 FROM public.users
        WHERE email = NEW.email
        AND uid IS NULL
    ) THEN
        -- Update the public.users record with the auth user's ID
        UPDATE public.users
        SET 
            uid = NEW.id,
            email_confirmed_at = NEW.email_confirmed_at,
            last_sign_in_at = NEW.last_sign_in_at,
            raw_app_meta_data = NEW.raw_app_meta_data,
            raw_user_meta_data = NEW.raw_user_meta_data,
            updated_at = now()
        WHERE email = NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to link auth users to public users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION link_auth_user();

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user TO authenticated; 