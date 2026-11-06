// Formatos, tiempos y pedidos de red.
const nf = new Map();
function fmt(dec, opts = {}) {
  const k = dec + JSON.stringify(opts);
  if (!nf.has(k)) nf.set(k, new Intl.NumberFormat("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec, ...opts }));
  return nf.get(k);
}
export const num = (v, dec = 2) => (v == null || !isFinite(v) ? "—" : fmt(dec).format(v));
export const pesos = (v, dec = 2) => (v == null || !isFinite(v) ? "—" : "$" + fmt(dec).format(v));
export const pct = (v, dec = 2, signo = false) =>
  v == null || !isFinite(v) ? "—" : (signo && v > 0 ? "+" : signo && v < 0 ? "−" : "") + fmt(dec).format(signo ? Math.abs(v) : v) + "%";
export const compacto = (v, moneda = "$") => {
  if (v == null || !isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e12) return `${moneda} ${fmt(2).format(v / 1e12)} B`;
  if (a >= 1e9) return `${moneda} ${fmt(1).format(v / 1e9)} MM`;
  if (a >= 1e6) return `${moneda} ${fmt(1).format(v / 1e6)} M`;
  return `${moneda} ${fmt(0).format(v)}`;
};
export const clase = (v) => (v > 0.0001 ? "sube" : v < -0.0001 ? "baja" : "igual");
export const flecha = (v) => (v > 0.0001 ? "▲" : v < -0.0001 ? "▼" : "•");

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fechaCorta = (iso) => {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${+d} ${MESES[+m - 1]} ${a.slice(2)}`;
};
export const fechaDM = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "—");
export const mesCorto = (iso) => MESES[+iso.slice(5, 7) - 1] + " " + iso.slice(2, 4);

// Hora argentina (UTC−3, sin horario de verano)
export function ahoraAR() {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return { iso: d.toISOString().slice(0, 10), h: d.getUTCHours(), m: d.getUTCMinutes(), dow: d.getUTCDay(), d };
}
export const horaAR = (fecha) => {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const x = new Date(d.getTime() - 3 * 3600 * 1000);
  return x.toISOString().slice(11, 16);
};
export function hace(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "recién";
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}

// Rueda de BYMA: días hábiles de 11 a 17 h
export function estadoMercado(feriados = []) {
  const a = ahoraAR();
  const habil = a.dow >= 1 && a.dow <= 5 && !feriados.includes(a.iso);
  const min = a.h * 60 + a.m;
  const abierto = habil && min >= 11 * 60 && min < 17 * 60;
  let texto;
  if (abierto) texto = "Mercado abierto";
  else if (habil && min < 11 * 60) texto = "Abre 11:00";
  else texto = "Mercado cerrado";
  return { abierto, texto, habil };
}

export async function pedir(url, { timeout = 12000, json = true } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return json ? await r.json() : await r.text();
  } finally {
    clearTimeout(t);
  }
}

// Animación de números: interpola y deja un destello verde o rojo según el sentido.
const animando = new WeakMap();
export function animarNumero(el, valor, formato, { destello = true, dur = 900 } = {}) {
  if (!el) return;
  const previo = el.dataset.valor != null ? +el.dataset.valor : null;
  el.dataset.valor = valor;
  if (valor == null || !isFinite(valor)) { el.textContent = formato(valor); return; }
  const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (previo == null || !isFinite(previo) || previo === valor || reducir) {
    el.textContent = formato(valor);
  } else {
    cancelAnimationFrame(animando.get(el));
    const t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = formato(previo + (valor - previo) * e);
      if (k < 1) animando.set(el, requestAnimationFrame(paso));
    };
    animando.set(el, requestAnimationFrame(paso));
    if (destello) {
      el.classList.remove("destello-sube", "destello-baja");
      void el.offsetWidth;
      el.classList.add(valor > previo ? "destello-sube" : "destello-baja");
    }
  }
}

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") {
      // las variables CSS (--c) solo se pueden asignar con setProperty
      for (const [p, val] of Object.entries(v)) p.startsWith("--") ? el.style.setProperty(p, val) : (el.style[p] = val);
    }
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of hijos.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}

// Pestañas segmentadas: marca la elegida y llama al callback con su dataset
export function segmentado(cont, alCambiar) {
  cont.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !cont.contains(b)) return;
    for (const x of cont.querySelectorAll("button")) x.setAttribute("aria-selected", x === b ? "true" : "false");
    alCambiar({ ...b.dataset });
  });
  const sel = cont.querySelector('[aria-selected="true"]') || cont.querySelector("button");
  return { ...sel.dataset };
}
