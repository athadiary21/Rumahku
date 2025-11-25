-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_id UUID,
  amount NUMERIC NOT NULL,
  original_amount NUMERIC NOT NULL,
  discount_amount NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  payment_method TEXT NOT NULL, -- 'midtrans', 'xendit', 'stripe'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
  tier TEXT NOT NULL, -- 'free', 'family', 'premium'
  billing_period TEXT, -- 'monthly', 'yearly'
  promo_code_id UUID REFERENCES public.promo_codes(id),
  gateway_transaction_id TEXT, -- External payment gateway transaction ID
  gateway_response JSONB, -- Full response from payment gateway
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add foreign key to family_groups
ALTER TABLE public.payment_transactions
ADD CONSTRAINT payment_transactions_family_id_fkey 
FOREIGN KEY (family_id) REFERENCES public.family_groups(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_family_id ON public.payment_transactions(family_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON public.payment_transactions(created_at DESC);
CREATE INDEX idx_payment_transactions_gateway_id ON public.payment_transactions(gateway_transaction_id);

-- Enable Row Level Security
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.payment_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can view their family's transactions
CREATE POLICY "Family members can view family transactions"
ON public.payment_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members
    WHERE family_members.family_id = payment_transactions.family_id
    AND family_members.user_id = auth.uid()
  )
);

-- RLS Policy: Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.payment_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policy: Service role can insert transactions (for edge functions)
CREATE POLICY "Service role can insert transactions"
ON public.payment_transactions
FOR INSERT
WITH CHECK (true);

-- RLS Policy: Service role can update transactions (for webhooks)
CREATE POLICY "Service role can update transactions"
ON public.payment_transactions
FOR UPDATE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create function to get payment transaction statistics
CREATE OR REPLACE FUNCTION public.get_payment_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  total_transactions BIGINT,
  completed_transactions BIGINT,
  pending_transactions BIGINT,
  failed_transactions BIGINT,
  total_revenue NUMERIC,
  average_transaction NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_transactions,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_transactions,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_transactions,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_transactions,
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
    COALESCE(AVG(amount) FILTER (WHERE status = 'completed'), 0) as average_transaction
  FROM public.payment_transactions
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL;
END;
$$;

-- Create promo_code_usage table to track promo code usage
CREATE TABLE IF NOT EXISTS public.promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  discount_amount NUMERIC NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for promo_code_usage
CREATE INDEX idx_promo_code_usage_promo_code_id ON public.promo_code_usage(promo_code_id);
CREATE INDEX idx_promo_code_usage_user_id ON public.promo_code_usage(user_id);
CREATE INDEX idx_promo_code_usage_used_at ON public.promo_code_usage(used_at DESC);

-- Enable RLS for promo_code_usage
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own promo code usage
CREATE POLICY "Users can view their promo code usage"
ON public.promo_code_usage
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all promo code usage
CREATE POLICY "Admins can view all promo code usage"
ON public.promo_code_usage
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policy: Service role can insert promo code usage
CREATE POLICY "Service role can insert promo usage"
ON public.promo_code_usage
FOR INSERT
WITH CHECK (true);

-- Create function to increment promo code usage
CREATE OR REPLACE FUNCTION public.increment_promo_usage(promo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = promo_id;
END;
$$;