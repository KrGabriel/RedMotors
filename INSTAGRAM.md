# Integración con Instagram — guía

## Qué API usa y por qué
**Instagram API with Instagram Login** (Business Login for Instagram). Es el flujo oficial para leer las publicaciones de tu propia cuenta profesional.
- Permiso: `instagram_business_basic`.
- **No hace falta una página de Facebook** con este flujo.
- Token: el código de autorización se canjea por un token de 1 hora y luego por uno de **60 días**, renovable (la función lo renueva sola al sincronizar si faltan menos de 15 días).
- Publicaciones: `GET /me/media` con paginación, e incluye los hijos de los álbumes (`children`).
- Limitaciones: los videos y reels solo traen miniatura (solo se importan imágenes). Meta puede omitir `media_url` en algunos casos. No hay garantía de que la API devuelva *todo* el historial: lo que devuelva se verá en el panel con su cantidad. Las URLs de imagen de Instagram caducan, por eso la función **descarga y guarda las fotos en tu bucket** al importar.

## Lo que tenés que hacer en Meta (solo vos)
1. Tu cuenta de Instagram debe ser **profesional** (empresa o creador): Instagram > Ajustes > Tipo de cuenta.
2. En developers.facebook.com crear una app, tipo **Business**.
3. En la app: agregar el producto **Instagram** > "API setup with Instagram login". Copiar el **Instagram App ID** y el **Instagram app secret** (no son los de la app de Meta en general).
4. En "Business login settings" > **OAuth redirect URIs**, agregar exactamente: `https://TU-PROYECTO.supabase.co/functions/v1/instagram`
5. Con la app en modo desarrollo: App roles > Roles > agregar tu cuenta de Instagram como **Instagram Tester** y aceptar la invitación en Instagram (Ajustes > Apps y sitios web).
6. Revisión de la app: para usar solo tu propia cuenta en modo desarrollo no debería hacer falta. No lo pude comprobar; confirmalo en tu panel de Meta.

## Despliegue (una vez)
1. Ejecutar `supabase/instagram_migration.sql` en el SQL Editor (después de las otras dos).
2. Con la CLI de Supabase: `supabase link --project-ref TU-REF`
3. Secretos:
   `supabase secrets set IG_APP_ID=... IG_APP_SECRET=... SITE_URL=https://tu-dominio STATE_SECRET=$(openssl rand -hex 32) CRON_SECRET=$(openssl rand -hex 32)`
4. `supabase functions deploy instagram --no-verify-jwt`
   (la función valida por sí misma el JWT de administrador; Meta necesita llamar sin JWT al volver de la autorización).

## Uso
Panel > **Instagram** > *Conectar cuenta* > autorizar > *Sincronizar ahora* > filtro "Por revisar" > *Revisar e importar*: marcás fotos, completás marca/modelo/año (obligatorios, Instagram no los informa) o asociás a un vehículo existente. Se crea **borrador sin publicar**. Después lo publicás desde Inventario.

## Sincronización programada (opcional)
En el SQL Editor (reemplazá los valores):
```sql
create extension if not exists pg_cron; create extension if not exists pg_net;
select cron.schedule('instagram-sync','0 */6 * * *',$$select net.http_post(
 url:='https://TU-PROYECTO.supabase.co/functions/v1/instagram',
 headers:='{"Content-Type":"application/json","x-cron-secret":"TU_CRON_SECRET"}'::jsonb,
 body:='{"action":"sync"}'::jsonb)$$);
```
La sincronización solo **detecta** publicaciones nuevas y marca cambios; nunca modifica ni borra vehículos.
