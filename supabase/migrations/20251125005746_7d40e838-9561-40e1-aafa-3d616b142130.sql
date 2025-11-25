-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(
  total_users BIGINT,
  active_subscriptions BIGINT,
  monthly_revenue NUMERIC,
  active_promo_codes BIGINT,
  completed_transactions BIGINT,
  pending_transactions BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active' AND tier != 'free') as active_subscriptions,
    (SELECT COALESCE(SUM(amount_paid), 0) 
     FROM public.subscription_history 
     WHERE started_at >= NOW() - INTERVAL '30 days') as monthly_revenue,
    (SELECT COUNT(*) FROM public.promo_codes WHERE active = true) as active_promo_codes,
    0::BIGINT as completed_transactions,
    0::BIGINT as pending_transactions;
END;
$$;

-- Function to get revenue trend
CREATE OR REPLACE FUNCTION public.get_revenue_trend(days_back INTEGER DEFAULT 14)
RETURNS TABLE(
  date DATE,
  revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(sh.started_at) as date,
    COALESCE(SUM(sh.amount_paid), 0) as revenue
  FROM public.subscription_history sh
  WHERE sh.started_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(sh.started_at)
  ORDER BY date DESC;
END;
$$;

-- Function to get admin users with subscription info
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
  user_id UUID,
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  subscription_tier TEXT,
  subscription_status TEXT,
  expires_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  family_id UUID,
  family_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id as user_id,
    au.id,
    au.email,
    p.full_name,
    au.created_at,
    s.tier::TEXT as subscription_tier,
    s.status as subscription_status,
    s.expires_at,
    s.current_period_end,
    fg.id as family_id,
    fg.name as family_name,
    COALESCE(ur.role::TEXT, 'member') as role
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.family_members fm ON fm.user_id = au.id
  LEFT JOIN public.family_groups fg ON fg.id = fm.family_id
  LEFT JOIN public.subscriptions s ON s.family_id = fg.id
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  ORDER BY au.created_at DESC;
END;
$$;

-- Function to get promo code statistics
CREATE OR REPLACE FUNCTION public.get_promo_stats()
RETURNS TABLE(
  total_codes BIGINT,
  active_codes BIGINT,
  total_uses BIGINT,
  expired_codes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.promo_codes) as total_codes,
    (SELECT COUNT(*) FROM public.promo_codes 
     WHERE active = true 
     AND valid_from <= NOW() 
     AND (valid_until IS NULL OR valid_until >= NOW())) as active_codes,
    (SELECT COALESCE(SUM(current_uses), 0) FROM public.promo_codes) as total_uses,
    (SELECT COUNT(*) FROM public.promo_codes 
     WHERE valid_until IS NOT NULL AND valid_until < NOW()) as expired_codes;
END;
$$;

-- Function to get subscription statistics
CREATE OR REPLACE FUNCTION public.get_subscription_stats()
RETURNS TABLE(
  total_subscriptions BIGINT,
  active_trials BIGINT,
  expired_subscriptions BIGINT,
  revenue_this_month NUMERIC,
  churn_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.subscriptions WHERE tier != 'free') as total_subscriptions,
    (SELECT COUNT(*) FROM public.subscriptions WHERE is_trial = true AND status = 'active') as active_trials,
    (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'expired') as expired_subscriptions,
    (SELECT COALESCE(SUM(amount_paid), 0) 
     FROM public.subscription_history 
     WHERE started_at >= DATE_TRUNC('month', NOW())) as revenue_this_month,
    0::NUMERIC as churn_rate;
END;
$$;

-- Function for admin to update subscriptions
CREATE OR REPLACE FUNCTION public.admin_update_subscription(
  p_family_id UUID,
  p_tier TEXT,
  p_status TEXT,
  p_current_period_end TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Update subscription
  UPDATE public.subscriptions
  SET 
    tier = p_tier::subscription_tier,
    status = p_status,
    current_period_end = p_current_period_end,
    updated_at = NOW()
  WHERE family_id = p_family_id;

  -- Return success
  SELECT json_build_object(
    'success', true,
    'message', 'Subscription updated successfully'
  ) INTO result;

  RETURN result;
END;
$$;