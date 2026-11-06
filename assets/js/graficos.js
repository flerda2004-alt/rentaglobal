// Gráficos SVG livianos: líneas con área, banda entre dos curvas, cursor con tooltip,
// etiquetas al final de cada serie y animación de trazado. Sin dependencias.
import { fechaCorta, mesCorto } from "./util.js";

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  return n;
};
const ts = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const reducir = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function pasoLindo(rango, n = 5) {
  const crudo = rango / n;
  const p = Math.pow(10, Math.floor(Math.log10(crudo)));
  const r = crudo / p;
  return (r < 1.5 ? 1 : r < 2.25 ? 2 : r < 3.5 ? 2.5 : r < 7.5 ? 5 : 10) * p;
}

let uid = 0;
const tooltip = () => document.getElementById("tooltip");

export function lineas(cont, opciones) {
  const id = "g" + ++uid;
  let opts = opciones;
  let animado = false;
  let ancho = 0;

  const svg = el("svg", { role: "img" });
  cont.innerHTML = "";
  cont.append(svg);

  function dibujar() {
    ancho = cont.clientWidth;
    const alto = cont.clientHeight || 300;
    svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
    svg.setAttribute("aria-label", opts.titulo || "Gráfico");
    svg.innerHTML = "";
    const series = (opts.series || []).filter((s) => s.datos && s.datos.length > 1);
    if (!series.length) {
      const t = el("text", { x: ancho / 2, y: alto / 2, "text-anchor": "middle", class: "vacio" });
      t.textContent = opts.vacio || "Sin datos para mostrar";
      svg.append(t);
      return;
    }
    const m = { izq: 8, der: opts.margenDer ?? 74, arr: 14, aba: 26 };
    const xs = [], ys = [];
    for (const s of series) for (const [f, v] of s.datos) { if (v != null) { xs.push(ts(f)); ys.push(v); } }
    const banda = opts.banda;
    if (banda) for (const lado of [banda.inferior, banda.superior]) for (const [f, v] of lado) if (v != null) { xs.push(ts(f)); ys.push(v); }
    if (opts.base != null) ys.push(opts.base);
    let x0 = Math.min(...xs), x1 = Math.max(...xs);
    let y0 = opts.minY ?? Math.min(...ys), y1 = opts.maxY ?? Math.max(...ys);
    if (y0 === y1) { y0 -= 1; y1 += 1; }
    const pad = (y1 - y0) * 0.08;
    y0 -= pad; y1 += pad;
    const paso = pasoLindo(y1 - y0, alto < 200 ? 3 : 5);
    y0 = Math.floor(y0 / paso) * paso; y1 = Math.ceil(y1 / paso) * paso;
    const X = (t) => m.izq + ((t - x0) / Math.max(1, x1 - x0)) * (ancho - m.izq - m.der);
    const Y = (v) => m.arr + (1 - (v - y0) / (y1 - y0)) * (alto - m.arr - m.aba);
    const fy = opts.formatoY || ((v) => v.toLocaleString("es-AR"));

    // grilla y eje Y (a la derecha, como en las plataformas de trading)
    const grilla = el("g", { class: "grilla" });
    const eje = el("g", { class: "eje" });
    const marcasY = [];
    for (let v = y0; v <= y1 + paso / 2; v += paso) {
      grilla.append(el("line", { x1: m.izq, x2: ancho - m.der + 6, y1: Y(v), y2: Y(v) }));
      const t = el("text", { x: ancho - m.der + 12, y: Y(v) + 4 });
      t.textContent = fy(v, true);
      eje.append(t);
      marcasY.push([Y(v), t]);
    }
    // eje X: meses o días según el rango
    const dias = (x1 - x0) / 864e5;
    const marcas = [];
    const d = new Date(x0);
    if (dias > 75) {
      const cada = dias > 400 ? 3 : dias > 200 ? 2 : 1;
      let mm = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      while (mm.getTime() <= x1) {
        if (mm.getUTCMonth() % cada === 0) marcas.push([mm.getTime(), mesCorto(mm.toISOString())]);
        mm = new Date(Date.UTC(mm.getUTCFullYear(), mm.getUTCMonth() + 1, 1));
      }
    } else {
      const cada = dias > 40 ? 14 : dias > 14 ? 7 : 2;
      for (let t = x0; t <= x1; t += cada * 864e5) marcas.push([t, fechaCorta(new Date(t).toISOString()).replace(/ \d\d$/, "")]);
    }
    let ultimaX = -1e9;
    for (const [t, txt] of marcas) {
      const x = X(t);
      if (x - ultimaX < 54 || x > ancho - m.der - 10) continue;
      ultimaX = x;
      const tx = el("text", { x, y: alto - 6, "text-anchor": "middle" });
      tx.textContent = txt;
      eje.append(tx);
    }
    svg.append(grilla, eje);

    const defs = el("defs");
    svg.append(defs);

    // banda (área entre piso y techo)
    if (banda && banda.inferior.length > 1) {
      const sup = banda.superior.filter((p) => p[1] != null);
      const inf = banda.inferior.filter((p) => p[1] != null);
      const g = el("linearGradient", { id: id + "b", x1: 0, y1: 0, x2: 0, y2: 1 });
      g.append(el("stop", { offset: "0%", "stop-color": banda.color || "#6bbaf3", "stop-opacity": 0.16 }));
      g.append(el("stop", { offset: "100%", "stop-color": banda.color || "#6bbaf3", "stop-opacity": 0.05 }));
      defs.append(g);
      const dArea = "M" + sup.map(([f, v]) => `${X(ts(f)).toFixed(1)},${Y(v).toFixed(1)}`).join("L") +
        "L" + inf.slice().reverse().map(([f, v]) => `${X(ts(f)).toFixed(1)},${Y(v).toFixed(1)}`).join("L") + "Z";
      svg.append(el("path", { d: dArea, fill: `url(#${id}b)` }));
      for (const [lado, nombre] of [[sup, "Techo"], [inf, "Piso"]]) {
        svg.append(el("path", { d: "M" + lado.map(([f, v]) => `${X(ts(f)).toFixed(1)},${Y(v).toFixed(1)}`).join("L"), fill: "none", stroke: banda.color || "#6bbaf3", "stroke-opacity": 0.55, "stroke-width": 1.3, "stroke-dasharray": "5 5" }));
        const ult = lado[lado.length - 1];
        const t = el("text", { x: X(ts(ult[0])) - 6, y: Y(ult[1]) + (nombre === "Techo" ? -8 : 16), "text-anchor": "end", class: "eje" });
        t.textContent = `${nombre} ${fy(ult[1])}`;
        t.setAttribute("fill", "#a3b0c7");
        svg.append(t);
      }
    }
    if (opts.base != null && opts.base >= y0 && opts.base <= y1) {
      svg.append(el("line", { x1: m.izq, x2: ancho - m.der + 6, y1: Y(opts.base), y2: Y(opts.base), stroke: "rgba(150,185,235,.35)", "stroke-width": 1 }));
    }

    // series
    const etiquetas = [];
    series.forEach((s, i) => {
      const pts = s.datos.filter((p) => p[1] != null);
      const dLinea = "M" + pts.map(([f, v]) => `${X(ts(f)).toFixed(1)},${Y(v).toFixed(1)}`).join("L");
      if (s.area) {
        const g = el("linearGradient", { id: `${id}a${i}`, x1: 0, y1: 0, x2: 0, y2: 1 });
        g.append(el("stop", { offset: "0%", "stop-color": s.color, "stop-opacity": 0.28 }));
        g.append(el("stop", { offset: "100%", "stop-color": s.color, "stop-opacity": 0 }));
        defs.append(g);
        const base = Y(opts.base != null ? Math.max(y0, opts.base) : y0);
        svg.append(el("path", { d: `${dLinea}L${X(ts(pts[pts.length - 1][0])).toFixed(1)},${base}L${X(ts(pts[0][0])).toFixed(1)},${base}Z`, fill: `url(#${id}a${i})` }));
      }
      const p = el("path", { d: dLinea, class: "serie", stroke: s.color, "stroke-width": s.ancho || 2.2, "stroke-dasharray": s.punteada ? "4 5" : null });
      svg.append(p);
      if (!animado && !reducir() && !s.punteada) {
        const len = p.getTotalLength();
        p.style.setProperty("--len", len);
        p.classList.add("serie--dibujar");
        p.style.animationDelay = `${i * 0.12}s`;
      }
      const u = pts[pts.length - 1];
      etiquetas.push({ y: Y(u[1]), x: X(ts(u[0])), s, v: u[1] });
    });

    // último valor de cada serie: punto sobre la línea y etiqueta de color sobre el eje (como en las plataformas de trading)
    if (opts.etiquetasFinales !== false) {
      for (const e of etiquetas) svg.append(el("circle", { cx: e.x, cy: Y(e.v), r: 3.6, fill: e.s.color, stroke: "#030817", "stroke-width": 1.5 }));
      if (opts.etiquetaFinal) {
        const hTag = 19, sep = 2;
        etiquetas.sort((a, b) => a.y - b.y);
        for (let i = 1; i < etiquetas.length; i++) etiquetas[i].y = Math.max(etiquetas[i].y, etiquetas[i - 1].y + hTag + sep);
        const exceso = etiquetas.length ? etiquetas[etiquetas.length - 1].y + hTag / 2 - (alto - 2) : 0;
        if (exceso > 0) for (const e of etiquetas) e.y -= exceso;
        const xTag = ancho - m.der + 6;
        for (const e of etiquetas) {
          const g = el("g", { class: "tag" });
          const r = el("rect", { x: xTag, y: e.y - hTag / 2, rx: 6, height: hTag, width: 40, fill: e.s.color });
          const t = el("text", { x: xTag + 7, y: e.y + 4 });
          t.textContent = opts.etiquetaFinal(e.s, e.v);
          g.append(r, t);
          svg.append(g);
          const w = t.getComputedTextLength?.() || t.textContent.length * 7;
          r.setAttribute("width", Math.ceil(w + 14));
        }
        // las marcas del eje que quedan debajo de una etiqueta se ocultan
        for (const [y, t] of marcasY) if (etiquetas.some((e) => Math.abs(e.y - y) < hTag / 2 + 5)) t.style.opacity = 0;
      }
    }

    // cursor interactivo
    const cursor = el("g", { class: "cursor", style: "display:none" });
    const linea = el("line", { y1: m.arr, y2: alto - m.aba });
    cursor.append(linea);
    const puntos = series.map((s) => { const c = el("circle", { r: 4.5, fill: s.color, stroke: "#030817", "stroke-width": 2 }); cursor.append(c); return c; });
    svg.append(cursor);
    const capa = el("rect", { x: m.izq, y: 0, width: Math.max(0, ancho - m.izq - m.der), height: alto, fill: "transparent", style: "cursor:crosshair" });
    svg.append(capa);
    const fechas = [...new Set(series.flatMap((s) => s.datos.map((p) => p[0])))].sort();
    const indice = series.map((s) => new Map(s.datos.map((p) => [p[0], p[1]])));
    const valorEn = (si, f) => {
      if (indice[si].has(f)) return indice[si].get(f);
      const ds = series[si].datos; let ult = null;
      for (const p of ds) { if (p[0] <= f) ult = p[1]; else break; }
      return ult;
    };
    const ft = opts.formatoTooltip || fy;
    const mover = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = (ev.clientX - r.left) * (ancho / r.width);
      const t = x0 + ((px - m.izq) / (ancho - m.izq - m.der)) * (x1 - x0);
      let mejor = fechas[0], dmin = Infinity;
      for (const f of fechas) { const dd = Math.abs(ts(f) - t); if (dd < dmin) { dmin = dd; mejor = f; } }
      const x = X(ts(mejor));
      linea.setAttribute("x1", x); linea.setAttribute("x2", x);
      cursor.style.display = "";
      const filas = [];
      series.forEach((s, i) => {
        const v = valorEn(i, mejor);
        if (v == null) { puntos[i].setAttribute("cx", -99); return; }
        puntos[i].setAttribute("cx", x); puntos[i].setAttribute("cy", Y(v));
        filas.push(`<div><span><i style="background:${s.color}"></i>${s.nombre}</span><strong>${ft(v)}</strong></div>`);
      });
      if (banda) {
        const fb = (lado) => { let u = null; for (const p of lado) { if (p[0] <= mejor) u = p[1]; else break; } return u; };
        const sup = fb(banda.superior), inf = fb(banda.inferior);
        if (sup != null) filas.push(`<div><span>Techo</span><strong>${ft(sup)}</strong></div>`);
        if (inf != null) filas.push(`<div><span>Piso</span><strong>${ft(inf)}</strong></div>`);
      }
      const tip = tooltip();
      tip.innerHTML = `<b>${fechaCorta(mejor)}</b>${filas.join("")}`;
      tip.hidden = false;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let left = ev.clientX + 16, top = ev.clientY - th - 12;
      if (left + tw > innerWidth - 10) left = ev.clientX - tw - 16;
      if (top < 10) top = ev.clientY + 18;
      tip.style.left = left + "px"; tip.style.top = top + "px";
    };
    const salir = () => { cursor.style.display = "none"; tooltip().hidden = true; };
    capa.addEventListener("pointermove", mover);
    capa.addEventListener("pointerdown", mover);
    capa.addEventListener("pointerleave", salir);
    animado = true;
  }

  let pendiente = 0;
  const ro = new ResizeObserver(() => {
    if (Math.abs(cont.clientWidth - ancho) < 2) return;
    cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(dibujar);
  });
  ro.observe(cont);

  // la primera animación de trazado arranca cuando el gráfico entra en pantalla
  const io = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) { animado = false; dibujar(); io.disconnect(); }
  }, { threshold: 0.25 });
  io.observe(cont);
  dibujar();

  return {
    actualizar(nuevas, { animar = true } = {}) { opts = { ...opts, ...nuevas }; if (animar) animado = false; dibujar(); },
  };
}

