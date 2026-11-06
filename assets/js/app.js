import { CONFIG, CASAS, COLOR_FONDO, NOMBRES } from "./config.js";
import { $, $$, h, num, pesos, pct, clase, flecha, fechaDM, mesCorto, horaAR, hace, ahoraAR, estadoMercado, pedir, animarNumero, segmentado } from "./util.js";
import { lineas, sparkline, barras } from "./graficos.js";
import { iniciarEfectos, prepararTarjetas, fondoHero } from "./efectos.js";

// ── Estado ──────────────────────────────────────────────────────────────────
const S = {
  snap: null,
  dolares: null, dolaresTs: 0,
  bandas: null, bandasTs: 0,
  mercado: { cedears: null, acciones: null, ts: 0, vivo: false },
  riesgo: null,
  seleccionDolar: new Set(["bolsa", "contadoconliqui", "blue", "oficial"]),
  periodoDolar: 90,
  fondosMoneda: "ARS", fondosPeriodo: "d30",
  calc: { moneda: "ARS", monto: 1_000_000, dias: 30 },
  panelMercado: "cedears",
};
const G = {}; // gráficos ya creados
const hoy = () => ahoraAR().iso;
const decimales = (v) => (v != null && Math.abs(v - Math.round(v)) > 0.001 ? 2 : 0);
const precio = (v) => pesos(v, decimales(v));
const varTxt = (v) => (v == null ? "—" : `${flecha(v)} ${pct(Math.abs(v), 2)}`);
const restarDias = (iso, d) => new Date(Date.parse(iso.slice(0, 10)) - d * 864e5).toISOString().slice(0, 10);
// Fecha argentina de un timestamp (las fechas solas se dejan como están)
const fechaAR = (f) => (!f ? null : f.length <= 10 ? f : new Date(Date.parse(f) - 3 * 3600e3).toISOString().slice(0, 10));
const cuando = (f) => (!f ? "" : `${fechaAR(f) === hoy() ? "Hoy" : fechaDM(fechaAR(f))} ${f.length > 10 ? horaAR(f) + " hs" : ""}`.trim());

// ── Dólares: actual, historia y variación ───────────────────────────────────
const historia = (casa) => S.snap?.dolares?.historia?.[casa] || [];
function actual(casa) {
  const vivo = (S.dolares || []).find((d) => d.casa === casa);
  return vivo || (S.snap?.dolares?.actual || []).find((d) => d.casa === casa) || null;
}
// Cierre de la rueda anterior a la del dato actual (en fin de semana compara viernes contra jueves)
function cierreAnterior(casa) {
  const ref = fechaAR(actual(casa)?.fechaActualizacion) || hoy();
  const hh = historia(casa);
  for (let i = hh.length - 1; i >= 0; i--) if (hh[i][0] < ref && hh[i][2] != null) return hh[i][2];
  return null;
}
function variacion(casa) {
  const a = actual(casa), c = cierreAnterior(casa);
  return a?.venta && c ? (a.venta / c - 1) * 100 : null;
}
function serieVenta(casa, dias) {
  const desde = restarDias(hoy(), dias);
  const s = historia(casa).filter((p) => p[0] >= desde && p[2] != null).map((p) => [p[0], p[2]]);
  const a = actual(casa);
  if (a?.venta) {
    const f = fechaAR(a.fechaActualizacion) || hoy();
    const ult = s[s.length - 1];
    if (ult && ult[0] === f) ult[1] = a.venta;
    else if (!ult || ult[0] < f) s.push([f, a.venta]);
  }
  return s;
}
const fondos = () => S.snap?.fondos || [];
const macro = () => S.snap?.macro || {};
const feriados = () => S.snap?.feriados || [];

// ── Cinta superior ──────────────────────────────────────────────────────────
function itemsCinta() {
  const it = [];
  for (const c of CASAS.slice(0, 6)) {
    const a = actual(c.casa);
    if (a?.venta) it.push([`Dólar ${c.nombre}`, precio(a.venta), variacion(c.casa)]);
  }
  const rp = riesgoActual();
  if (rp) it.push(["Riesgo país", num(rp.valor, 0) + " pb", null]);
  const b = ultimoBandas();
  if (b?.techo) it.push(["Techo de la banda", pesos(b.techo, 2), null]);
  for (const f of fondos().filter((x) => x.gestora === "Cocos" && x.moneda === "ARS")) {
    const r = f.rend?.d1;
    if (r) it.push([`${f.nombre} · TNA`, pct(r.tna, 2), null]);
  }
  const m = moversDe("cedears");
  for (const x of [...m.suben.slice(0, 3), ...m.bajan.slice(0, 3)]) it.push([x.s, precio(x.c), x.p]);
  return it;
}
function renderCinta() {
  const it = itemsCinta();
  if (!it.length) return;
  const pista = $("#cinta");
  const crear = (x) => h("span", { class: "cinta__item" }, h("b", {}, x[0]), h("span", {}, x[1]),
    x[2] != null ? h("em", { class: clase(x[2]) }, varTxt(x[2])) : null);
  // dos copias seguidas para que el desplazamiento sea continuo
  pista.replaceChildren(...it.map(crear), ...it.map(crear));
  const dur = `${Math.max(45, it.length * 6)}s`;
  if (pista.style.animationDuration !== dur) pista.style.animationDuration = dur;
}

