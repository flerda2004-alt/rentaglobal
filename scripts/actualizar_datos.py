"""Arma data/snapshot.json con todo lo que la web no puede pedir directo desde el navegador
(o que conviene precalcular): fondos de Cocos (API de cocos.capital), fondos de la CAFCI
(vía ArgentinaDatos), historia de los dólares, bandas cambiarias y variables del BCRA,
riesgo país, inflación, tasas de plazo fijo, feriados y la última foto del mercado (data912).

Cada fuente es independiente: si una falla, se conserva lo último bueno del snapshot anterior.
La web además pide en vivo, desde el navegador, todo lo que tiene CORS (dólares, mercado,
BCRA, riesgo país); este archivo es la base y el respaldo.
"""
from __future__ import annotations

import datetime as dt
import json
import sys
import time
import traceback
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent
DATA = RAIZ / "data"
SNAP = DATA / "snapshot.json"
CACHE = DATA / "cache_fci.json"
AR = dt.timezone(dt.timedelta(hours=-3))
HOY = dt.datetime.now(AR).date()

SES = requests.Session()
SES.headers.update({
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 RentaGlobalDatos/1.0",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "es-AR,es;q=0.9",
})

AD = "https://api.argentinadatos.com/v1"
BCRA = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias"
COCOS = "https://cocos.capital/api/funds"

# ── Fondos ──────────────────────────────────────────────────────────────────────
# cafci = (categoría en ArgentinaDatos, nombre exacto en la CAFCI) — respaldo para los de Cocos
FONDOS = [
    {"id": "cocos-ahorro", "nombre": "Cocos Ahorro", "gestora": "Cocos", "moneda": "ARS",
     "tipo": "Money market", "rescate": "T+0", "riesgo": "Bajo", "slug": "cocos-ahorro", "tickers": ["COCOA", "COCOB", "COCOALEY"],
     "cafci": ("mercadoDinero", "Cocos Ahorro - Clase A")},
    {"id": "cocos-rendimiento", "nombre": "Cocos Rendimiento", "gestora": "Cocos", "moneda": "ARS",
     "tipo": "Renta mixta", "rescate": "T+0", "riesgo": "Bajo", "slug": "cocos-rendimiento", "tickers": ["COCORMA", "COCORMB"],
     "cafci": ("rentaMixta", "Cocos Rendimiento - Clase A")},
    {"id": "cocos-pesos-plus", "nombre": "Cocos Pesos Plus", "gestora": "Cocos", "moneda": "ARS",
     "tipo": "Renta fija · retorno total", "rescate": "T+1", "riesgo": "Medio", "slug": "cocos-pesos-plus", "tickers": ["COCOSPPA", "COCOSPPB", "COCOSPPC"],
     "cafci": None},
    {"id": "pionero-pesos-plus", "nombre": "Pionero Pesos Plus", "gestora": "Macro", "moneda": "ARS",
     "tipo": "Money market", "rescate": "T+0", "riesgo": "Bajo", "slug": None,
     "cafci": ("mercadoDinero", "Pionero Pesos Plus - Clase A")},
    {"id": "super-ahorro-plus", "nombre": "Super Ahorro Plus", "gestora": "Santander", "moneda": "ARS",
     "tipo": "Money market", "rescate": "T+0", "riesgo": "Bajo", "slug": None,
     "cafci": ("mercadoDinero", "Super Ahorro Plus - Clase A")},
    {"id": "cocos-ahorro-dolares", "nombre": "Cocos Ahorro Dólares", "gestora": "Cocos", "moneda": "USD",
     "tipo": "Renta fija USD", "rescate": "T+0", "riesgo": "Bajo", "slug": "cocos-ahorro-dolares", "tickers": ["COCOAUSD", "COCOBUSD", "COCOULEY"],
     "cafci": ("rentaFija", "Cocos Ahorro Dólares - Clase A")},
    {"id": "cocos-dolares-plus", "nombre": "Cocos Dólares Plus", "gestora": "Cocos", "moneda": "USD",
     "tipo": "Renta fija USD", "rescate": "T+1", "riesgo": "Medio", "slug": "cocos-dolares-plus", "tickers": ["COCOUSDPA", "COCOUSDPB", "COCOUSDPD"],
     "cafci": ("rentaFija", "Cocos Dólares Plus - Clase A")},
    {"id": "pionero-mm-dolar", "nombre": "Pionero Money Market Dólar", "gestora": "Macro", "moneda": "USD",
     "tipo": "Money market USD", "rescate": "T+0", "riesgo": "Bajo", "slug": None,
     "cafci": ("mercadoDinero", "Pionero Money Market Dólar - Clase A")},
    {"id": "superfondo-ahorro-usd", "nombre": "Superfondo Ahorro en Dólares", "gestora": "Santander", "moneda": "USD",
     "tipo": "Money market USD", "rescate": "T+0", "riesgo": "Bajo", "slug": None,
     "cafci": ("mercadoDinero", "Superfondo Ahorro en Dólares - Clase A")},
]

