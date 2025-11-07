-- Fix subscription pricing to match frontend display
-- Update Family tier pricing from 49000 to 20000 monthly
-- Update Premium tier pricing from 99000 to 100000 monthly

UPDATE public.subscription_tiers
SET 
  price_monthly = 20000,
  price_yearly = 200000
WHERE tier = 'family';

UPDATE public.subscription_tiers
SET 
  price_monthly = 100000,
  price_yearly = 1000000
WHERE tier = 'premium';
