DROP POLICY IF EXISTS "feedback public" ON public.feedback;
CREATE POLICY "feedback on published apps readable" ON public.feedback
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.apps a WHERE a.id = feedback.app_id AND a.published = true)
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "store files readable" ON storage.objects;
CREATE POLICY "admin read store" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'store' AND public.has_role(auth.uid(), 'admin'::app_role));