CASAS = ["oficial", "blue", "bolsa", "contadoconliqui", "mayorista", "cripto", "tarjeta"]


def log(*a):
    print(*a, flush=True)


def get(url: str, timeout: int = 30, intentos: int = 3, params=None):
    ultimo = None
    for i in range(intentos):
        try:
            r = SES.get(url, timeout=timeout, params=params)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except Exception as e:  # noqa: BLE001
            ultimo = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"{url}: {ultimo}")


def fecha(s: str) -> dt.date:
    return dt.date.fromisoformat(s[:10])


# ── Cálculo de rendimientos sobre la serie de cuotapartes ──────────────────────
def rendimientos(serie: list[list]) -> dict:
    """serie = [[YYYY-MM-DD, vcp], ...] ordenada. Devuelve rendimientos por período,
    TNA (rendimiento simple anualizado) y TEA (compuesto), todo en %."""
    if len(serie) < 2:
        return {}
    f_ult, v_ult = fecha(serie[-1][0]), serie[-1][1]

    def base_en(limite: dt.date):
        cand = [p for p in serie if fecha(p[0]) <= limite]
        return cand[-1] if cand else None

    def medida(p0):
        if not p0 or p0[1] <= 0:
            return None
        dias = (f_ult - fecha(p0[0])).days
        if dias <= 0:
            return None
        r = v_ult / p0[1] - 1
        return {"desde": p0[0], "dias": dias, "rend": r * 100, "tna": r * 365 / dias * 100,
                "tea": ((1 + r) ** (365 / dias) - 1) * 100}

    out = {"d1": medida(serie[-2])}
    for k, dias in (("d7", 7), ("d30", 30), ("d90", 90), ("d180", 180), ("d365", 365)):
        p0 = base_en(f_ult - dt.timedelta(days=dias))
        # exige que la base esté cerca del objetivo (si no hay historia suficiente, no se informa)
        if p0 and (f_ult - fecha(p0[0])).days <= dias + 6:
            out[k] = medida(p0)
    p0 = base_en(dt.date(f_ult.year - 1, 12, 31))
    if p0 and fecha(p0[0]).year == f_ult.year - 1 and (dt.date(f_ult.year - 1, 12, 31) - fecha(p0[0])).days <= 7:
        out["ytd"] = medida(p0)
    # rendimiento por mes calendario (últimos 13 meses)
    fin_mes = {}
    for f, v in serie:
        fin_mes[f[:7]] = (f, v)
    meses = sorted(fin_mes)
    mensual = []
    for a, b in zip(meses, meses[1:]):
        mensual.append([b, (fin_mes[b][1] / fin_mes[a][1] - 1) * 100])
    out["mensual"] = mensual[-13:]
    return {k: v for k, v in out.items() if v}


# ── Fuentes ─────────────────────────────────────────────────────────────────────
def cocos_patrimonios() -> dict:
    """Patrimonio de cada clase de los fondos de Cocos, por ticker (para sumar el total del fondo)."""
    js = get(f"{COCOS}/live-list")
    return {x["ticker"]: float(x["nav"]) for x in (js or {}).get("liveFunds", []) if x.get("ticker") and x.get("nav")}


def cocos_fondo(f: dict, navs: dict) -> dict | None:
    live = get(f"{COCOS}/live", params={"slug": f["slug"]})
    hist = get(f"{COCOS}/history", params={"slug": f["slug"]})
    if not live or not hist or not hist.get("priceHistory"):
        return None
    serie = [[p["date"][:10], float(p["value"])] for p in hist["priceHistory"] if p.get("value")]
    serie.sort()
    comp = [[c["name"], c["share"]] for c in (live.get("assetsComposition") or [])]
    return {
        "fuente": "Cocos",
        "fecha": live.get("fechaActualizacion") or serie[-1][0],
        "vcp": live.get("cuotaparte") or serie[-1][1],
        # patrimonio total (todas las clases); si no está el listado, el de la clase A
        "patrimonio": sum(navs[t] for t in f.get("tickers", []) if t in navs) or live.get("patrimonio"),
        "tna_cocos": live.get("tna"),
        "rend_cocos": live.get("rendimientos"),
        "estimado": {"etiqueta": live.get("yieldLabel"), "tasa": live.get("yieldRate")} if live.get("yieldRate") else None,
        "composicion": comp,
        "serie": serie,
    }


