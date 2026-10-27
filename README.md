# Catálogo de autos
1. Creá un proyecto en supabase.com y ejecutá `supabase/schema.sql` en el SQL Editor.
2. Creá el bucket público `vehicle-photos` en Storage.
3. `cp .env.example .env` y completá URL y clave anon (Project Settings > API).
4. `npm install && npm run dev`. Para publicar: `npm run build` y subir `dist/` a Netlify/Vercel/Cloudflare Pages con las mismas variables.
5. Nombre, WhatsApp, Instagram, ubicación y color de acento están en la tabla `settings`.
