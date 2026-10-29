# Optimización de fotos (Fases 1 y 2)
1. Ejecutar `supabase/images_migration.sql` en el SQL Editor de Supabase (agrega la columna `thumb_url`; no toca nada más).
2. Subir los cambios al repositorio (un solo commit) y esperar el deploy.
3. Panel > **Optimizar fotos** > *Procesar*. Crea una miniatura (720 px) de cada foto. En las fotos subidas a mano que sean pesadas, la web pasa a usar una versión de hasta 1600 px (WebP). Las fotos importadas de Instagram no se modifican.
4. Revisá cómo se ven los autos en la web. Si te conforma, volvé a Optimizar fotos y usá **Borrar originales reemplazados**.
5. Desde ahora, las fotos nuevas (manuales o importadas de Instagram) generan su miniatura solas.
Nota: la web pública todavía no usa las miniaturas; eso es la Fase 3.
