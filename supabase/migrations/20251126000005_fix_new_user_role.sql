-- Fix handle_new_user function to assign 'member' role instead of 'admin' to new users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_family_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Create a family group for the new user
  INSERT INTO public.family_groups (name, created_by)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Keluarga Saya') || '''s Family',
    NEW.id
  )
  RETURNING id INTO new_family_id;
  
  -- Add user as owner of their family (family role, not app role)
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (new_family_id, NEW.id, 'admin');
  
  -- Assign MEMBER role to new users (not admin!)
  -- Only manually assigned users should be admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  -- Create free subscription
  INSERT INTO public.subscriptions (family_id, tier)
  VALUES (new_family_id, 'free');
  
  RETURN NEW;
END;
$$;

-- Add comment explaining the change
COMMENT ON FUNCTION public.handle_new_user() IS 'Handles new user signup: creates profile, family, and assigns member role (not admin)';

-- Note: Existing users with admin role will keep their admin role
-- This only affects NEW signups from now on
