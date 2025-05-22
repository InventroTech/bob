-- Create a function to handle user creation
CREATE OR REPLACE FUNCTION create_user_with_auth(
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
    v_auth_id UUID;
    v_result JSONB;
    v_temp_password TEXT;
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

    -- Generate a temporary password
    v_temp_password := substr(md5(random()::text), 1, 12);

    -- Generate a new UUID for the user
    v_auth_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_auth_id,
        'authenticated',
        'authenticated',
        p_email,
        v_temp_password, -- Store the temporary password
        now(),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- Insert into public.users with the same UUID
    INSERT INTO public.users (
        id,
        name,
        email,
        tenant_id,
        role_id,
        created_at
    )
    VALUES (
        v_auth_id,
        p_name,
        p_email,
        p_tenant_id,
        p_role_id,
        now()
    );

    -- Return success response with the temporary password
    v_result := jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_auth_id,
            'name', p_name,
            'email', p_email,
            'temp_password', v_temp_password
        )
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        -- If anything fails, try to clean up the auth user if it was created
        IF v_auth_id IS NOT NULL THEN
            DELETE FROM auth.users WHERE id = v_auth_id;
        END IF;
        
        -- Return error response
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_with_auth TO authenticated;

-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow users to view users in their tenant
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