// ── Hero ────────────────────────────────────────────────────────────────────
function renderHero() {
  const mep = actual("bolsa");
  if (mep?.venta) {
    animarNumero($("#hero-mep"), mep.venta, (v) => num(v, 2));
    const v = variacion("bolsa");
    const el = $("#hero-mep-var");
    el.className = "hero__principal-var " + clase(v);
    el.textContent = v != null ? `${varTxt(v)} vs. el cierre anterior` : `Compra ${precio(mep.compra)}`;
    $("#hero-hora").textContent = cuando(mep.fechaActualizacion);
  }
  $("#hero-filas").replaceChildren(...["contadoconliqui", "blue", "oficial"].map((casa) => {
    const a = actual(casa), v = variacion(casa), c = CASAS.find((x) => x.casa === casa);
    return h("li", {}, h("span", {}, c.nombre), h("strong", {}, a ? precio(a.venta) : "—"), h("em", { class: clase(v) }, varTxt(v)));
  }));
  sparkline($("#hero-mini"), serieVenta("bolsa", 90).map((p) => p[1]), { color: "#6bbaf3", alto: 110 });

  const rp = riesgoActual();
  if (rp) animarNumero($('[data-kpi="riesgo"]'), rp.valor, (v) => num(v, 0) + " pb", { destello: false });
  const ca = fondos().find((f) => f.id === "cocos-ahorro");
  const tna = ca?.rend?.d1?.tna ?? ca?.tna_cocos;
  if (tna != null) $('[data-kpi="cocos"]').textContent = pct(tna, 1);
  const inf = macro().inflacion_mensual;
  if (inf?.length) { const u = inf[inf.length - 1]; $('[data-kpi="inflacion"]').textContent = `${pct(u[1], 1)} · ${mesCorto(u[0]).split(" ")[0]}`; }

  const b = ultimoBandas();
  if (b?.techo) $("#flot-techo").textContent = pesos(b.techo, 2);
  const ccl = actual("contadoconliqui"), of = actual("oficial");
  if (ccl?.venta && of?.venta) $("#flot-brecha").textContent = pct((ccl.venta / of.venta - 1) * 100, 1);
  const r = fondos().find((f) => f.id === "cocos-pesos-plus")?.rend?.d30;
  if (r) $("#flot-plus").textContent = `${pct(r.tea, 1)} TEA 30 días`;
}

// ── Dólares ─────────────────────────────────────────────────────────────────
function construirDolares() {
  $("#dolares").replaceChildren(...CASAS.map((c) => h("button", {
    class: "dolar", role: "listitem", type: "button", "data-casa": c.casa, "aria-pressed": S.seleccionDolar.has(c.casa) ? "true" : "false",
    title: `${c.largo}: tocá para sumarlo o sacarlo del gráfico`, onclick: () => alternarDolar(c.casa),
  },
    h("div", { class: "dolar__cab" }, h("span", { class: "dolar__nombre" }, c.nombre), h("span", { class: "dolar__brecha", "data-brecha": "" })),
    h("div", { class: "dolar__valores" },
      h("span", { class: "dolar__venta" }, h("small", {}, "$"), h("span", { "data-venta": "" }, "—")),
      h("span", { class: "dolar__compra" }, "Compra", h("strong", { "data-compra": "" }, "—"))),
    h("div", { class: "dolar__pie" }, h("span", { class: "dolar__var", "data-var": "" }, "—"), h("span", { class: "dolar__spark", "data-spark": "" })),
    h("div", { class: "dolar__hora", "data-hora": "" }))),
    // tarjeta resumen: brechas contra el oficial y canje entre CCL y MEP
    h("div", { class: "dolar dolar--resumen", role: "listitem" },
      h("div", { class: "dolar__cab" }, h("span", { class: "dolar__nombre" }, "Brechas y canje")),
      h("ul", { class: "brechas", id: "brechas" })));
  prepararTarjetas($$(".dolar"));
  $("#dolar-series").replaceChildren(...CASAS.map((c) => h("button", {
    class: "chip", type: "button", "data-casa": c.casa, "aria-pressed": S.seleccionDolar.has(c.casa) ? "true" : "false",
    style: { "--c": c.color }, onclick: () => alternarDolar(c.casa),
  }, h("i"), c.nombre)));
}
function alternarDolar(casa) {
  if (S.seleccionDolar.has(casa)) { if (S.seleccionDolar.size > 1) S.seleccionDolar.delete(casa); }
  else S.seleccionDolar.add(casa);
  for (const n of $$("[data-casa]")) n.setAttribute("aria-pressed", S.seleccionDolar.has(n.dataset.casa) ? "true" : "false");
  graficoDolar();
}
function selloDolares() {
  const el = $("#dolar-sello");
  if (S.dolaresTs) el.innerHTML = `<span class="punto-vivo"></span> <span>En vivo · actualizado ${hace(S.dolaresTs)}</span>`;
  else if (S.snap) el.innerHTML = `<span>Último dato publicado · ${cuando(S.snap.generado)}</span>`;
  else el.innerHTML = `<span>Conectando…</span>`;
}
function renderDolares() {
  const of = actual("oficial");
  for (const c of CASAS) {
    const card = $(`.dolar[data-casa="${c.casa}"]`);
    const a = actual(c.casa);
    if (!card || !a?.venta) continue;
    animarNumero($("[data-venta]", card), a.venta, (v) => num(v, decimales(a.venta)));
    $("[data-compra]", card).textContent = a.compra != null ? precio(a.compra) : "—";
    const v = variacion(c.casa);
    const ev = $("[data-var]", card);
    ev.className = "dolar__var " + clase(v);
    ev.textContent = v != null ? varTxt(v) : "Sin cierre previo";
    $("[data-brecha]", card).textContent = of?.venta && !["oficial", "mayorista"].includes(c.casa) ? `Brecha ${pct((a.venta / of.venta - 1) * 100, 1)}` : "";
    sparkline($("[data-spark]", card), serieVenta(c.casa, 30).map((p) => p[1]), { color: v != null && v < 0 ? "#ff6b84" : "#2fd6a0" });
    $("[data-hora]", card).textContent = cuando(a.fechaActualizacion);
  }
  const v = (casa) => actual(casa)?.venta;
  const filas = [
    ["MEP vs. oficial", v("bolsa"), v("oficial")],
    ["CCL vs. oficial", v("contadoconliqui"), v("oficial")],
    ["Blue vs. oficial", v("blue"), v("oficial")],
    ["Canje CCL / MEP", v("contadoconliqui"), v("bolsa")],
  ].filter(([, a, b]) => a && b);
  if (filas.length) $("#brechas").replaceChildren(...filas.map(([n, a, b]) => h("li", {}, h("span", {}, n), h("strong", {}, pct((a / b - 1) * 100, 2)))));
  selloDolares();
}
function graficoDolar() {
  const series = CASAS.filter((c) => S.seleccionDolar.has(c.casa)).map((c) => ({
    nombre: c.nombre, color: c.color, datos: serieVenta(c.casa, S.periodoDolar), ancho: c.casa === "bolsa" ? 2.6 : 1.8,
  }));
  const opts = {
    series, titulo: "Evolución del dólar", vacio: S.snap ? "Sin datos para este período" : "Cargando…",
    formatoY: (v) => "$" + num(v, 0), formatoTooltip: (v) => precio(v), etiquetaFinal: (_s, v) => num(v, 0), margenDer: 66,
  };
  if (!G.dolar) G.dolar = lineas($("#dolar-grafico"), opts); else G.dolar.actualizar(opts);
}

