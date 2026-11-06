# Renta Global SRL · web del mercado en vivo

Sitio estático (HTML, CSS y JavaScript sin dependencias) publicado en GitHub Pages:
https://flerda2004-alt.github.io/rentaglobal/

## Cómo se actualiza

**En el navegador del cliente, en vivo** (sin recargar la página):

| Dato | Fuente | Cada cuánto |
|---|---|---|
| Dólares (MEP, CCL, blue, oficial, mayorista, cripto, tarjeta) | DolarApi | 1 minuto |
| CEDEARs y acciones (suben, bajan, más operados) | Data912 (BYMA) | 30 s con el mercado abierto, 5 min cerrado |
| Bandas cambiarias y mayorista | API del BCRA | 10 minutos |
| Riesgo país | ArgentinaDatos | 10 minutos |
| Fondos, historia, inflación, reservas, tasas | `data/snapshot.json` | 10 minutos |

Las consultas se pausan cuando la pestaña no está visible y se ponen al día al volver.

**En GitHub Actions** (`.github/workflows/publicar.yml`), el script `scripts/actualizar_datos.py`
arma `data/snapshot.json` con lo que el navegador no puede pedir directo (los fondos de Cocos,
la CAFCI, la historia de los dólares y las variables del BCRA) y publica el sitio:

- cada 30 minutos de lunes a viernes, de 10 a 20 h (hora argentina);
- dos veces por día el resto del tiempo;
- a mano desde la pestaña *Actions* → *Publicar* → *Run workflow*.

Si una fuente falla, se conserva el último dato bueno.

## Rendimientos de los fondos

Todos se calculan igual, sobre el valor de cuotaparte clase A:
rendimiento del período `r = VCP final / VCP inicial − 1`, `TNA = r × 365 / días` y
`TEA = (1 + r)^(365 / días) − 1`. Los de Cocos salen de la API pública de cocos.capital;
Pionero (Macro) y Super Ahorro (Santander) de la CAFCI, vía ArgentinaDatos.

## Qué se puede editar

`assets/js/config.js`:

- `matriculaCNV`: número de registro como Agente Productor (aparece en el pie).
- `links`: enlaces a Cocos (por ejemplo, un link de referido para abrir cuenta).
- `refresco`: cada cuánto se consulta cada fuente.

Los fondos que se comparan están en `FONDOS`, al principio de `scripts/actualizar_datos.py`.

## Logo

En `brand/` está el logo redibujado en vectores (SVG), en versiones vertical, horizontal e ícono,
para fondo claro, oscuro y en blanco. `brand/generar_logo.py` los regenera.
