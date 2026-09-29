CREATE TABLE public.developers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  contact_email text,
  status text NOT NULL DEFAULT 'pending',
  plan text NOT NULL DEFAULT 'dev-monthly-4.99',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.developers TO authenticated;
GRANT SELECT ON public.developers TO anon;
GRANT ALL ON public.developers TO service_role;
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active developers visible" ON public.developers FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY "own developer row visible" ON public.developers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "request developer access" ON public.developers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND char_length(display_name) BETWEEN 1 AND 60);
CREATE POLICY "admin manages developers" ON public.developers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_active_developer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.developers WHERE user_id = _user_id AND status = 'active')
$$;

CREATE TABLE public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  cover_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO authenticated;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published news public" ON public.news FOR SELECT TO anon, authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert news" ON public.news FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update news" ON public.news FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete news" ON public.news FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.apps ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "developers create own apps" ON public.apps FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND published = false AND public.is_active_developer(auth.uid()));
CREATE POLICY "developers see own apps" ON public.apps FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "developers edit own drafts" ON public.apps FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND published = false AND public.is_active_developer(auth.uid()))
  WITH CHECK (owner_id = auth.uid() AND published = false);