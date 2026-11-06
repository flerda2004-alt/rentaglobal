"""Reconstruye el logo de Renta Global SRL en vector (SVG con texto convertido a trazos).

Proporciones medidas sobre el original (640 px):
  ícono 157 px de ancho, trazo 10 px, 4 barras de 18 px que nacen del borde inferior
  wordmark: altura de mayúscula 41 px, ancho 502 px, a 28 px debajo del ícono
  bajada:   altura de mayúscula ~11,5 px, ancho 422 px, a 14 px debajo del wordmark
"""
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONTS = Path("/tmp/claude-0/fonts/node_modules/@fontsource")
SERIF = FONTS / "gilda-display/files/gilda-display-latin-400-normal.woff2"
SANS = FONTS / "montserrat/files/montserrat-latin-500-normal.woff2"
OUT = Path(__file__).parent

AZUL = "#0B5E98"      # ícono (medido: 9,97,155 / 12,93,145)
GRIS = "#46484C"      # wordmark (medido: 72,73,76)
TEAL = "#2C7A93"      # bajada (tinta fina, saturación perdida por el JPEG)


def texto_a_path(fuente: Path, texto: str, cap_objetivo: float, ancho_objetivo: float | None):
    """Devuelve (d, ancho, alto_mayuscula) con el texto convertido a trazos y escalado a la
    altura de mayúscula pedida. Si se pasa ancho_objetivo, ajusta el espaciado entre letras."""
    tt = TTFont(str(fuente))
    upem = tt["head"].unitsPerEm
    cap = getattr(tt["OS/2"], "sCapHeight", 0) or int(upem * 0.7)
    blob = hb.Blob(tt.reader.file.getvalue() if hasattr(tt.reader.file, "getvalue") else None) if False else None
    # uharfbuzz no lee woff2: se exporta a TTF en memoria
    import io
    buf = io.BytesIO(); tt.flavor = None; tt.save(buf); data = buf.getvalue()
    face = hb.Face(hb.Blob(data)); font = hb.Font(face)
    hbbuf = hb.Buffer(); hbbuf.add_str(texto); hbbuf.guess_segment_properties()
    hb.shape(font, hbbuf, {"kern": True, "liga": False})
    infos, poss = hbbuf.glyph_infos, hbbuf.glyph_positions
    escala = cap_objetivo / cap
    glyphset = TTFont(io.BytesIO(data)).getGlyphSet()
    orden = TTFont(io.BytesIO(data)).getGlyphOrder()
    avance_natural = sum(p.x_advance for p in poss)
    n = len(infos)
    tracking = 0.0
    if ancho_objetivo:
        # ancho total = (avance natural + tracking*(n-1)) * escala  (el último avance incluye su lateral derecho)
        tracking = (ancho_objetivo / escala - avance_natural) / max(n - 1, 1)
    pen = SVGPathPen(glyphset)
    x = 0.0
    for i, (inf, pos) in enumerate(zip(infos, poss)):
        nombre = orden[inf.codepoint]
        # y invertida: SVG crece hacia abajo; la línea base queda en y = cap_objetivo
        t = TransformPen(pen, (escala, 0, 0, -escala, (x + pos.x_offset) * escala, cap_objetivo))
        glyphset[nombre].draw(t)
        x += pos.x_advance + (tracking if i < n - 1 else 0)
    ancho = x * escala
    return pen.getCommands(), ancho, cap_objetivo


def icono_svg(x0: float, y0: float, lado: float, color: str) -> str:
    """Cuadrado de trazo 10/156 con cuatro barras (alturas medidas 89, 70, 42, 59 sobre 136 internos)."""
    k = lado / 156.0
    s = 10 * k
    partes = [f'<path fill="{color}" fill-rule="evenodd" d="M{x0:.3f} {y0:.3f}h{lado:.3f}v{lado:.3f}h{-lado:.3f}z'
              f'M{x0 + s:.3f} {y0 + s:.3f}v{lado - 2 * s:.3f}h{lado - 2 * s:.3f}v{-(lado - 2 * s):.3f}z"/>']
    ancho_barra, paso = 18 * k, (110 - 28) / 3 * k
    base = y0 + lado - s
    for i, alto in enumerate([89, 70, 42, 59]):
        bx = x0 + 28 * k + i * paso
        partes.append(f'<rect fill="{color}" x="{bx:.3f}" y="{base - alto * k:.3f}" width="{ancho_barra:.3f}" height="{alto * k + 0.5 * k:.3f}"/>')
    return "\n  ".join(partes)


def construir():
    # Texto en unidades del original (px del logo de 640)
    d_word, w_word, _ = texto_a_path(SERIF, "RENTA GLOBAL SRL", 41.0, 502.0)
    d_tag, w_tag, _ = texto_a_path(SANS, "ASESORAMIENTOS FINANCIEROS", 11.5, 422.0)
    lado = 157.0

    variantes = {
        "claro": {"icono": AZUL, "word": GRIS, "tag": TEAL},
        "oscuro": {"icono": "#4DA3E6", "word": "#F2F5FA", "tag": "#8EC5DA"},
        "blanco": {"icono": "#FFFFFF", "word": "#FFFFFF", "tag": "#FFFFFF"},
    }
    margen = 24.0
    for nombre, c in variantes.items():
        # Vertical (como el original)
        ancho = max(w_word, w_tag, lado) + 2 * margen
        y_icono = margen
        y_word = y_icono + lado + 28
        y_tag = y_word + 41 + 14
        alto = y_tag + 11.5 + margen
        cx = ancho / 2
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho:.1f} {alto:.1f}" role="img" aria-label="Renta Global SRL — Asesoramientos financieros">
  {icono_svg(cx - lado / 2, y_icono, lado, c["icono"])}
  <path fill="{c["word"]}" transform="translate({cx - w_word / 2:.3f} {y_word:.3f})" d="{d_word}"/>
  <path fill="{c["tag"]}" transform="translate({cx - w_tag / 2:.3f} {y_tag:.3f})" d="{d_tag}"/>
</svg>
'''
        (OUT / f"logo-vertical-{nombre}.svg").write_text(svg, encoding="utf-8")

        # Horizontal (ícono a la izquierda) para la barra de navegación
        alto_h = lado
        gap = 34.0
        bloque = 41 + 14 + 11.5
        y_txt = (alto_h - bloque) / 2
        ancho_h = lado + gap + max(w_word, w_tag) + 4
        svg_h = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho_h:.1f} {alto_h:.1f}" role="img" aria-label="Renta Global SRL — Asesoramientos financieros">
  {icono_svg(0, 0, lado, c["icono"])}
  <path fill="{c["word"]}" transform="translate({lado + gap:.3f} {y_txt:.3f})" d="{d_word}"/>
  <path fill="{c["tag"]}" transform="translate({lado + gap + (w_word - w_tag) / 2:.3f} {y_txt + 41 + 14:.3f})" d="{d_tag}"/>
</svg>
'''
        (OUT / f"logo-horizontal-{nombre}.svg").write_text(svg_h, encoding="utf-8")

        # Solo ícono
        svg_i = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {lado:.1f} {lado:.1f}" role="img" aria-label="Renta Global SRL">
  {icono_svg(0, 0, lado, c["icono"])}
</svg>
'''
        (OUT / f"icono-{nombre}.svg").write_text(svg_i, encoding="utf-8")
    print("wordmark", round(w_word, 1), "bajada", round(w_tag, 1))


if __name__ == "__main__":
    construir()
