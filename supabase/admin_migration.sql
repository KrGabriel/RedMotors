-- Ejecutar DESPUÉS de schema.sql. Se puede volver a ejecutar sin problemas.
create or replace function public.is_admin() returns boolean language sql security definer stable set search_path=public as $$select exists(select 1 from public.admin_users where user_id=auth.uid())$$;
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
drop trigger if exists vehicles_touch on public.vehicles;
create trigger vehicles_touch before update on public.vehicles for each row execute function public.touch_updated_at();
create index if not exists photos_vehicle_pos on public.vehicle_photos(vehicle_id,position);
-- Bucket: público para lectura, 5 MB y solo imágenes
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vehicle-photos','vehicle-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "fotos lectura publica" on storage.objects;
drop policy if exists "fotos admin insert" on storage.objects;
drop policy if exists "fotos admin update" on storage.objects;
drop policy if exists "fotos admin delete" on storage.objects;
create policy "fotos lectura publica" on storage.objects for select using(bucket_id='vehicle-photos');
create policy "fotos admin insert" on storage.objects for insert to authenticated with check(bucket_id='vehicle-photos' and public.is_admin());
create policy "fotos admin update" on storage.objects for update to authenticated using(bucket_id='vehicle-photos' and public.is_admin()) with check(bucket_id='vehicle-photos' and public.is_admin());
create policy "fotos admin delete" on storage.objects for delete to authenticated using(bucket_id='vehicle-photos' and public.is_admin());