// ── Bandas ──────────────────────────────────────────────────────────────────
const serieBandas = () => (S.bandas?.length ? S.bandas : S.snap?.bandas?.serie || []);
function ultimoBandas() {
  const s = serieBandas();
  if (!s.length) {
    const b = macro().bcra;
    if (b?.banda_techo) return { techo: b.banda_techo.valor, piso: b.banda_piso?.valor, mayorista: b.mayorista?.valor, fecha: b.mayorista?.fecha };
    return null;
  }
  const ult = (i) => { for (let k = s.length - 1; k >= 0; k--) if (s[k][i] != null) return [s[k][0], s[k][i]]; return [null, null]; };
  const [fm, mayorista] = ult(1), [, piso] = ult(2), [, techo] = ult(3);
  return { mayorista, piso, techo, fecha: fm };
}
function renderBandas() {
  const s = serieBandas();
  const b = ultimoBandas();
  if (!b?.techo || !b?.piso) return;
  animarNumero($("#b-mayorista"), b.mayorista, (v) => pesos(v, 2), { destello: false });
  $("#b-techo").textContent = pesos(b.techo, 2);
  $("#b-piso").textContent = pesos(b.piso, 2);
  $("#b-techo-dist").textContent = b.mayorista ? `${pct((b.techo / b.mayorista - 1) * 100, 1)} arriba del mayorista` : "";
  $("#b-piso-dist").textContent = b.mayorista ? `${pct((1 - b.piso / b.mayorista) * 100, 1)} debajo del mayorista` : "";
  const pos = b.mayorista ? Math.max(0, Math.min(1, (b.mayorista - b.piso) / (b.techo - b.piso))) : 0.5;
  requestAnimationFrame(() => { $("#b-marcador").style.left = `${(pos * 100).toFixed(1)}%`; });
  let nota = `El mayorista recorrió el ${pct(pos * 100, 0)} del camino entre el piso y el techo.`;
  const conTecho = s.filter((p) => p[3] != null && p[2] != null);
  if (conTecho.length > 25) {
    const u = conTecho[conTecho.length - 1];
    const objetivo = restarDias(u[0], 30);
    const base = [...conTecho].reverse().find((p) => p[0] <= objetivo);
    const mov = (nuevo, viejo) => { const c = (nuevo / viejo - 1) * 100; return `${c >= 0 ? "subió" : "bajó"} ${pct(Math.abs(c), 2)}`; };
    if (base) nota += ` En los últimos 30 días el techo ${mov(u[3], base[3])} y el piso ${mov(u[2], base[2])}.`;
  }
  $("#b-nota").textContent = nota;
  $("#bandas-sello").innerHTML = `<span>BCRA · dato del ${fechaDM(b.fecha || "")}${S.bandasTs ? " · consultado " + hace(S.bandasTs) : ""}</span>`;
  const opts = {
    titulo: "Dólar mayorista dentro de la banda cambiaria",
    series: [{ nombre: "Mayorista", color: "#6bbaf3", datos: s.filter((p) => p[1] != null).map((p) => [p[0], p[1]]), ancho: 2.4 }],
    banda: { inferior: s.filter((p) => p[2] != null).map((p) => [p[0], p[2]]), superior: s.filter((p) => p[3] != null).map((p) => [p[0], p[3]]), color: "#8ec5da" },
    formatoY: (v) => "$" + num(v, 0), formatoTooltip: (v) => pesos(v, 2), margenDer: 64, etiquetaFinal: (_s, v) => num(v, 0),
  };
  if (!G.bandas) G.bandas = lineas($("#bandas-grafico"), opts); else G.bandas.actualizar(opts, { animar: false });
}

