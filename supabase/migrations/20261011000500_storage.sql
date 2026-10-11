-- 20261011000500_storage.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 2097152, array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

create policy menu_images_staff_read   on storage.objects for select to authenticated
  using (bucket_id = 'menu-images' and (select private.is_staff()));
create policy menu_images_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and (select private.is_staff()));
create policy menu_images_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and (select private.is_staff()))
  with check (bucket_id = 'menu-images' and (select private.is_staff()));
create policy menu_images_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and (select private.is_staff()));
