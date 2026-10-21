# Casa Xololo — sitio web

Sitio estático bilingüe (español e inglés), listo para subir a un alojamiento de archivos estáticos. No requiere compilación, API ni instalación de paquetes.

## Verlo localmente

En esta carpeta ejecuta `python3 -m http.server 8080` y abre `http://localhost:8080`.

## Antes de publicar

1. Confirma con Alex que el WhatsApp público `+43 664 8916288` y el correo `Alexandra.ebner@gmx.biz` son los contactos para reservas. Se configuran en `js/config.js` y aparecen en la web. Si cambian, actualiza también los enlaces visibles en `index.html` y los textos de `js/content.js`.
2. Comprueba las fotos y el permiso de uso con Alex. Son las imágenes incluidas en el ZIP entregado; este rediseño usa los originales de 1600 px en las vistas grandes y sirve tamaños responsivos. Sustituye las imágenes con originales de más resolución cuando el fotógrafo los comparta.
3. Revisa los detalles de alojamiento, capacidad y loft frente a la ficha de Airbnb actual antes de publicar. La web solicita fechas por mensaje; no confirma precio ni disponibilidad de forma automática.
4. El logo enviado en el chat se incorporó como recurso transparente. Para una reproducción perfecta en todos los tamaños, sustituye `img/casa-xololo-logo.png` por el archivo vectorial o PNG original de la marca cuando esté disponible.
5. Las etiquetas canónica, `og:url` y `og:image` apuntan a GitHub Pages. Si se conecta un dominio propio, actualiza esas tres URLs en `index.html`.

## Editar

- Textos: `js/content.js`, objetos `es` y `en`. Cada clave se usa en `index.html` con `data-i18n` y variantes.
- Estilos: `css/styles.css` (base y hero), `css/experience.css` (nuevas capas y movimiento). Interacciones y animaciones: `js/main.js`.
- Fotos: `img/`. La web utiliza WebP de 800 y 1600 px; para fondos en pantalla grande, conviene mantener al menos 1600 px.
- Destino de contacto y origen: `js/config.js`. Los enlaces compartidos con `?utm_source=instagram`, `?utm_source=facebook` o `?utm_source=bio` añaden el origen al mensaje para atribuir consultas.
- Las tipografías locales están en `fonts/`; sus licencias OFL también están en esa carpeta.

## Funciones

El recorrido de fotografías responde al desplazamiento y tiene navegación directa por capítulos. La segunda edición añade transiciones de cámara entre escenas, fotografía a pantalla completa, parallax en otras secciones, una barra de progreso, acceso rápido a la consulta y función para compartir el enlace. El menú entra y sale con animaciones escalonadas; en móvil, la galería ofrece fotos grandes que se deslizan con gestos o flechas y muestra un contador. También hay galería filtrable con visor y teclado, contenido bilingüe, guía de dos playas, preguntas frecuentes y formulario que construye la consulta con fechas y huéspedes. La animación se reduce automáticamente si el visitante prefiere menos movimiento. Hay una versión legible de la página incluso si JavaScript está desactivado.

No había video de la casa entre los materiales proporcionados. El recorrido usa exclusivamente fotografías reales y movimiento controlado por scroll. Para añadir video más adelante, pide al fotógrafo un clip horizontal estabilizado de la llegada, sala y terraza; conviene servirlo en MP4/WebM con una imagen de respaldo y respetar la preferencia de movimiento reducido.

## Publicación

Sube el contenido completo de esta carpeta a Netlify, Cloudflare Pages o cualquier servidor estático. Prueba la versión publicada en móvil y verifica el número de WhatsApp antes de compartirla.

`PROMPT.md` es el documento original incluido en el ZIP de entrada; se conserva como referencia histórica, pero esta documentación describe la implementación actual.
