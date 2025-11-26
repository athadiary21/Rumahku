-- Fix Admin Functions and Add Seed Data
-- This migration ensures admin functions work correctly and adds necessary seed data

-- Drop and recreate get_admin_users function with better error handling
DROP FUNCTION IF EXISTS public.get_admin_users();

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
    COALESCE(au.email, 'No Email') as email,
    COALESCE(p.full_name, 'Unknown User') as full_name,
    au.created_at,
    COALESCE(s.tier::TEXT, 'free') as subscription_tier,
    COALESCE(s.status, 'active') as subscription_status,
    s.expires_at,
    s.current_period_end,
    COALESCE(fg.id, '00000000-0000-0000-0000-000000000000'::UUID) as family_id,
    COALESCE(fg.name, 'No Family') as family_name,
    COALESCE(ur.role::TEXT, 'member') as role
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.family_members fm ON fm.user_id = au.id
  LEFT JOIN public.family_groups fg ON fg.id = fm.family_id
  LEFT JOIN public.subscriptions s ON s.family_id = fg.id
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  WHERE au.deleted_at IS NULL
  ORDER BY au.created_at DESC;
END;
$$;

-- Ensure website_content table exists with proper structure
CREATE TABLE IF NOT EXISTS public.website_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on website_content
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for website_content
CREATE POLICY "Anyone can view website content"
  ON public.website_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can update website content"
  ON public.website_content FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can insert website content"
  ON public.website_content FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- Insert seed data for website_content if not exists
INSERT INTO public.website_content (key, title, content)
VALUES 
  ('hero_title', 'Kelola Rumah Tangga Jadi Lebih Mudah', 'Aplikasi all-in-one untuk mengatur jadwal, keuangan, dan kebutuhan keluarga Anda'),
  ('hero_subtitle', 'Semua yang Anda Butuhkan dalam Satu Aplikasi', 'Dari kalender keluarga hingga manajemen keuangan, semua ada di RumahKu'),
  ('features_title', 'Fitur Lengkap untuk Keluarga Modern', 'Kelola semua aspek rumah tangga dengan mudah dan efisien'),
  ('pricing_title', 'Pilih Paket yang Sesuai untuk Keluarga Anda', 'Mulai gratis, upgrade kapan saja sesuai kebutuhan'),
  ('testimonials_title', 'Apa Kata Pengguna Kami', 'Ribuan keluarga sudah merasakan manfaatnya'),
  ('faq_title', 'Pertanyaan yang Sering Diajukan', 'Temukan jawaban untuk pertanyaan Anda'),
  ('cta_title', 'Siap Mengatur Rumah Tangga Lebih Baik?', 'Daftar sekarang dan mulai perjalanan Anda menuju rumah tangga yang lebih terorganisir')
ON CONFLICT (key) DO NOTHING;

-- Create pricing_plans table if not exists
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'family', 'premium')),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on pricing_plans
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_plans
CREATE POLICY "Anyone can view active pricing plans"
  ON public.pricing_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage pricing plans"
  ON public.pricing_plans FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ));

-- Insert seed data for pricing_plans
INSERT INTO public.pricing_plans (name, tier, price, billing_period, features, display_order)
VALUES 
  (
    'Free',
    'free',
    0,
    'monthly',
    '["Kalender keluarga", "Daftar belanja dasar", "1 anggota keluarga", "Penyimpanan 100MB"]'::jsonb,
    1
  ),
  (
    'Family',
    'family',
    49000,
    'monthly',
    '["Semua fitur Free", "Hingga 5 anggota keluarga", "Manajemen keuangan", "Resep & meal planning", "Penyimpanan 1GB", "Vault digital", "Support prioritas"]'::jsonb,
    2
  ),
  (
    'Family Yearly',
    'family',
    490000,
    'yearly',
    '["Semua fitur Free", "Hingga 5 anggota keluarga", "Manajemen keuangan", "Resep & meal planning", "Penyimpanan 1GB", "Vault digital", "Support prioritas", "Hemat 2 bulan"]'::jsonb,
    3
  ),
  (
    'Premium',
    'premium',
    99000,
    'monthly',
    '["Semua fitur Family", "Anggota keluarga unlimited", "Penyimpanan 10GB", "Analytics & reports", "Custom categories", "API access", "White-label option"]'::jsonb,
    4
  ),
  (
    'Premium Yearly',
    'premium',
    990000,
    'yearly',
    '["Semua fitur Family", "Anggota keluarga unlimited", "Penyimpanan 10GB", "Analytics & reports", "Custom categories", "API access", "White-label option", "Hemat 2 bulan"]'::jsonb,
    5
  )
ON CONFLICT DO NOTHING;

-- Create trigger for updated_at on website_content
CREATE TRIGGER set_updated_at_website_content
  BEFORE UPDATE ON public.website_content
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updated_at on pricing_plans
CREATE TRIGGER set_updated_at_pricing_plans
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;
GRANT SELECT ON public.website_content TO authenticated;
GRANT SELECT ON public.pricing_plans TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.get_admin_users() IS 'Returns all users with their subscription information for admin panel - Fixed version';
COMMENT ON TABLE public.website_content IS 'Stores editable website content for admin management';
COMMENT ON TABLE public.pricing_plans IS 'Stores pricing plan information for display and management';