// ── Fondos ──────────────────────────────────────────────────────────────────
const ETIQ_PERIODO = { d1: "último día", d7: "7 días", d30: "30 días", d90: "90 días", ytd: "en el año", d365: "12 meses" };
const esTasa = (p) => ["d1", "d7", "d30"].includes(p);
const medida = (f, p) => f.rend?.[p] || null;
const valorRanking = (f, p) => { const m = medida(f, p); return m ? (esTasa(p) ? m.tna : m.rend) : null; };
const colorFondo = (f) => COLOR_FONDO[f.id] || "#8e9bb3";
// Patrimonio con una sola unidad por moneda para poder comparar: miles de millones en pesos, millones en dólares
const patrimonio = (v, moneda) => (!(v > 0) ? "—" : moneda === "ARS" ? `$ ${num(v / 1e9, 1)} mil M` : `US$ ${num(v / 1e6, 0)} M`);
const nombreCorto = (f) => (f.gestora === "Cocos" ? f.nombre.replace(/^Cocos /, "") : f.nombre);
const marca = (f) => h("span", { class: `marca-gestora marca-gestora--${f.gestora.toLowerCase()}` }, f.gestora);

function renderFondos() {
  const lista = fondos().filter((f) => f.moneda === S.fondosMoneda);
  const p = S.fondosPeriodo;
  $("#fondos-rank-titulo").textContent = esTasa(p) ? `TNA · ${ETIQ_PERIODO[p]}` : `Rendimiento · ${ETIQ_PERIODO[p]}`;
  $("#fondos-rank-sub").textContent = esTasa(p) ? "Rendimiento del período, expresado como tasa nominal anual" : "Rendimiento acumulado del período y su TEA equivalente";

  const orden = lista.map((f) => ({ f, v: valorRanking(f, p) })).filter((x) => x.v != null).sort((a, b) => b.v - a.v);
  const max = Math.max(...orden.map((x) => Math.abs(x.v)), 0.0001);
  const ol = $("#fondos-ranking");
  if (!orden.length) ol.replaceChildren(h("li", { class: "tenue" }, S.snap ? "Todavía no hay datos para este período." : "Cargando…"));
  else ol.replaceChildren(...orden.map((x, i) => {
    const m = medida(x.f, p);
    const li = h("li", { class: x.f.gestora === "Cocos" ? "es-cocos" : "", style: { "--c": colorFondo(x.f) } },
      h("span", { class: "ranking__pos" }, String(i + 1).padStart(2, "0")),
      h("span", { class: "ranking__nombre" }, marca(x.f), nombreCorto(x.f)),
      h("span", { class: "ranking__valor" }, pct(x.v, 2), esTasa(p) ? null : h("small", {}, `TEA ${pct(m.tea, 1)}`)),
      h("span", { class: "ranking__barra" }, h("i", {})));
    requestAnimationFrame(() => requestAnimationFrame(() => { li.querySelector("i").style.width = `${Math.max(2, (Math.abs(x.v) / max) * 100)}%`; }));
    return li;
  }));

  // Cocos contra la competencia, solo entre fondos comparables (rescate inmediato)
  const comp = $("#fondos-comparativa");
  const porValor = (a, b) => valorRanking(b, p) - valorRanking(a, p);
  // en pesos: money market contra money market; en dólares: los de rescate inmediato
  const ars = S.fondosMoneda === "ARS";
  const comparables = lista.filter((f) => f.rescate === "T+0" && (!ars || f.tipo === "Money market") && valorRanking(f, p) != null);
  const mejorCocos = comparables.filter((f) => f.gestora === "Cocos").sort(porValor)[0];
  const mejorOtro = comparables.filter((f) => f.gestora !== "Cocos").sort(porValor)[0];
  if (mejorCocos && mejorOtro) {
    const dif = valorRanking(mejorCocos, p) - valorRanking(mejorOtro, p);
    const [gana, pierde] = dif >= 0 ? [mejorCocos, mejorOtro] : [mejorOtro, mejorCocos];
    comp.innerHTML = `${ars ? "Entre los money market" : "Entre los fondos en dólares con rescate inmediato"}, <strong>${gana.nombre}</strong> le saca <strong>${num(Math.abs(dif), 2)} ${esTasa(p) ? "puntos de TNA" : "puntos porcentuales"}</strong> a ${pierde.nombre} (${ETIQ_PERIODO[p]}).`;
    comp.hidden = false;
  } else comp.hidden = true;

  // referencias para comparar
  const ref = $("#fondos-ref");
  if (S.fondosMoneda === "ARS") {
    const pf = (macro().plazo_fijo || []).find((x) => /NACI[OÓ]N/i.test(x.entidad));
    const inf = macro().inflacion_mensual?.slice(-1)[0];
    const badlar = macro().bcra?.badlar;
    const partes = [];
    if (pf) partes.push(`Plazo fijo Banco Nación: ${pct(pf.tna * 100, 2)} TNA`);
    if (badlar?.valor != null) partes.push(`BADLAR: ${pct(badlar.valor, 2)}`);
    if (inf) partes.push(`Inflación de ${mesCorto(inf[0]).split(" ")[0]}: ${pct(inf[1], 1)} (${pct((Math.pow(1 + inf[1] / 100, 12) - 1) * 100, 1)} anualizada)`);
    ref.textContent = partes.join(" · ");
  } else ref.textContent = "Rendimientos en dólares, calculados sobre la cuotaparte en USD.";

  // gráfico: rendimiento acumulado desde el inicio del período
  const diasGraf = { d1: 30, d7: 7, d30: 30, d90: 90, ytd: null, d365: 365 }[p];
  const series = lista.map((f) => {
    const serie = f.serie || [];
    if (serie.length < 2) return null;
    const ult = serie[serie.length - 1][0];
    const desde = diasGraf ? restarDias(ult, diasGraf) : `${+ult.slice(0, 4) - 1}-12-31`;
    const base = [...serie].reverse().find((x) => x[0] <= desde) || serie[0];
    const datos = serie.filter((x) => x[0] >= base[0]).map((x) => [x[0], (x[1] / base[1] - 1) * 100]);
    return { nombre: f.nombre, color: colorFondo(f), datos, ancho: f.gestora === "Cocos" ? 2.6 : 1.8 };
  }).filter(Boolean);
  // las series con pocos puntos (historia incompleta de la CAFCI) van punteadas
  const maxPuntos = Math.max(...series.map((s) => s.datos.length), 0);
  for (const s of series) if (s.datos.length < maxPuntos * 0.5) s.punteada = true;
  $("#fondos-graf-sub").textContent = `Base 0% al inicio · ${p === "d1" ? "últimos 30 días" : ETIQ_PERIODO[p]}`;
  const opts = {
    series, base: 0, titulo: "Rendimiento acumulado de los fondos", vacio: S.snap ? "Sin datos para este período" : "Cargando…",
    formatoY: (v) => pct(v, Math.abs(v) < 5 ? 1 : 0), formatoTooltip: (v) => pct(v, 2), etiquetaFinal: (_s, v) => pct(v, 2), margenDer: 72,
  };
  if (!G.fondos) G.fondos = lineas($("#fondos-grafico"), opts); else G.fondos.actualizar(opts);
  $("#fondos-leyenda").replaceChildren(...series.map((s) => h("span", { style: { "--c": s.color } }, h("i"), s.nombre)));

  // tabla completa
  $("#fondos-tabla tbody").replaceChildren(...[...lista].sort((a, b) => (valorRanking(b, p) ?? -1e9) - (valorRanking(a, p) ?? -1e9)).map((f) => {
    const m = medida(f, p), d1 = f.rend?.d1;
    return h("tr", { class: f.gestora === "Cocos" ? "es-cocos" : "" },
      h("td", {}, h("span", { class: "punto-serie", style: { "--c": colorFondo(f) } }), marca(f), h("strong", {}, nombreCorto(f))),
      h("td", { class: "tenue celda-tipo" }, f.tipo),
      h("td", {}, f.rescate),
      h("td", { class: "num" }, d1 ? pct(d1.tna, 2) : "—"),
      h("td", { class: "num " + (m ? clase(m.rend) : "") }, m ? pct(m.rend, 2, true) : "—", m ? h("small", { class: "tenue celda-fecha" }, `desde ${fechaDM(m.desde)}`) : null),
      h("td", { class: "num" }, m ? pct(m.tea, 2) : "—"),
      h("td", { class: "num" }, patrimonio(f.patrimonio, f.moneda)),
      h("td", { class: "num" }, f.vcp != null ? num(f.vcp, 3) : "—", h("small", { class: "tenue celda-fecha" }, fechaDM(fechaAR(f.fecha) || ""))),
      h("td", {}, f.gestora === "Cocos" ? h("a", { href: CONFIG.links.cocosFondo(f.id), target: "_blank", rel: "noopener", title: `Ver ${f.nombre} en Cocos` }, "En Cocos ↗") : ""));
  }));
  const fechas = lista.map((f) => fechaAR(f.fecha)).filter(Boolean).sort();
  $("#fondos-sello").innerHTML = fechas.length ? `<span>Cocos y CAFCI · cuotaparte al ${fechaDM(fechas[fechas.length - 1])}</span>` : "<span>Cargando…</span>";
}

