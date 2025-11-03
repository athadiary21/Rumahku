-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'child');

-- Create enum for subscription tiers
CREATE TYPE public.subscription_tier AS ENUM ('free', 'family', 'premium');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table (CRITICAL: separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create family_groups table
CREATE TABLE public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create family_members table
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Create subscription_tiers table
CREATE TABLE public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_budget_categories INTEGER,
  max_accounts INTEGER,
  max_wallets INTEGER,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default subscription tiers
INSERT INTO public.subscription_tiers (tier, name, price_monthly, price_yearly, max_budget_categories, max_accounts, max_wallets, features) VALUES
('free', 'Free', 0, 0, 3, 1, 1, '["Kalender Keluarga Dasar", "Daftar Belanja Manual", "3 Kategori Budget", "1 Akun Bank"]'::jsonb),
('family', 'Family', 49000, 490000, NULL, NULL, NULL, '["Semua Fitur Free", "Unlimited Kategori Budget", "Unlimited Akun & Wallet", "Resep & Meal Planning", "Vault Digital", "Kolaborasi Multi-User"]'::jsonb),
('premium', 'Premium', 99000, 990000, NULL, NULL, NULL, '["Semua Fitur Family", "Analytics & Reports", "Kategori Custom", "Priority Support", "Export Data"]'::jsonb);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create security definer function to check if user is in family
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE user_id = _user_id AND family_id = _family_id
  )
$$;

-- Create security definer function to get user's family role
CREATE OR REPLACE FUNCTION public.get_family_role(_user_id UUID, _family_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.family_members
  WHERE user_id = _user_id AND family_id = _family_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for family_groups
CREATE POLICY "Family members can view their family groups"
  ON public.family_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create family groups"
  ON public.family_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family admins can update family groups"
  ON public.family_groups FOR UPDATE
  USING (
    public.get_family_role(auth.uid(), id) = 'admin'
  );

-- RLS Policies for family_members
CREATE POLICY "Family members can view their family members"
  ON public.family_members FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can insert members"
  ON public.family_members FOR INSERT
  WITH CHECK (public.get_family_role(auth.uid(), family_id) = 'admin');

CREATE POLICY "Family admins can update members"
  ON public.family_members FOR UPDATE
  USING (public.get_family_role(auth.uid(), family_id) = 'admin');

CREATE POLICY "Family admins can delete members"
  ON public.family_members FOR DELETE
  USING (public.get_family_role(auth.uid(), family_id) = 'admin');

-- RLS Policies for subscription_tiers (public read)
CREATE POLICY "Anyone can view subscription tiers"
  ON public.subscription_tiers FOR SELECT
  USING (true);

-- RLS Policies for subscriptions
CREATE POLICY "Family members can view their subscription"
  ON public.subscriptions FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can update subscription"
  ON public.subscriptions FOR UPDATE
  USING (public.get_family_role(auth.uid(), family_id) = 'admin');

-- Create function to handle new user signup
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
  
  -- Add user as admin of their family
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (new_family_id, NEW.id, 'admin');
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  -- Create free subscription
  INSERT INTO public.subscriptions (family_id, tier)
  VALUES (new_family_id, 'free');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.family_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();