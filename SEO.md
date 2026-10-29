# SEO, vista previa al compartir y dominio

## Qué hace
`netlify/edge-functions/seo.ts` agrega a cada ficha (`/vehiculos/...`) y al inicio: título, descripción, URL canónica, vista previa para WhatsApp/Facebook (Open Graph, con la primera foto) y datos estructurados de vehículo con los datos reales de la ficha. También sirve `/robots.txt` y `/sitemap.xml` (con los vehículos publicados). Usa la dirección con la que se visita el sitio, así que funciona igual con `redmotors.netlify.app` o con tu dominio propio.

## Variables en Netlify (Site configuration > Environment variables)
Crear `SUPABASE_URL` y `SUPABASE_ANON_KEY` (los mismos valores públicos que ya usás en `VITE_...`, nunca la clave service_role). Si `/sitemap.xml` sale vacío, revisá que el alcance (scope) de la variable incluya **Functions**. Después hacer un deploy.

## Cómo comprobar tras publicar
1. `https://TU-SITIO/robots.txt` y `https://TU-SITIO/sitemap.xml` deben mostrar el texto y la lista de autos.
2. Enviá el enlace de una ficha a tu propio WhatsApp: debe aparecer con foto, título y precio. (WhatsApp guarda en caché; si ya habías compartido ese enlace, probá con otra ficha.)
3. Search Console (search.google.com/search-console): agregar el sitio y enviar `/sitemap.xml`. La prueba de resultados enriquecidos de Google sirve para validar los datos estructurados.

## Dominio propio
1. Comprar el dominio en un registrador.
2. Netlify > Domain management > Add a domain, y seguir las instrucciones de DNS.
3. Actualizar en Supabase el secreto `SITE_URL` de la función `instagram` (`supabase secrets set SITE_URL=https://tu-dominio`), sin barra final, y volver a conectar o probar el retorno desde Instagram.
4. En Search Console, agregar el dominio nuevo y enviar el sitemap de nuevo.