def cafci_snapshot(categoria: str, cuando: str) -> list | None:
    """cuando = 'ultimo' | 'penultimo' | 'YYYY/MM/DD'"""
    return get(f"{AD}/finanzas/fci/{categoria}/{cuando}", timeout=40)


def actualizar_cache_cafci(cache: dict) -> dict:
    """cache = {"series": {nombre: {fecha: vcp}}, "pedidos": {categoria: [fechas consultadas]}}"""
    series = cache.setdefault("series", {})
    pedidos = cache.setdefault("pedidos", {})
    nombres_por_cat: dict[str, set] = {}
    for f in FONDOS:
        if f["cafci"]:
            nombres_por_cat.setdefault(f["cafci"][0], set()).add(f["cafci"][1])

    patrimonios = cache.setdefault("patrimonio", {})
    bases = {n.split(" - Clase")[0] for ns in nombres_por_cat.values() for n in ns}

    def absorber(lista, cat, con_patrimonio=False):
        n = 0
        for x in lista or []:
            if x.get("fondo") in nombres_por_cat[cat] and x.get("vcp"):
                series.setdefault(x["fondo"], {})[x["fecha"][:10]] = float(x["vcp"])
                n += 1
            base = (x.get("fondo") or "").split(" - Clase")[0]
            if con_patrimonio and base in bases and x.get("patrimonio") is not None:
                patrimonios.setdefault(base, {}).setdefault(x["fecha"][:10], {})[x["fondo"]] = float(x["patrimonio"])
        return n

    for cat in nombres_por_cat:
        for cuando in ("ultimo", "penultimo"):
            try:
                absorber(cafci_snapshot(cat, cuando), cat, con_patrimonio=True)
            except Exception as e:  # noqa: BLE001
                log("CAFCI", cat, cuando, "falló:", e)

    # Historia: solo money market (es la categoría liviana y la de los fondos que se comparan).
    # Diario los últimos 100 días y semanal hasta 400 días; cada fecha se pide una sola vez.
    cat = "mercadoDinero"
    hechos = set(pedidos.setdefault(cat, []))
    objetivos = []
    for d in range(1, 101):
        objetivos.append(HOY - dt.timedelta(days=d))
    for d in range(105, 401, 7):
        objetivos.append(HOY - dt.timedelta(days=d))
    objetivos.append(dt.date(HOY.year - 1, 12, 31))
    nuevos = 0
    for d in objetivos:
        if d.weekday() >= 5:
            continue
        clave = d.isoformat()
        if clave in hechos:
            continue
        try:
            lista = cafci_snapshot(cat, d.strftime("%Y/%m/%d"))
            absorber(lista, cat)
            # se marca como consultada solo si respondió (aunque venga vacía por feriado)
            hechos.add(clave)
            nuevos += 1
            time.sleep(0.25)
        except Exception as e:  # noqa: BLE001
            log("CAFCI histórico", clave, "falló:", e)
        if nuevos >= 150:  # tope por corrida para no castigar la API
            break
    # se olvidan las fechas viejas para que el archivo no crezca sin límite
    limite = (HOY - dt.timedelta(days=430)).isoformat()
    pedidos[cat] = sorted(x for x in hechos if x >= limite)
    for nombre in list(series):
        series[nombre] = {k: v for k, v in series[nombre].items() if k >= limite}
    for base in list(patrimonios):
        patrimonios[base] = dict(sorted(patrimonios[base].items())[-5:])
    log(f"CAFCI: {nuevos} fechas nuevas consultadas")
    return cache


