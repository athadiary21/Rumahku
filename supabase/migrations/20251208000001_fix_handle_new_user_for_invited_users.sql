-- Fix handle_new_user to support invited users
-- Issue: Currently creates new family for every new user, even if they were invited
-- Solution: Check if user already has family_members entry (invited), skip family creation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_family_id uuid;
  existing_family_count integer;
BEGIN
  -- Create profile with email
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- Check if user was already invited to a family
  SELECT COUNT(*) INTO existing_family_count
  FROM public.family_members
  WHERE user_id = NEW.id;

  -- If user was invited (has family_members entry), skip family creation
  IF existing_family_count > 0 THEN
    RAISE LOG 'User % was invited to existing family, skipping family creation', NEW.id;
    RETURN NEW;
  END IF;

  -- User is new and not invited, create new family
  BEGIN
    -- Create family group
    INSERT INTO public.family_groups (name, created_by)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Family',
      NEW.id
    )
    RETURNING id INTO new_family_id;

    -- Add user as family member with admin role
    INSERT INTO public.family_members (family_id, user_id, role)
    VALUES (new_family_id, NEW.id, 'admin');

    -- Create default subscription
    INSERT INTO public.subscriptions (family_id, tier, status)
    VALUES (new_family_id, 'premium', 'active');

    RAISE LOG 'Created new family % for user %', new_family_id, NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Error creating family for user %: %', NEW.id, SQLERRM;
      -- Don't fail the signup, just log the error
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Handles new user signup: creates profile, and creates family only if user was not invited';