// ── Calculadora ─────────────────────────────────────────────────────────────
function renderCalculadora() {
  const { moneda, monto, dias } = S.calc;
  $("#calc-signo").textContent = moneda === "ARS" ? "$" : "US$";
  $("#calc-dias-txt").textContent = dias === 1 ? "1 día" : dias >= 365 ? "1 año" : `${dias} días`;
  $("#calc-dias").style.setProperty("--p", `${((dias - 1) / 364) * 100}%`);
  const filas = [];
  for (const f of fondos().filter((x) => x.moneda === moneda)) {
    const r = f.rend?.d30 || f.rend?.d7;
    if (!r) continue;
    filas.push({
      nombre: f.nombre, det: `TEA 30 días ${pct(r.tea, 2)} · rescate ${f.rescate}`,
      final: monto * Math.pow(1 + r.tea / 100, dias / 365), color: colorFondo(f),
    });
  }
  if (moneda === "ARS") {
    const pf = (macro().plazo_fijo || []).find((x) => /NACI[OÓ]N/i.test(x.entidad));
    if (pf) {
      const ok = dias >= 30;
      filas.push({
        nombre: "Plazo fijo tradicional", det: ok ? `Banco Nación · TNA ${pct(pf.tna * 100, 2)}` : "Banco Nación · el plazo mínimo es de 30 días",
        final: ok ? monto * (1 + (pf.tna * dias) / 365) : monto, color: "#64718c",
      });
    }
  }
  filas.sort((a, b) => b.final - a.final);
  const maxG = Math.max(...filas.map((x) => x.final - monto), 0.0001);
  const signo = moneda === "ARS" ? "$" : "US$";
  const fmt = (v) => `${signo} ${num(v, moneda === "ARS" ? 0 : 2)}`;
  const cont = $("#calc-resultados");
  if (!filas.length) { cont.replaceChildren(h("p", { class: "tenue" }, "Cargando rendimientos…")); return; }
  cont.replaceChildren(...filas.map((x, i) => h("div", { class: "resultado" + (i === 0 ? " resultado--top" : ""), style: { "--c": x.color } },
    h("div", { class: "resultado__nombre" }, x.nombre, h("small", {}, x.det)),
    h("div", { class: "resultado__monto" }, fmt(x.final), h("small", { class: x.final > monto ? "sube" : "igual" }, `${x.final > monto ? "+" : ""}${fmt(x.final - monto)}`)),
    h("div", { class: "resultado__barra" }, h("i", { style: { width: `${Math.max(1, ((x.final - monto) / maxG) * 100)}%` } })))));
}
function iniciarCalculadora() {
  const input = $("#calc-monto"), rango = $("#calc-dias");
  input.addEventListener("input", () => {
    const n = +String(input.value).replace(/\D/g, "").slice(0, 13);
    S.calc.monto = n;
    const desdeElFinal = input.value.length - (input.selectionStart ?? input.value.length);
    input.value = n ? n.toLocaleString("es-AR") : "";
    const pos = Math.max(0, input.value.length - desdeElFinal);
    input.setSelectionRange(pos, pos);
    renderCalculadora();
  });
  rango.addEventListener("input", () => { S.calc.dias = +rango.value; renderCalculadora(); });
  segmentado($("#calc-moneda"), ({ m }) => {
    S.calc.moneda = m;
    S.calc.monto = m === "ARS" ? 1_000_000 : 1_000;
    input.value = S.calc.monto.toLocaleString("es-AR");
    renderCalculadora();
  });
}