def armar_fondos(cache: dict, previo: dict) -> list:
    salida = []
    prev_por_id = {f["id"]: f for f in (previo.get("fondos") or [])}
    try:
        navs = cocos_patrimonios()
    except Exception as e:  # noqa: BLE001
        log("Cocos live-list falló:", e)
        navs = {}
    for f in FONDOS:
        base = {k: f[k] for k in ("id", "nombre", "gestora", "moneda", "tipo", "rescate", "riesgo")}
        base["clase"] = "A"
        dato = None
        if f["slug"]:
            try:
                dato = cocos_fondo(f, navs)
            except Exception as e:  # noqa: BLE001
                log("Cocos", f["slug"], "falló:", e)
        if dato is None and f["cafci"]:
            pts = sorted((cache.get("series") or {}).get(f["cafci"][1], {}).items())
            if len(pts) >= 2:
                # patrimonio total: el último dato de cada clase del fondo, sumado
                pat = (cache.get("patrimonio") or {}).get(f["cafci"][1].split(" - Clase")[0], {})
                por_clase = {}
                for fch in sorted(pat):
                    por_clase.update(pat[fch])
                total = sum(por_clase.values()) or None
                dato = {"fuente": "CAFCI", "fecha": pts[-1][0], "vcp": pts[-1][1], "patrimonio": total, "serie": [[a, b] for a, b in pts]}
        if dato is None:
            if f["id"] in prev_por_id:
                log("Fondo", f["id"], "sin datos nuevos: se conserva el anterior")
                salida.append(prev_por_id[f["id"]])
            continue
        serie = dato.pop("serie")
        corte = (fecha(serie[-1][0]) - dt.timedelta(days=400)).isoformat()
        serie = [p for p in serie if p[0] >= corte]
        base.update(dato)
        base["rend"] = rendimientos(serie)
        base["serie"] = [[p[0], round(p[1], 6)] for p in serie]
        salida.append(base)
    return salida


def dolares(previo: dict) -> dict:
    out = {"actual": get("https://dolarapi.com/v1/dolares"), "historia": {}}
    corte = (HOY - dt.timedelta(days=400)).isoformat()
    for casa in CASAS:
        try:
            h = get(f"{AD}/cotizaciones/dolares/{casa}", timeout=40)
            out["historia"][casa] = [[x["fecha"][:10], x.get("compra"), x.get("venta")] for x in h if x["fecha"][:10] >= corte]
        except Exception as e:  # noqa: BLE001
            log("Historia", casa, "falló:", e)
            out["historia"][casa] = ((previo.get("dolares") or {}).get("historia") or {}).get(casa, [])
    return out


def bcra_serie(id_var: int, desde: dt.date) -> list:
    js = get(f"{BCRA}/{id_var}", params={"desde": desde.isoformat(), "hasta": HOY.isoformat(), "limit": 3000})
    det = js["results"][0]["detalle"] if js and js.get("results") else []
    return sorted([[d["fecha"][:10], d["valor"]] for d in det])


def bandas() -> dict:
    desde = dt.date(2025, 4, 11)
    may = dict(bcra_serie(5, desde))
    piso = dict(bcra_serie(1187, desde))
    techo = dict(bcra_serie(1188, desde))
    fechas = sorted(set(may) | set(piso) | set(techo))
    serie = [[f, may.get(f), piso.get(f), techo.get(f)] for f in fechas]
    return {"serie": serie}


def bcra_ultimos() -> dict:
    """Último valor de las variables que muestra la web (una sola consulta al listado)."""
    todos = []
    for off in (0, 1000):
        js = get(BCRA, params={"limit": 1000, "offset": off})
        todos += js.get("results", [])
        if len(js.get("results", [])) < 1000:
            break
    ids = {1: "reservas", 4: "minorista", 5: "mayorista", 7: "badlar", 12: "plazo_fijo_30d", 27: "inflacion_mensual",
           28: "inflacion_interanual", 29: "rem_12m", 31: "uva", 30: "cer", 44: "tamar", 1187: "banda_piso", 1188: "banda_techo"}
    out = {}
    for v in todos:
        if v["idVariable"] in ids:
            out[ids[v["idVariable"]]] = {"valor": v.get("ultValorInformado"), "fecha": v.get("ultFechaInformada"),
                                         "unidad": v.get("unidadExpresion"), "descripcion": v.get("descripcion")}
    return out


