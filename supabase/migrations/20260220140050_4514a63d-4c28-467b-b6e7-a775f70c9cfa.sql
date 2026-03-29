
-- Fix: Enable RLS on user_roles_legacy table
ALTER TABLE public.user_roles_legacy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view legacy roles" ON public.user_roles_legacy FOR SELECT USING (is_admin(auth.uid()));
