/*
  # Restrict admin vote reads and support first-admin setup

  Admin users are Supabase Auth users whose email exists in public.admin_users.
  The first admin may claim access when the table is empty. After that, only
  existing admins can add more admin email addresses.
*/

CREATE TABLE IF NOT EXISTS public.admin_users (
  email text PRIMARY KEY CHECK (email = lower(trim(email)) AND position('@' in email) > 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'admin', '') = 'true'
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.email = lower(COALESCE(auth.jwt() ->> 'email', ''))
    );
$$;

CREATE OR REPLACE FUNCTION public.has_admins()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users);
$$;

DROP POLICY IF EXISTS "Admins can read admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can create admin users" ON public.admin_users;
DROP POLICY IF EXISTS "First user can claim admin" ON public.admin_users;

CREATE POLICY "Admins can read admin users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can create admin users"
  ON public.admin_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "First user can claim admin"
  ON public.admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.has_admins()
    AND email = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Authenticated users can read votes" ON votes;
DROP POLICY IF EXISTS "Only admins can read votes" ON votes;

CREATE POLICY "Only admins can read votes"
  ON votes FOR SELECT
  TO authenticated
  USING (public.is_admin());