def macro(previo: dict) -> dict:
    prev = previo.get("macro") or {}
    out = {}
    try:
        rp = get(f"{AD}/finanzas/indices/riesgo-pais", timeout=40)
        corte = (HOY - dt.timedelta(days=740)).isoformat()
        out["riesgo_pais"] = [[x["fecha"][:10], x["valor"]] for x in rp if x["fecha"][:10] >= corte]
    except Exception as e:  # noqa: BLE001
        log("Riesgo país falló:", e)
        out["riesgo_pais"] = prev.get("riesgo_pais", [])
    try:
        inf = get(f"{AD}/finanzas/indices/inflacion")
        out["inflacion_mensual"] = [[x["fecha"][:10], x["valor"]] for x in inf][-37:]
        ia = get(f"{AD}/finanzas/indices/inflacionInteranual")
        out["inflacion_interanual"] = [[x["fecha"][:10], x["valor"]] for x in ia][-37:]
    except Exception as e:  # noqa: BLE001
        log("Inflación falló:", e)
        out["inflacion_mensual"] = prev.get("inflacion_mensual", [])
        out["inflacion_interanual"] = prev.get("inflacion_interanual", [])
    try:
        out["reservas"] = bcra_serie(1, HOY - dt.timedelta(days=400))
    except Exception as e:  # noqa: BLE001
        log("Reservas falló:", e)
        out["reservas"] = prev.get("reservas", [])
    try:
        out["bcra"] = bcra_ultimos()
    except Exception as e:  # noqa: BLE001
        log("BCRA últimos falló:", e)
        out["bcra"] = prev.get("bcra", {})
    try:
        pf = get(f"{AD}/finanzas/tasas/plazoFijo")
        out["plazo_fijo"] = sorted([{"entidad": x["entidad"], "tna": x.get("tnaClientes")} for x in pf if x.get("tnaClientes")],
                                   key=lambda x: -x["tna"])
    except Exception as e:  # noqa: BLE001
        log("Plazo fijo falló:", e)
        out["plazo_fijo"] = prev.get("plazo_fijo", [])
    return out


def feriados(previo: dict) -> list:
    out = []
    for anio in (HOY.year, HOY.year + 1):
        try:
            out += [x["fecha"][:10] for x in get(f"{AD}/feriados/{anio}") or []]
        except Exception as e:  # noqa: BLE001
            log("Feriados", anio, "falló:", e)
    return sorted(set(out)) or previo.get("feriados", [])


def mercado(previo: dict) -> dict:
    """Foto del mercado. Solo se reemplaza si parece una rueda real (muchos papeles con operaciones)."""
    prev = previo.get("mercado") or {}
    out = dict(prev)
    for clave, path in (("cedears", "arg_cedears"), ("acciones", "arg_stocks")):
        try:
            lista = get(f"https://data912.com/live/{path}")
            operados = [x for x in lista or [] if (x.get("q_op") or 0) > 0 and x.get("c")]
            if len(operados) >= (60 if clave == "cedears" else 15):
                out[clave] = [{"s": x["symbol"], "c": x["c"], "p": x.get("pct_change"), "v": x.get("v"), "q": x.get("q_op")} for x in lista if x.get("c")]
                out[f"{clave}_fecha"] = dt.datetime.now(AR).isoformat(timespec="minutes")
        except Exception as e:  # noqa: BLE001
            log("data912", path, "falló:", e)
    return out


def main():
    DATA.mkdir(exist_ok=True)
    previo = json.loads(SNAP.read_text(encoding="utf-8")) if SNAP.exists() else {}
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    snap = {"generado": dt.datetime.now(AR).isoformat(timespec="seconds"), "fuentes": {}}

    def paso(nombre, fn, *a):
        t0 = time.time()
        try:
            snap[nombre] = fn(*a)
            snap["fuentes"][nombre] = {"ok": True, "seg": round(time.time() - t0, 1)}
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            snap[nombre] = previo.get(nombre)
            snap["fuentes"][nombre] = {"ok": False, "error": str(e)[:200]}

    paso("dolares", dolares, previo)
    paso("bandas", bandas)
    try:
        cache = actualizar_cache_cafci(cache)
        CACHE.write_text(json.dumps(cache, separators=(",", ":")), encoding="utf-8")
    except Exception as e:  # noqa: BLE001
        log("Cache CAFCI falló:", e)
    paso("fondos", armar_fondos, cache, previo)
    paso("macro", macro, previo)
    paso("feriados", feriados, previo)
    paso("mercado", mercado, previo)

    if not snap.get("dolares") and not snap.get("fondos"):
        log("Fallaron las fuentes principales: no se publica")
        sys.exit(1)
    SNAP.write_text(json.dumps(snap, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    log("Listo:", {k: v["ok"] for k, v in snap["fuentes"].items()}, f"{SNAP.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
