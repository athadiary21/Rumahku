-- Fix handle_new_user() trigger to handle NULL full_name and use 100 years expiration

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_family_id UUID;
  user_full_name TEXT;
BEGIN
  -- Get full name from metadata, fallback to email if NULL
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create a new family group for the user
  INSERT INTO public.family_groups (name, created_by)
  VALUES (user_full_name || '''s Family', NEW.id)
  RETURNING id INTO new_family_id;

  -- Add user to the family group as owner
  INSERT INTO public.family_members (family_id, user_id, role, joined_at)
  VALUES (new_family_id, NEW.id, 'owner', NOW());

  -- Create Premium subscription for the family (unlimited access - 100 years)
  INSERT INTO public.subscriptions (
    family_id, 
    tier, 
    status, 
    started_at,
    current_period_end,
    billing_period,
    auto_renew
  )
  VALUES (
    new_family_id, 
    'premium',  -- Premium tier for all new users
    'active', 
    NOW(),
    (NOW() + INTERVAL '100 years')::timestamptz,  -- 100 years expiration (essentially unlimited)
    'yearly',
    true
  );

  -- Assign member role (not admin) to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates Premium subscription for new users with 100 years expiration. Handles NULL full_name gracefully.';
