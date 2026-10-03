# Patacerca · Landing

Landing page de Patacerca (paseadores verificados en Cochabamba). Sitio estático: HTML, CSS y JavaScript sin paso de build.

- `index.html` — contenido de la página
- `styles.css` — estilos
- `app.js` — preguntas frecuentes, formularios en 2 pasos, medición
- `img/` — fotos

## Ver en local

```sh
python3 -m http.server 8000
```

## Antes de publicar

- **Registros:** hoy se guardan solo en el navegador (`localStorage`). Define `LEADS_ENDPOINT` al inicio de `app.js` para enviarlos por POST (JSON) a un servicio de formularios o una hoja de cálculo.
- **Enlaces provisionales:** número de WhatsApp (`59170000000`) e Instagram en `index.html`, y el grupo de la comunidad (`COMMUNITY_URL` en `app.js`).
- **Analítica:** añade el código de Google Analytics, Plausible o el píxel de Meta en `index.html`. Los eventos (`page_view`, `cta_click`, `form_start`, `form_step`, `form_submit`, `join_group`, `share_click`) ya se envían a `dataLayer`, `gtag`, `plausible` y `fbq` si están presentes.
