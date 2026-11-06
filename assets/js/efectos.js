// Movimiento y vidrio: destellos que siguen al puntero, tarjetas con inclinación,
// fondo animado del hero, aparición al hacer scroll y barra de navegación compacta.
const reducir = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const tactil = () => matchMedia("(hover: none)").matches;

export function iniciarEfectos() {
  document.documentElement.classList.add("js");

  // Refracción real en Chromium (backdrop-filter con filtro SVG). Safari y Firefox usan desenfoque.
  const brands = navigator.userAgentData?.brands?.map((b) => b.brand).join(" ") || "";
  if (/Chromium|Google Chrome|Microsoft Edge/.test(brands) && !reducir()) document.documentElement.classList.add("refracta");

  // Destello del vidrio líquido y foco de luz en paneles
  document.addEventListener("pointermove", (e) => {
    const b = e.target.closest?.(".liquido, .foco");
    if (!b) return;
    const r = b.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
    if (b.classList.contains("liquido")) { b.style.setProperty("--mx", x + "%"); b.style.setProperty("--my", y + "%"); }
    else { b.style.setProperty("--fx", x + "%"); b.style.setProperty("--fy", y + "%"); }
  }, { passive: true });

  // Botones magnéticos (solo con mouse)
  if (!tactil() && !reducir()) {
    for (const b of document.querySelectorAll(".liquido--grande")) {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.translate = `${dx * 8}px ${dy * 6}px`;
      });
      b.addEventListener("pointerleave", () => { b.style.translate = ""; });
    }
  }

  // Inclinación 3D de la tarjeta principal y profundidad de las flotantes
  const visual = document.getElementById("hero-visual");
  if (visual && !tactil() && !reducir()) {
    const tarjeta = visual.querySelector("[data-tilt]");
    const flot = [...visual.querySelectorAll("[data-profundidad]")];
    visual.addEventListener("pointermove", (e) => {
      const r = visual.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      tarjeta.style.transform = `rotateY(${dx * 10}deg) rotateX(${-dy * 9}deg)`;
      for (const f of flot) { const p = +f.dataset.profundidad; f.style.transform = `translate(${dx * p}px, ${dy * p}px)`; }
    });
    visual.addEventListener("pointerleave", () => { tarjeta.style.transform = ""; for (const f of flot) f.style.transform = ""; });
  }

  // Navegación compacta + sección activa
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("nav--compacta", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const links = [...document.querySelectorAll(".nav__links a")];
  // se observan todas las secciones: en las que no tienen link (hero, Cocos, servicios) no queda ninguno marcado
  const secciones = [...document.querySelectorAll("main > section")];
  const ioNav = new IntersectionObserver((ents) => {
    for (const e of ents) if (e.isIntersecting) for (const a of links) a.classList.toggle("activo", a.getAttribute("href") === "#" + e.target.id);
  }, { rootMargin: "-45% 0px -50% 0px" });
  secciones.forEach((s) => ioNav.observe(s));

  // Menú móvil
  const boton = document.getElementById("menu-boton"), menu = document.getElementById("menu-movil");
  boton.addEventListener("click", () => {
    const abrir = boton.getAttribute("aria-expanded") !== "true";
    boton.setAttribute("aria-expanded", abrir); menu.hidden = !abrir;
  });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) { boton.setAttribute("aria-expanded", "false"); menu.hidden = true; } });

  // Aparición al hacer scroll (lo que ya está en pantalla se muestra enseguida)
  const aparecer = [...document.querySelectorAll(".seccion__cab, .panel, .dolar, .servicio, .indicador")];
  const io = new IntersectionObserver((ents) => {
    for (const e of ents) if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px" });
  for (const n of aparecer) {
    const r = n.getBoundingClientRect();
    if (r.top > innerHeight) { n.setAttribute("data-aparece", ""); io.observe(n); }
  }
}

// Marca nuevos elementos para que aparezcan al entrar en pantalla y les agrega el foco de luz
export function prepararTarjetas(nodos) {
  for (const n of nodos) n.classList.add("foco");
}

// ── Fondo del hero: cintas de líneas que fluyen, una de ellas con la forma real del dólar MEP ──
export function fondoHero(canvas, serieReal = []) {
  const ctx = canvas.getContext("2d");
  let w = 0, hgt = 0, dpr = 1, visible = true, t0 = performance.now(), raf = 0;
  const datos = normalizar(serieReal);
  const cintas = [
    { y: 0.62, amp: 0.12, frec: 1.3, vel: 0.022, color: [107, 186, 243], lineas: 16, ancho: 0.16, datos },
    { y: 0.48, amp: 0.10, frec: 0.9, vel: 0.016, color: [44, 122, 147], lineas: 12, ancho: 0.12, datos: null },
    { y: 0.78, amp: 0.07, frec: 1.9, vel: 0.03, color: [31, 128, 216], lineas: 10, ancho: 0.08, datos: null },
  ];
  function normalizar(s) {
    const v = s.filter((x) => x != null && isFinite(x));
    if (v.length < 5) return null;
    const min = Math.min(...v), max = Math.max(...v), r = max - min || 1;
    const n = v.map((x) => (x - min) / r);
    // ida y vuelta: la serie se vuelve periódica y la cinta fluye sin saltos al dar la vuelta
    return n.concat(n.slice(1, -1).reverse());
  }
  function muestra(arr, u) {
    const p = u * (arr.length - 1), i = Math.floor(p), f = p - i;
    return arr[Math.min(i, arr.length - 1)] * (1 - f) + arr[Math.min(i + 1, arr.length - 1)] * f;
  }
  function tam() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; hgt = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = hgt * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function cuadro(ahora) {
    const t = (ahora - t0) / 1000;
    ctx.clearRect(0, 0, w, hgt);
    ctx.globalCompositeOperation = "lighter";
    for (const c of cintas) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      const [r, g, b] = c.color;
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},0.22)`);
      grad.addColorStop(0.75, `rgba(${r},${g},${b},0.3)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.strokeStyle = grad;
      for (let k = 0; k < c.lineas; k++) {
        const fase = k / c.lineas;
        ctx.beginPath();
        ctx.lineWidth = k === Math.floor(c.lineas / 2) ? 1.4 : 0.7;
        for (let i = 0; i <= 120; i++) {
          const u = i / 120;
          let y = c.y + Math.sin((u * c.frec + t * c.vel) * Math.PI * 2 + fase * 1.6) * c.amp * (0.6 + 0.4 * Math.sin(t * 0.2 + fase * 3));
          if (c.datos) {
            const desplazada = (u + t * c.vel * 0.6) % 1;
            y = c.y + 0.16 - muestra(c.datos, desplazada) * 0.3 + Math.sin(u * 9 + t * 0.6 + fase * 2) * 0.012;
          }
          y += (fase - 0.5) * c.ancho * (0.5 + 0.5 * Math.sin(u * Math.PI));
          const px = u * w, py = y * hgt;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
    if (!reducir() && visible && !document.hidden) raf = requestAnimationFrame(cuadro);
  }
  tam();
  addEventListener("resize", () => { tam(); if (reducir()) cuadro(performance.now()); }, { passive: true });
  new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
    cancelAnimationFrame(raf);
    if (visible) raf = requestAnimationFrame(cuadro);
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden && visible) raf = requestAnimationFrame(cuadro); });
  raf = requestAnimationFrame(cuadro);
  return { actualizar(serie) { const n = normalizar(serie); if (n) cintas[0].datos = n; } };
}