// ── Mercado ─────────────────────────────────────────────────────────────────
const snapMercadoMemo = new WeakMap();
function listaMercado(panel) {
  const vivo = S.mercado[panel];
  if (vivo?.length) return vivo;
  const crudo = S.snap?.mercado?.[panel];
  if (!crudo) return [];
  if (!snapMercadoMemo.has(crudo)) snapMercadoMemo.set(crudo, crudo.map((x) => ({ symbol: x.s, c: x.c, pct_change: x.p, v: x.v, q_op: x.q })));
  return snapMercadoMemo.get(crudo);
}
// Solo especies en pesos: fuera las de dólar MEP (terminan en D) y cable (C), incluidas las de sufijo con punto (BMA.D).
// Una especie en dólares vale entre 400 y 6.000 veces menos que su par en pesos, que empieza igual (AAL / AALD, TGSU2 / TGSUD).
const enPesosMemo = new WeakMap();
function enPesos(crudo) {
  if (enPesosMemo.has(crudo)) return enPesosMemo.get(crudo);
  const conPrecio = crudo.filter((x) => x.c > 0 && x.symbol);
  const res = conPrecio.filter((x) => {
    if (/\.[A-Z]$/.test(x.symbol)) return false;
    if (!/[CD]$/.test(x.symbol)) return true;
    const pref = x.symbol.slice(0, 3);
    return !conPrecio.some((y) => y !== x && y.symbol.startsWith(pref) && y.c / x.c > 400 && y.c / x.c < 6000);
  });
  enPesosMemo.set(crudo, res);
  return res;
}
function moversDe(panel) {
  const lista = enPesos(listaMercado(panel))
    .map((x) => ({ s: x.symbol, c: x.c, p: x.pct_change, v: x.v || 0, q: x.q_op || 0 }))
    .filter((x) => x.p != null && isFinite(x.p));
  // para subas y bajas se exige un mínimo de operaciones: evita papeles sin liquidez con saltos falsos
  const liquidos = lista.filter((x) => x.q >= (panel === "cedears" ? 15 : 5));
  return {
    suben: liquidos.filter((x) => x.p > 0).sort((a, b) => b.p - a.p).slice(0, 8),
    bajan: liquidos.filter((x) => x.p < 0).sort((a, b) => a.p - b.p).slice(0, 8),
    // volumen nominal por precio = monto operado en pesos
    operados: lista.filter((x) => x.v > 0).sort((a, b) => b.v * b.c - a.v * a.c).slice(0, 8),
  };
}
function renderMercado() {
  const panel = S.panelMercado;
  const m = moversDe(panel);
  const nombre = (x) => NOMBRES[x.s] || (panel === "cedears" ? "CEDEAR" : "Acción");
  const monto = (x) => { const v = x.v * x.c; return v >= 1e9 ? `$ ${num(v / 1e9, 1)} mil M` : `$ ${num(v / 1e6, 0)} M`; };
  const fila = (x, conMonto) => h("li", {},
    h("div", {}, h("div", { class: "mover__tk" }, x.s), h("div", { class: "mover__nombre" }, conMonto ? `${nombre(x)} · ${monto(x)}` : nombre(x))),
    h("div", {}, h("div", { class: "mover__precio" }, precio(x.c)), h("div", { class: "mover__pct" }, h("span", { class: `pastilla ${clase(x.p)}` }, varTxt(x.p)))));
  const vacio = (t) => [h("li", {}, h("span", { class: "vacio" }, t))];
  const cargando = !S.snap && !S.mercado.ts;
  $("#m-suben").replaceChildren(...(m.suben.length ? m.suben.map((x) => fila(x)) : vacio(cargando ? "Cargando…" : "Sin papeles en alza")));
  $("#m-bajan").replaceChildren(...(m.bajan.length ? m.bajan.map((x) => fila(x)) : vacio(cargando ? "Cargando…" : "Sin papeles en baja")));
  $("#m-operados").replaceChildren(...(m.operados.length ? m.operados.map((x) => fila(x, true)) : vacio(cargando ? "Cargando…" : "Todavía no hay operaciones")));
  const est = estadoMercado(feriados());
  let txt;
  if (S.mercado.vivo && est.abierto) txt = `<span class="punto-vivo"></span> <span>En vivo · actualizado ${hace(S.mercado.ts)}</span>`;
  else if (est.abierto) txt = "<span>Rueda en curso · último dato publicado</span>";
  else if (est.habil && ahoraAR().h < 11) txt = "<span>Abre a las 11:00 · datos de la rueda anterior</span>";
  else txt = "<span>Mercado cerrado · datos de la última rueda</span>";
  $("#mercado-sello").innerHTML = txt;
}

