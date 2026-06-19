/*
  # Namespace vote admin objects

  This app may share a Supabase project with other apps. Keep vote-specific
  admin state and helper functions separate from other applications.
*/

CREATE TABLE IF NOT EXISTS public.vote_admin_users (
  email text PRIMARY KEY CHECK (email = lower(trim(email)) AND position('@' in email) > 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

INSERT INTO public.vote_admin_users (email, created_at, created_by)
SELECT email, created_at, created_by
FROM public.admin_users
ON CONFLICT (email) DO NOTHING;

ALTER TABLE public.vote_admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.vote_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'vote_admin'
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'vote_admin', '') = 'true'
    OR EXISTS (
      SELECT 1
      FROM public.vote_admin_users au
      WHERE au.email = lower(COALESCE(auth.jwt() ->> 'email', ''))
    );
$$;

CREATE OR REPLACE FUNCTION public.vote_has_admins()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.vote_admin_users);
$$;

DROP POLICY IF EXISTS "Vote admins can read admin users" ON public.vote_admin_users;
DROP POLICY IF EXISTS "Vote admins can create admin users" ON public.vote_admin_users;
DROP POLICY IF EXISTS "First vote user can claim admin" ON public.vote_admin_users;

CREATE POLICY "Vote admins can read admin users"
  ON public.vote_admin_users FOR SELECT
  TO authenticated
  USING (public.vote_is_admin());

CREATE POLICY "Vote admins can create admin users"
  ON public.vote_admin_users FOR INSERT
  TO authenticated
  WITH CHECK (public.vote_is_admin());

CREATE POLICY "First vote user can claim admin"
  ON public.vote_admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.vote_has_admins()
    AND email = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Only admins can read votes" ON votes;
DROP POLICY IF EXISTS "Only vote admins can read votes" ON votes;

CREATE POLICY "Only vote admins can read votes"
  ON votes FOR SELECT
  TO authenticated
  USING (public.vote_is_admin());
