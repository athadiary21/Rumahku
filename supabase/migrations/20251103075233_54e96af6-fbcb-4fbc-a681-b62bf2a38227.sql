-- Create Finance module tables
CREATE TYPE public.account_type AS ENUM ('bank', 'cash', 'ewallet', 'investment');
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense', 'transfer');

CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  monthly_limit DECIMAL(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  budget_category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  deadline DATE,
  icon TEXT,
  color TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts
CREATE POLICY "Family members can view accounts"
  ON public.accounts FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can insert accounts"
  ON public.accounts FOR INSERT
  WITH CHECK (public.get_family_role(auth.uid(), family_id) IN ('admin', 'member'));

CREATE POLICY "Family admins can update accounts"
  ON public.accounts FOR UPDATE
  USING (public.get_family_role(auth.uid(), family_id) IN ('admin', 'member'));

CREATE POLICY "Family admins can delete accounts"
  ON public.accounts FOR DELETE
  USING (public.get_family_role(auth.uid(), family_id) = 'admin');

-- RLS Policies for budget_categories
CREATE POLICY "Family members can view budget categories"
  ON public.budget_categories FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family admins can insert budget categories"
  ON public.budget_categories FOR INSERT
  WITH CHECK (public.get_family_role(auth.uid(), family_id) = 'admin');

CREATE POLICY "Family admins can update budget categories"
  ON public.budget_categories FOR UPDATE
  USING (public.get_family_role(auth.uid(), family_id) = 'admin');

CREATE POLICY "Family admins can delete budget categories"
  ON public.budget_categories FOR DELETE
  USING (public.get_family_role(auth.uid(), family_id) = 'admin');

-- RLS Policies for transactions
CREATE POLICY "Family members can view transactions"
  ON public.transactions FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);

CREATE POLICY "Transaction creators can update their transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Transaction creators and admins can delete transactions"
  ON public.transactions FOR DELETE
  USING (
    auth.uid() = created_by OR 
    public.get_family_role(auth.uid(), family_id) = 'admin'
  );

-- RLS Policies for financial_goals
CREATE POLICY "Family members can view financial goals"
  ON public.financial_goals FOR SELECT
  USING (public.is_family_member(auth.uid(), family_id));

CREATE POLICY "Family members can insert financial goals"
  ON public.financial_goals FOR INSERT
  WITH CHECK (public.is_family_member(auth.uid(), family_id) AND auth.uid() = created_by);

CREATE POLICY "Goal creators can update their goals"
  ON public.financial_goals FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Goal creators and admins can delete goals"
  ON public.financial_goals FOR DELETE
  USING (
    auth.uid() = created_by OR 
    public.get_family_role(auth.uid(), family_id) = 'admin'
  );

-- Triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();