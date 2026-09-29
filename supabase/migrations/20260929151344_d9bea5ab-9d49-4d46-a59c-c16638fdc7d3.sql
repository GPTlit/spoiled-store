revoke execute on function public.grant_admin_for_owner() from public, anon, authenticated;
create policy "store files readable" on storage.objects for select using (bucket_id = 'store');
create policy "admin upload store" on storage.objects for insert to authenticated with check (bucket_id = 'store' and public.has_role(auth.uid(),'admin'));
create policy "admin update store" on storage.objects for update to authenticated using (bucket_id = 'store' and public.has_role(auth.uid(),'admin'));
create policy "admin delete store" on storage.objects for delete to authenticated using (bucket_id = 'store' and public.has_role(auth.uid(),'admin'));