// ── Indicadores ─────────────────────────────────────────────────────────────
function riesgoActual() {
  if (S.riesgo?.valor) return { valor: S.riesgo.valor, fecha: S.riesgo.fecha?.slice(0, 10) };
  const s = macro().riesgo_pais;
  if (!s?.length) return null;
  const u = s[s.length - 1];
  return { valor: u[1], fecha: u[0] };
}
const titulo = (t) => t.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
function nombreBanco(e) {
  let n = e.replace(/\s+S\.?A\.?U?\.?$/i, "").replace(/^BANCO\s+(DE\s+LA\s+|DEL\s+|DE\s+)?/i, "").replace(/\s+ARGENTINA$/i, "").trim();
  n = titulo(n);
  return n.length > 26 ? n.slice(0, n.lastIndexOf(" ", 25)) + "…" : n;
}
function renderIndicadores() {
  const M = macro(), B = M.bcra || {};
  const tarjetas = [];
  const rp = riesgoActual();
  if (rp) {
    const s = M.riesgo_pais || [];
    const prev = [...s].reverse().find((p) => p[0] < rp.fecha);
    const dif = prev ? rp.valor - prev[1] : null;
    const desde = restarDias(hoy(), 365);
    const serie = s.filter((p) => p[0] >= desde && p[0] < rp.fecha).map((p) => p[1]).concat([rp.valor]);
    tarjetas.push({
      n: "Riesgo país", v: num(rp.valor, 0), u: "pb",
      d: (dif != null ? `<span class="${clase(-dif)}">${dif > 0 ? "▲ +" : dif < 0 ? "▼ " : ""}${num(dif, 0)} pb</span> vs. día anterior · ` : "") + fechaDM(rp.fecha),
      spark: serie, color: "#ff9fb2",
    });
  }
  const im = M.inflacion_mensual || [];
  if (im.length) {
    const u = im[im.length - 1], ia = (M.inflacion_interanual || []).slice(-1)[0];
    tarjetas.push({ n: `Inflación de ${mesCorto(u[0])}`, v: num(u[1], 1), u: "%", d: ia ? `Interanual ${pct(ia[1], 1)} · INDEC` : "INDEC", bars: im.slice(-12), color: "#f3bd62" });
  }
  if (B.rem_12m?.valor != null) tarjetas.push({ n: "Inflación esperada 12 meses", v: num(B.rem_12m.valor, 1), u: "%", d: `Relevamiento de Expectativas (REM) · ${fechaDM(B.rem_12m.fecha)}` });
  const res = M.reservas || [];
  if (res.length) {
    const u = res[res.length - 1];
    const base = [...res].reverse().find((p) => p[0] <= restarDias(u[0], 30));
    const dif = base ? u[1] - base[1] : null;
    tarjetas.push({
      n: "Reservas del BCRA", v: num(u[1], 0), u: "M USD",
      d: (dif != null ? `<span class="${clase(dif)}">${dif > 0 ? "+" : ""}${num(dif, 0)} M</span> en 30 días · ` : "") + fechaDM(u[0]),
      spark: res.map((p) => p[1]), color: "#6bbaf3",
    });
  }
  if (B.badlar?.valor != null) tarjetas.push({ n: "Tasa BADLAR", v: num(B.badlar.valor, 2), u: "% TNA", d: `Bancos privados, más de $1.000 M · ${fechaDM(B.badlar.fecha)}` });
  if (B.tamar?.valor != null) tarjetas.push({ n: "Tasa TAMAR", v: num(B.tamar.valor, 2), u: "% TNA", d: `Bancos privados · ${fechaDM(B.tamar.fecha)}` });
  const pf = M.plazo_fijo || [];
  if (pf.length) {
    const mejor = pf[0], nacion = pf.find((x) => /NACI[OÓ]N/i.test(x.entidad));
    tarjetas.push({ n: "Plazo fijo a 30 días", v: num((nacion || mejor).tna * 100, 2), u: "% TNA", d: `${nacion ? "Banco Nación" : nombreBanco(mejor.entidad)} · la más alta: ${pct(mejor.tna * 100, 2)} (${nombreBanco(mejor.entidad)})` });
  }
  if (B.uva?.valor != null) tarjetas.push({ n: "Valor UVA", v: num(B.uva.valor, 2), u: "", d: `Unidad de valor adquisitivo · ${fechaDM(B.uva.fecha)}` });

  $("#indicadores").replaceChildren(...tarjetas.map((t) => {
    const g = h("div", { class: "indicador__graf" });
    const card = h("article", { class: "indicador panel" },
      h("div", { class: "indicador__nombre" }, t.n),
      h("div", { class: "indicador__valor" }, t.v, t.u ? h("small", {}, t.u) : null),
      h("div", { class: "indicador__det", html: t.d || "" }),
      t.spark || t.bars ? g : null);
    if (t.spark) sparkline(g, t.spark, { color: t.color, alto: 46 });
    if (t.bars) barras(g, t.bars, { color: t.color });
    return card;
  }));
  prepararTarjetas($$(".indicador"));
}

// ── Estado del mercado y pie ────────────────────────────────────────────────
function renderEstado() {
  const est = estadoMercado(feriados());
  const el = $("#estado-mercado");
  el.className = "estado" + (est.abierto ? " abierto" : "");
  el.lastElementChild.textContent = est.texto;
}
function renderPie() {
  $("#anio").textContent = new Date().getFullYear();
  if (CONFIG.matriculaCNV) $("#legal-ap").textContent = `Renta Global SRL – Asesoramientos financieros. Agente Productor registrado ante la Comisión Nacional de Valores bajo la matrícula N° ${CONFIG.matriculaCNV}.`;
  const partes = [];
  if (S.dolaresTs) partes.push(`dólares ${horaAR(S.dolaresTs)} hs`);
  if (S.snap?.generado) partes.push(`fondos e indicadores ${cuando(S.snap.generado).toLowerCase()}`);
  $("#pie-actualizado").textContent = partes.length ? "Última actualización: " + partes.join(" · ") : "";
}

