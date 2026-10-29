-- Migración incremental (no reemplaza schema.sql ni las anteriores). Se puede ejecutar más de una vez.
alter table public.vehicle_photos add column if not exists thumb_url text;
