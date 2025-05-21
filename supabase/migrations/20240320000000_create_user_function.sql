-- Create a function to handle password reset emails
CREATE OR REPLACE FUNCTION send_password_reset_email(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Call the built-in Supabase function to send password reset email
    PERFORM auth.users_trigger_reset_password(p_user_id);
END;
$$;

-- Create a function to create a user with auth
CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_email TEXT,
  p_password TEXT,
  p_tenant_id UUID,
  p_role TEXT DEFAULT 'user'
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_auth_user_id UUID;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO v_auth_user_id;

  -- Create user in public.users
  INSERT INTO public.users (
    id,
    email,
    tenant_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_auth_user_id,
    p_email,
    p_tenant_id,
    p_role,
    NOW(),
    NOW()
  ) RETURNING id INTO v_user_id;

  -- Send password reset email
  UPDATE auth.users 
  SET recovery_token = encode(gen_random_bytes(32), 'hex'),
      recovery_sent_at = NOW()
  WHERE id = v_auth_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to add a user
CREATE OR REPLACE FUNCTION add_user(
  p_email TEXT,
  p_tenant_id UUID,
  p_role TEXT DEFAULT 'user'
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_password TEXT;
  v_result JSONB;
BEGIN
  -- Generate a random password
  v_password := substr(md5(random()::text), 1, 12);
  
  -- Create the user with the generated password
  v_user_id := create_user_with_auth(p_email, v_password, p_tenant_id, p_role);
  
  -- Send password reset email
  PERFORM auth.users_trigger_reset_password(v_user_id);
  
  -- Return success response with the temporary password
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'temporary_password', v_password,
    'message', 'User added successfully!'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS delete_user_safely(TEXT);

-- Create a function to safely delete users
CREATE OR REPLACE FUNCTION delete_user_safely(
    p_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Delete from public.users first
    DELETE FROM public.users WHERE id = p_user_id::UUID;

    -- Then delete from auth.users
    DELETE FROM auth.users WHERE id = p_user_id::UUID;

    -- Return success response
    v_result := jsonb_build_object(
        'success', true,
        'message', 'User deleted successfully'
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_with_auth TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_safely TO authenticated;

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