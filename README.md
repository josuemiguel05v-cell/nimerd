# NIME RD · Portal de anime (versión completa, 19-11-2026)

Nime RD es un portal responsive de descubrimiento de anime con estética morado oscuro, implementado en HTML, CSS y JavaScript. Está **preparado para publicar como sitio estático**: no necesita instalar Node.js, crear una base de datos o comprar una API.

## Qué contiene

- Inicio con cabecera destacada y carruseles de tendencias y temporada.
- Catálogo online de AniList (GraphQL), búsqueda, géneros, ordenación y más resultados.
- Sección En emisión y calendario de próximos siete días en la hora de Santo Domingo (UTC-4).
- Fichas de anime: sinopsis, géneros, puntuación, episodios, tráiler (cuando esté disponible), ficha AniList y enlaces a plataformas legales.
- Lista de favoritos guardada localmente, con búsqueda, exportación e importación de un archivo `NimeRD-MiLista.json`.
- Reproductor MP4/WebM/HLS para archivos que tengas autorizados; HLS usa hls.js solo cuando el navegador lo requiere.
- Modo de demostración con títulos **ficticios claramente identificados** si falla AniList, e incluye un MP4 original de prueba de 4 segundos.
- Manifest para instalar como app web, caché del sitio (service worker), favicon, íconos, página de privacidad, página 404 y configuración Netlify.
- Editor visual `editor-episodios.html` para preparar el archivo de vídeos sin escribir código.

## Publicar (pasos mínimos)

1. Descomprime el ZIP y abre la carpeta `Nime-RD-Completo`.
2. Sube **todos sus archivos y subcarpetas** a tu hosting. Ejemplo: arrastra esa carpeta a https://app.netlify.com/drop (Netlify Drop), o copia su contenido a `public_html` en un cPanel. 
3. La entrada principal es `index.html`. No configures comandos de compilación ni necesitas instalar dependencias.
4. Entra en la URL pública y prueba el catálogo, favoritos y calendario. Si AniList falla temporalmente, aparecerá una advertencia explícita y un catálogo **ficticio** como respaldo.

En Netlify, la configuración `netlify.toml` ya trae el directorio de publicación y algunas cabeceras básicas. El sitio también sirve en Cloudflare Pages, GitHub Pages o alojamiento estático convencional. Un dominio propio es opcional.

Para probarlo en tu PC: abre una terminal en la carpeta y ejecuta `python -m http.server 8000` o `npx serve .`, luego visita `http://localhost:8000`. La app no debe abrirse con doble clic desde `file://` porque algunas funciones requieren un servidor.

## Configurar episodios propios / autorizados

El catálogo AniList proporciona **metadatos**, no los archivos de vídeo comerciales. El portal permite abrir distribuidores oficiales indicados por AniList, pero **no concede ni obtiene licencias ni elimina bloqueos de región**. Si deseas reproducir tus propios vídeos autorizados:

1. Abre `editor-episodios.html` en el navegador (preferible mediante el servidor local de arriba).
2. Importa `data/streams.json` si quieres conservar la configuración; el valor inicial contiene solo una prueba de vídeo original de Nime RD, asociada a un título ficticio.
3. Busca el ID real de la serie en su URL de AniList (`https://anilist.co/anime/ID`). Rellena el número, formato y dirección HTTPS de un vídeo que tengas permiso de distribuir. Debe funcionar desde el navegador y permitir las peticiones CORS correspondientes.
4. Descarga el archivo `streams.json` y reemplaza **`data/streams.json`** en tu hosting. No basta con pulsar el botón del editor: no modifica archivos del servidor.
5. Abre la ficha de esa serie en Nime RD y aparecerá el episodio en su reproductor.

Ejemplo de archivo:

```json
{
  "12345": [
    {
      "number": 1,
      "title": "Episodio de ejemplo",
      "type": "mp4",
      "url": "https://tu-servidor-autorizado.example/videos/episodio-1.mp4",
      "poster": "https://tu-servidor-autorizado.example/portada.jpg",
      "subtitles": [
        {"lang": "es", "label": "Español", "url": "https://tu-servidor-autorizado.example/subtitulos/episodio-1.vtt"}
      ]
    }
  ]
}
```

Reemplaza el ID y los enlaces `.example` por los reales. Si necesitas vídeo HLS, usa `"type": "hls"` y una URL `m3u8` HTTPS; el hosting debe exponer los segmentos y manifiestos con los tipos MIME/CORS correctos.

**No uses** enlaces a material que no te pertenezca sin autorización ni claves API secretas en el frontend. No se incluye un panel de control remoto porque un sitio estático sin backend no puede guardar nuevos episodios en el servidor de forma segura.

## Modificar diseño

- `index.html` — texto, navegación y estructura.
- `assets/css/styles.css` — colores y estilos; principal morado.
- `assets/js/app.js` — interacción, favoritos, calendario y reproductor.
- `assets/js/api.js` — solicitudes a AniList, caché y consultas.
- `data/streams.json` — episodios configurados.
- `assets/art/` — ilustraciones SVG originales del modo demostración.
- `assets/media/prueba-reproductor.mp4` — clip original para probar el reproductor (no es un episodio de anime comercial).
- `sw.js` — cacheo de la web; usa la versión en línea primero y la copia local como respaldo; puedes aumentar su constante `CACHE` si cambias la estructura de la app.

## Aspectos que debes saber

- AniList puede limitar peticiones o cambiar sus servicios. La página informa claramente cuando ocurre y usa caché reciente cuando existe.
- La disponibilidad de proveedores oficiales en República Dominicana la decide cada distribuidor.
- Los favoritos se guardan en el navegador, no en cuentas; se pueden exportar/importar.
- Si vas a monetizar el proyecto o usarlo comercialmente, revisa primero los [términos de AniList](https://docs.anilist.co/guide/terms-of-use), licencias de imágenes y condiciones de distribuidores.
- Debes completar los datos de contacto de `privacidad.html` antes de usarlo como plataforma comercial.
- No incluye dominio, hosting contratado ni contenido de anime con derechos reservados; esos recursos no se pueden agregar sin que los aporte y autorice el titular correspondiente.

Consulta `COMPROBACIONES.md` para conocer el alcance real de las pruebas y sus limitaciones.

© 2026 Nime RD. Proyecto independiente; no afiliado a AniList.
