-- Fix admin access and ensure get_admin_users function works properly

-- First, let's make sure the get_admin_users function exists and works correctly
-- This function should return all users with their subscription info

CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  family_id UUID,
  family_name TEXT,
  subscription_tier TEXT,
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    COALESCE(p.full_name, au.email::TEXT) as full_name,
    au.created_at,
    COALESCE(fm.family_id, '00000000-0000-0000-0000-000000000000'::UUID) as family_id,
    COALESCE(fg.name, 'No Family') as family_name,
    COALESCE(s.tier::TEXT, 'free') as subscription_tier,
    COALESCE(s.status, 'active') as subscription_status,
    s.current_period_end,
    COALESCE(fm.role::TEXT, 'member') as role
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.family_members fm ON fm.user_id = au.id
  LEFT JOIN public.family_groups fg ON fg.id = fm.family_id
  LEFT JOIN public.subscriptions s ON s.family_id = fm.family_id
  WHERE au.deleted_at IS NULL
  ORDER BY au.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_users() TO authenticated;

-- Create a helper function to make a user admin
-- This can be called manually via SQL editor to give admin access
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Insert admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'User % is now an admin', user_email;
END;
$$;

-- Grant execute to service role only (for security)
GRANT EXECUTE ON FUNCTION make_user_admin(TEXT) TO service_role;

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Make the first user (by email) an admin if no admins exist
-- This is a one-time setup helper
DO $$
DECLARE
  first_user_id UUID;
  admin_count INTEGER;
BEGIN
  -- Check if there are any admins
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';
  
  -- If no admins exist, make the first user an admin
  IF admin_count = 0 THEN
    SELECT id INTO first_user_id
    FROM auth.users
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (first_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      RAISE NOTICE 'First user has been made admin';
    END IF;
  END IF;
END $$;

-- Add comments
COMMENT ON FUNCTION get_admin_users() IS 'Returns all users with subscription info (admin only)';
COMMENT ON FUNCTION make_user_admin(TEXT) IS 'Makes a user admin by email (service role only)';
COMMENT ON FUNCTION is_admin() IS 'Checks if current user is admin';

-- Create a view for easier admin checking (optional)
CREATE OR REPLACE VIEW admin_users AS
SELECT 
  au.id,
  au.email,
  p.full_name,
  ur.role,
  ur.created_at as admin_since
FROM auth.users au
JOIN public.user_roles ur ON ur.user_id = au.id
LEFT JOIN public.profiles p ON p.id = au.id
WHERE ur.role = 'admin'
AND au.deleted_at IS NULL;

-- Grant select on view to authenticated users
GRANT SELECT ON admin_users TO authenticated;

COMMENT ON VIEW admin_users IS 'List of all admin users';