// ── Pedidos en vivo ─────────────────────────────────────────────────────────
async function cargarSnapshot() {
  try { S.snap = await pedir(`${CONFIG.fuentes.snapshot}?t=${Math.floor(Date.now() / 60000)}`); }
  catch (e) { console.warn("snapshot", e); }
}
async function cargarDolares() {
  try {
    const js = await pedir(CONFIG.fuentes.dolarapi);
    if (Array.isArray(js) && js.length) { S.dolares = js; S.dolaresTs = Date.now(); }
  } catch (e) { console.warn("dolarapi", e); }
}
async function cargarMercado() {
  const [ce, ac] = await Promise.allSettled([pedir(CONFIG.fuentes.data912("arg_cedears")), pedir(CONFIG.fuentes.data912("arg_stocks"))]);
  const ok = (r, min) => r.status === "fulfilled" && Array.isArray(r.value) && r.value.filter((x) => (x.q_op || 0) > 0).length >= min;
  // fuera de la rueda data912 devuelve pocas operaciones: ahí se muestra la última rueda guardada
  const okC = ok(ce, 60), okA = ok(ac, 15);
  if (okC) S.mercado.cedears = ce.value;
  if (okA) S.mercado.acciones = ac.value;
  S.mercado.vivo = okC || okA;
  if (S.mercado.vivo) S.mercado.ts = Date.now();
}
async function cargarBandas() {
  try {
    const [m, p, t] = await Promise.all([5, 1187, 1188].map((id) => pedir(CONFIG.fuentes.bcraSerie(id, "2025-04-11", hoy()), { timeout: 20000 })));
    const mapa = (js) => new Map((js.results?.[0]?.detalle || []).map((d) => [d.fecha.slice(0, 10), d.valor]));
    const M = mapa(m), P = mapa(p), T = mapa(t);
    const fechas = [...new Set([...M.keys(), ...P.keys(), ...T.keys()])].sort();
    if (fechas.length > 20) { S.bandas = fechas.map((f) => [f, M.get(f) ?? null, P.get(f) ?? null, T.get(f) ?? null]); S.bandasTs = Date.now(); }
  } catch (e) { console.warn("bcra", e); }
}
async function cargarRiesgo() {
  try { const r = await pedir(CONFIG.fuentes.riesgoUltimo); if (r?.valor) S.riesgo = r; }
  catch (e) { console.warn("riesgo", e); }
}

// Repite una tarea; se pausa con la pestaña oculta y se pone al día al volver
function cada(ms, fn) {
  let t;
  const espera = () => (typeof ms === "function" ? ms() : ms);
  const ciclo = async () => {
    clearTimeout(t);
    if (!document.hidden) { try { await fn(); } catch (e) { console.warn(e); } }
    t = setTimeout(ciclo, espera());
  };
  t = setTimeout(ciclo, espera());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) ciclo(); });
}

const renderDolaresTodo = () => { renderHero(); renderDolares(); graficoDolar(); renderCinta(); renderPie(); };
function renderTodo() {
  renderHero(); renderDolares(); graficoDolar(); renderBandas(); renderFondos(); renderCalculadora(); renderMercado(); renderIndicadores(); renderCinta(); renderEstado(); renderPie();
}

// ── Inicio ──────────────────────────────────────────────────────────────────
function iniciar() {
  construirDolares();
  iniciarEfectos();
  iniciarCalculadora();
  S.periodoDolar = +segmentado($("#dolar-periodo"), ({ p }) => { S.periodoDolar = +p; graficoDolar(); }).p;
  S.fondosMoneda = segmentado($("#fondos-moneda"), ({ m }) => { S.fondosMoneda = m; renderFondos(); }).m;
  S.fondosPeriodo = segmentado($("#fondos-periodo"), ({ p }) => { S.fondosPeriodo = p; renderFondos(); }).p;
  S.panelMercado = segmentado($("#mercado-panel"), ({ t }) => { S.panelMercado = t; renderMercado(); }).t;
  const fondo = fondoHero($("#hero-fondo"));
  renderTodo();

  // todo en paralelo: cada fuente se dibuja apenas llega
  cargarSnapshot().then(() => { renderTodo(); fondo.actualizar(serieVenta("bolsa", 365).map((p) => p[1])); });
  cargarDolares().then(renderDolaresTodo);
  cargarBandas().then(() => { renderBandas(); renderHero(); renderCinta(); });
  cargarRiesgo().then(() => { renderHero(); renderIndicadores(); renderCinta(); });
  cargarMercado().then(() => { renderMercado(); renderCinta(); });

  cada(CONFIG.refresco.dolares, async () => { await cargarDolares(); renderDolaresTodo(); });
  cada(() => (estadoMercado(feriados()).abierto ? CONFIG.refresco.mercadoAbierto : CONFIG.refresco.mercadoCerrado), async () => { await cargarMercado(); renderMercado(); renderCinta(); });
  cada(CONFIG.refresco.bcra, async () => { await cargarBandas(); renderBandas(); renderHero(); });
  cada(CONFIG.refresco.riesgo, async () => { await cargarRiesgo(); renderHero(); renderIndicadores(); });
  cada(CONFIG.refresco.snapshot, async () => { await cargarSnapshot(); renderTodo(); });
  // relojes relativos ("hace 20 s") y estado del mercado
  setInterval(() => { renderEstado(); selloDolares(); if (S.mercado.vivo) renderMercado(); }, 10000);
}

iniciar();
