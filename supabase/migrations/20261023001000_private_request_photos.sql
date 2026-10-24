-- Photos sent through the public sell form can show number plates, faces or a home. They now
-- land in a private bucket; only admins can view them (signed links), and they are copied to
-- the public car-photos bucket only when the admin turns the request into a listing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-photos', 'request-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "admins read request photos" on storage.objects for select to authenticated
  using (bucket_id = 'request-photos' and public.is_admin());
create policy "admins delete request photos" on storage.objects for delete to authenticated
  using (bucket_id = 'request-photos' and public.is_admin());
-- No insert policy: sellers upload only through one-time signed links the server hands out.
