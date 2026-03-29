
-- Fix privilege escalation: restrict user_roles write to super_admin only
DROP POLICY IF EXISTS "Admins manage user roles" ON public.user_roles;

-- Super admins can do everything on user_roles
CREATE POLICY "Super admins manage user roles" ON public.user_roles
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Admins can read user_roles (needed for role display)
CREATE POLICY "Admins can read user roles" ON public.user_roles
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Users can read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);
