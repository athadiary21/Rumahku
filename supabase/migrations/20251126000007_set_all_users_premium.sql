-- Set all users to Premium tier with unlimited access

-- 1. Update trigger to create new users with Premium tier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_family_id UUID;
BEGIN
  -- Create a new family group for the user
  INSERT INTO public.family_groups (name, created_by)
  VALUES (NEW.raw_user_meta_data->>'full_name' || '''s Family', NEW.id)
  RETURNING id INTO new_family_id;

  -- Add user to the family group as owner
  INSERT INTO public.family_members (family_id, user_id, role, joined_at)
  VALUES (new_family_id, NEW.id, 'owner', NOW());

  -- Create Premium subscription for the family (unlimited access)
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
END;
$$;

-- 2. Update all existing subscriptions to Premium tier
UPDATE public.subscriptions
SET 
  tier = 'premium',
  status = 'active',
  current_period_end = (NOW() + INTERVAL '100 years')::timestamptz,
  billing_period = 'yearly',
  auto_renew = true,
  updated_at = NOW()
WHERE tier != 'premium' OR status != 'active';

-- 3. Create Premium subscriptions for families that don't have one
INSERT INTO public.subscriptions (
  family_id,
  tier,
  status,
  started_at,
  current_period_end,
  billing_period,
  auto_renew
)
SELECT 
  fg.id,
  'premium',
  'active',
  NOW(),
  (NOW() + INTERVAL '100 years')::timestamptz,
  'yearly',
  true
FROM public.family_groups fg
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.family_id = fg.id
);

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates Premium subscription for new users with 100 years expiration (essentially unlimited access)';