// Línea mínima para tarjetas (sin ejes)
export function sparkline(cont, valores, { color = "#6bbaf3", area = true, alto = 34 } = {}) {
  const vs = (valores || []).filter((v) => v != null && isFinite(v));
  cont.innerHTML = "";
  if (vs.length < 2) return;
  const w = 100, hgt = alto;
  const min = Math.min(...vs), max = Math.max(...vs), r = max - min || 1;
  const X = (i) => (i / (vs.length - 1)) * w;
  const Y = (v) => 2 + (1 - (v - min) / r) * (hgt - 4);
  const d = "M" + vs.map((v, i) => `${X(i).toFixed(2)},${Y(v).toFixed(2)}`).join("L");
  const s = el("svg", { viewBox: `0 0 ${w} ${hgt}`, preserveAspectRatio: "none", "aria-hidden": "true" });
  s.style.width = "100%"; s.style.height = "100%";
  if (area) {
    const gid = "sp" + ++uid;
    const g = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
    g.append(el("stop", { offset: "0%", "stop-color": color, "stop-opacity": 0.3 }));
    g.append(el("stop", { offset: "100%", "stop-color": color, "stop-opacity": 0 }));
    const defs = el("defs"); defs.append(g); s.append(defs);
    s.append(el("path", { d: `${d}L${w},${hgt}L0,${hgt}Z`, fill: `url(#${gid})` }));
  }
  s.append(el("path", { d, fill: "none", stroke: color, "stroke-width": 1.6, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round" }));
  cont.append(s);
}

// Barras verticales chicas (inflación mensual)
export function barras(cont, datos, { color = "#6bbaf3", alto = 46, resaltarUltima = true } = {}) {
  cont.innerHTML = "";
  if (!datos || !datos.length) return;
  const w = 100, n = datos.length, max = Math.max(...datos.map((d) => d[1]), 0.0001);
  const s = el("svg", { viewBox: `0 0 ${w} ${alto}`, preserveAspectRatio: "none", "aria-hidden": "true" });
  s.style.width = "100%"; s.style.height = "100%";
  const bw = w / n;
  datos.forEach(([f, v], i) => {
    const hh = Math.max(1, (v / max) * (alto - 2));
    const r = el("rect", { x: i * bw + bw * 0.18, y: alto - hh, width: bw * 0.64, height: hh, rx: 0.8, fill: color, "fill-opacity": resaltarUltima && i === n - 1 ? 1 : 0.38 });
    const t = el("title"); t.textContent = `${mesCorto(f)}: ${v.toLocaleString("es-AR")}%`; r.append(t);
    s.append(r);
  });
  cont.append(s);
}
