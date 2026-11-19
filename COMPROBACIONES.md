# Nime RD · Comprobaciones de la entrega

Fecha de revisión: 19 de noviembre de 2026.

## Confirmado mediante pruebas locales

- Sintaxis de los scripts JS, estructura HTML, enlaces a recursos internos y JSON válidos.
- Renderizado de la portada en navegador Chromium con la API simulada sin conexión: las 10 tarjetas ficticias aparecen identificadas en modo demostración, sin errores de JavaScript.
- Navegación por Inicio, Explorar, En emisión, Calendario y Mi lista.
- Apertura de ficha con acciones de favoritos, compartir y enlaces oficiales cuando existan.
- Búsqueda, clasificación y paginación con respuestas simuladas de la API.
- Importación y exportación de la biblioteca (formato JSON), edición/importación/exportación de streams.json, apertura del reproductor con vídeo configurado y archivo MP4 de prueba comprobado con ffprobe. La reproducción real desde un hosting no fue ensayada.
- Página de privacidad, editor local de episodios, estructura del service worker y manifest de instalación (validados de forma estática; instalación PWA real no verificada).

## Dependencias externas que no se pudieron validar de extremo a extremo aquí

- Conexión real desde un navegador del usuario a AniList (la red de prueba restringe conexiones a internet). Se consultó la documentación oficial sobre GraphQL y campos utilizados.
- Tráileres de YouTube, disponibilidad real de enlaces de reproducción y reproducción HLS desde un CDN del propietario; dependen de los permisos de cada servicio y de CORS.
- Publicación en un dominio/hosting concreto (no se proporcionó acceso al alojamiento).

## Limitaciones reales

- No incluye episodios de anime comercial, licencias para alojarlos ni servidores de streaming de terceros sin autorización. El MP4 que se incluye es un clip original de **prueba**, disponible al entrar en la ficha ficticia *Eclipse Rising* cuando se active el modo demostración.
- Las sinopsis de AniList suelen venir en inglés; interfaz y horarios localizados a español/República Dominicana.
- Los favoritos viven en el dispositivo del visitante; no hay cuentas ni sincronización en la nube (se puede exportar/importar la lista).
- El contenido original de AniList, los pósteres, enlaces y horarios están sujetos a su disponibilidad y condiciones de uso. Revisar términos antes de monetizar.
