-- Add RLS policy for admin to view all subscriptions

-- Allow admins to view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admins to update any subscription
CREATE POLICY "Admins can update any subscription"
  ON public.subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admins to insert subscriptions
CREATE POLICY "Admins can insert subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admins to delete subscriptions
CREATE POLICY "Admins can delete subscriptions"
  ON public.subscriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

COMMENT ON POLICY "Admins can view all subscriptions" ON public.subscriptions IS 'Allows admin users to view all subscriptions in the system';
COMMENT ON POLICY "Admins can update any subscription" ON public.subscriptions IS 'Allows admin users to update any subscription';
COMMENT ON POLICY "Admins can insert subscriptions" ON public.subscriptions IS 'Allows admin users to create new subscriptions';
COMMENT ON POLICY "Admins can delete subscriptions" ON public.subscriptions IS 'Allows admin users to delete subscriptions';
