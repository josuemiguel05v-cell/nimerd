# Nime RD — Cloudflare Workers

Subir el contenido de esta carpeta a la raíz de la rama cloudflare-aurora. No subir el ZIP como archivo único.

En Cloudflare, seleccionar el Worker existente nimerd > Configuración > Builds > Conectar. Repositorio nimerd; rama de producción cloudflare-aurora; directorio raíz /; comando de compilación vacío; comando de implementación inicial: npx wrangler versions upload (no activa producción). Probar la versión antes de promoverla. Para activar despliegues automáticos posteriores, usar npx wrangler deploy.

Configurar ANIMEDOC_API_KEY como secreto en Cloudflare, nunca en GitHub. Confirmar plan, derechos de integración, límites y reproducción real antes de publicar. No se ha verificado la reproducción comercial.

Prueba de backend: node tests/test_worker.mjs (respuestas simuladas).
