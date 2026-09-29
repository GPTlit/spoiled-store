GRANT EXECUTE ON FUNCTION public.is_active_developer(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_active_developer(uuid) FROM anon, public;